/**
 * demo-director render engine.
 *
 * Renders a scripted film one frame at a time with Playwright and ffmpeg.
 * Time is virtual: the page's clock (Date, timers, rAF, performance) only moves
 * when a frame is rendered, and every CSS animation and transition in every
 * document is paused and seeked to that frame's time. So the same frame renders
 * the same way on every machine, at any render speed, with no dropped frames.
 *
 * Two modes:
 *
 *   mode: "film" (default)   A stage page implements window.__stage.set(patch)
 *                            and the script drives it: camera moves, the cursor
 *                            travels and clicks, text types, captions fade.
 *                            Use this for product walkthroughs.
 *
 *   mode: "timeline"         A self-contained stage implements window.seek(t)
 *                            and window.DURATION. The engine samples every
 *                            frame. Use this for pure motion-design pieces.
 *
 * The browser talks to Node through window.__filmRoute(channel, args), answered
 * by functions the script registers with F.route(channel, fn). That is how a
 * scripted backend feeds a real app's UI without running the real app.
 *
 * See references/rendering.md and references/camera.md for the stage contract.
 */
import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import { chromium } from "playwright"

/** Frame sizes. `master` is multiplied by `scale` when rendering. */
export const FORMATS = {
	wide: { w: 1920, h: 1080 }, // 16:9 — YouTube, README, desktop
	vertical: { w: 1080, h: 1920 }, // 9:16 — TikTok, Reels, Shorts
	phone: { w: 1080, h: 1350 }, // 4:5 — X, LinkedIn, Instagram feed
	square: { w: 1080, h: 1080 }, // 1:1 — some feeds, embeds
}

/** Runs in every document, the stage and its iframes included. */
const SEEK = `
window.__filmBirths = new WeakMap();
window.__seek = (now) => {
  for (const a of document.getAnimations()) {
    if (!window.__filmBirths.has(a)) { window.__filmBirths.set(a, now); try { a.pause() } catch {} }
    try { a.currentTime = now - window.__filmBirths.get(a) } catch {}
  }
};
`

/** CSS cubic-bezier, solved for x by Newton's method. */
function cubicBezier(x1, y1, x2, y2) {
	const bx = (t) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t ** 2 * (1 - t) + t ** 3
	const by = (t) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t ** 2 * (1 - t) + t ** 3
	const dx = (t) => 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t ** 2
	return (x) => {
		let t = x
		for (let i = 0; i < 8; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (bx(t) - x) / d; t = Math.min(1, Math.max(0, t)) }
		return by(t)
	}
}

/** The house easing curves. Use these unless the design system says otherwise. */
export const ease = {
	/** Camera moves: a soft start and a long, gentle landing. The owner's curve. */
	smooth: cubicBezier(0.45, 0, 0.2, 1),
	/** Arrivals and entrances: quick out of the gate, long settle. NN/g's default for entering. */
	out: cubicBezier(0.16, 1, 0.3, 1),
	/** Exits: accelerate away. */
	in: cubicBezier(0.7, 0, 0.84, 0),
	linear: (t) => t,
	inOut: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
	inOutCubic: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function contentType(file) {
	if (file.endsWith(".html")) return "text/html"
	if (/\.(m?js)$/.test(file)) return "text/javascript"
	if (file.endsWith(".css")) return "text/css"
	if (file.endsWith(".json")) return "application/json"
	if (file.endsWith(".svg")) return "image/svg+xml"
	if (file.endsWith(".png")) return "image/png"
	if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg"
	if (file.endsWith(".webp")) return "image/webp"
	if (file.endsWith(".woff2")) return "font/woff2"
	if (file.endsWith(".woff")) return "font/woff"
	return "application/octet-stream"
}

/**
 * @param {object} opts
 * @param {"film"|"timeline"} [opts.mode]      Which stage contract to use.
 * @param {string} [opts.format]              Keys of FORMATS.
 * @param {number} [opts.fps]                 Default 60.
 * @param {number} [opts.scale]               Device pixel ratio; 2 for a 2x master.
 * @param {string} [opts.out]                 mp4 path. Omit to render nothing but stills.
 * @param {string} [opts.stills]              Directory for stills.
 * @param {number} [opts.stillEvery]          Seconds between stills (default 0.5).
 * @param {string} [opts.root]                Directory served at http://film.local/.
 * @param {string} [opts.stage]               Stage path inside root (default "stage/index.html").
 * @param {number} [opts.until]               Stop the film at this many seconds.
 * @param {boolean} [opts.preview]            Render stills only, no ffmpeg.
 * @param {string} [opts.time]                Fixed wall-clock time for the page (ISO).
 * @param {object} [opts.camera]              Initial camera {cx, cy, w}.
 * @param {object} [opts.cursor]              Initial cursor {x, y, visible, kind}.
 * @param {object} [opts.stageState]          Extra state merged in on the first frame.
 * @param {{from:number,ms:number}} [opts.slow] Sleep after rendering frames past `from`, to watch a still area.
 */
export async function film({
	mode = "film",
	format = "phone",
	fps = 60,
	scale = 2,
	out,
	stills,
	stillEvery = 0.5,
	root = process.cwd(),
	stage = "stage/index.html",
	url,
	until = Infinity,
	preview = false,
	time = "2026-01-01T09:00:00Z",
	camera = { cx: 800, cy: 450, w: 1600 },
	cursor = { x: 1100, y: 600, kind: "arrow", visible: true, down: false },
	stageState = {},
	slow = null,
} = {}) {
	const F = FORMATS[format]
	if (!F) throw new Error(`unknown format "${format}" (use ${Object.keys(FORMATS).join(", ")})`)

	const browser = await chromium.launch()
	const context = await browser.newContext({
		viewport: { width: F.w, height: F.h },
		deviceScaleFactor: scale,
		colorScheme: "dark",
		reducedMotion: "no-preference",
	})
	await context.addInitScript(SEEK)

	// Serve the project from a fake origin so stages can reach into iframes.
	await context.route("http://film.local/**", async (route) => {
		const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, "")
		const file = path.resolve(root, rel)
		if (!file.startsWith(path.resolve(root)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
			return route.fulfill({ status: 404, body: "" })
		}
		route.fulfill({ status: 200, contentType: contentType(file), body: fs.readFileSync(file) })
	})

	const page = await context.newPage()
	const errors = []
	page.on("pageerror", (e) => errors.push(e.message))
	page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })

	await context.addInitScript((t) => {
		// Deterministic helpers every stage can rely on.
		window.__filmOverrides = window.__filmOverrides || []
		window.__filmTime = t
	}, time)

	// install() alone lets time flow; only pauseAt makes runFor the sole thing that moves it.
	await page.clock.install({ time: new Date(time) })
	await page.clock.pauseAt(new Date(new Date(time).getTime() + 1000))

	// Main-process answers the script provides: F.route(channel, fn).
	const routes = new Map()
	await page.exposeFunction("__filmRoute", async (channel, args) => {
		const fn = routes.get(channel)
		return fn ? fn(...args) : null
	})
	await page.addInitScript(() => { window.__filmRoutes = new Set() })

	await page.goto(url ?? `http://film.local/${stage}`)
	await page.waitForLoadState("domcontentloaded")
	// Wait for the stage's own readiness. The page clock is paused, so real
	// waits must be paired with advancing the clock, not with waitForFunction.
	{
		// A stage may set window.__ready to `true`, or to a promise that resolves
		// when its fonts and iframes are in. Await the value either way.
		const isReady = () => page.evaluate(async () => !!(await window.__ready)).catch(() => false)
		const startedAt = Date.now()
		while (Date.now() - startedAt < 20000) {
			if (await isReady()) break
			await page.clock.runFor(50)
			await sleep(30)
		}
		if (!(await isReady())) errors.push("stage never signalled window.__ready")
	}

	let frame = 0
	const msPerFrame = 1000 / fps
	const tweens = []

	if (mode === "film") {
		let cam = { ...camera }
		let domCam = { ...cam }
		let cur = { ...cursor }
		let caption = { text: "", opacity: 0 }
		let cardState = { kind: "none", opacity: 0, title: "", sub: "", mono: "" }
		let mouseAt = null
		let firstFrame = true

		// Put the stage into the engine's initial camera *before* the script measures
		// anything: worldBox() reads DOM rects, which must already be under this camera.
		await page.evaluate((s) => window.__stage.set(s), {
			...(stageState ?? {}),
			camera: cam,
			cursor: cur,
			caption,
			card: cardState,
		})

		const toViewport = (p, c = domCam) => {
			const s = F.w / c.w
			return { x: (p.x - c.cx) * s + F.w / 2, y: (p.y - c.cy) * s + F.h / 2 }
		}
		const toWorld = (p, c = domCam) => {
			const s = F.w / c.w
			return { x: (p.x - F.w / 2) / s + c.cx, y: (p.y - F.h / 2) / s + c.cy }
		}

		let ffmpeg = startFfmpeg(out, preview, fps)
		if (stills) fs.mkdirSync(stills, { recursive: true })

		const t = () => frame / fps

		/** Advances the page's virtual time, letting real-time work (network, React) settle without rendering. */
		async function settle(check, { maxMs = 30000, step = 50 } = {}) {
			const startedAt = Date.now()
			while (Date.now() - startedAt < maxMs) {
				if (await check()) return true
				await page.clock.runFor(step)
				await sleep(40)
			}
			throw new Error("settle timed out")
		}

		async function flush() {
			await page.evaluate(() => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0) }))
		}

		async function renderFrame() {
			const now = t()
			for (const tw of [...tweens]) {
				const k = Math.min(1, Math.max(0, (now - tw.start) / tw.dur))
				tw.apply(tw.ease ? tw.ease(k) : k, k)
				if (k >= 1) tweens.splice(tweens.indexOf(tw), 1)
			}
			const state = {
				...(firstFrame ? stageState : null),
				camera: cam,
				cursor: cur,
				caption,
				card: cardState,
			}
			await page.evaluate((s) => window.__stage.set(s), state)
			firstFrame = false
			domCam = { ...cam }
			const vp = toViewport(cur)
			if (!mouseAt || Math.abs(mouseAt.x - vp.x) > 0.01 || Math.abs(mouseAt.y - vp.y) > 0.01) {
				await page.mouse.move(vp.x, vp.y)
				mouseAt = vp
			}
			const target = Math.round((frame + 1) * msPerFrame) - Math.round(frame * msPerFrame)
			await page.clock.runFor(target)
			const nowMs = (frame + 1) * msPerFrame
			for (const fr of page.frames()) {
				try { await fr.evaluate((n) => window.__seek && window.__seek(n), nowMs) } catch {}
			}
			await flush()
			if (ffmpeg || (stills && onStill(now))) {
				const png = await page.screenshot({ type: "png" })
				if (ffmpeg) await new Promise((r) => (ffmpeg.stdin.write(png) ? r() : ffmpeg.stdin.once("drain", r)))
				if (stills && onStill(now)) fs.writeFileSync(path.join(stills, `t${now.toFixed(2).padStart(6, "0")}.png`), png)
			}
			if (slow && now >= slow.from) await sleep(slow.ms)
			frame++
			if (frame % 60 === 0) process.stdout.write(`\r${format} ${t().toFixed(1)}s`)
			if (t() > until) throw Object.assign(new Error("until"), { until: true })
		}
		const onStill = (now) => Math.abs(now / stillEvery - Math.round(now / stillEvery)) < 1e-6

		const api = {
			async route(channel, fn) {
				routes.set(channel, fn)
				await page.evaluate((c) => window.__filmRoutes.add(c), channel)
			},
			page,
			mode,
			format,
			F,
			t,
			errors,
			settle,
			toWorld,
			toViewport,
			get camera() { return cam },
			get cursor() { return cur },
			async wait(seconds) {
				const end = frame + Math.round(seconds * fps)
				while (frame < end) await renderFrame()
			},
			async waitUntil(seconds) {
				while (t() < seconds - 1e-9) await renderFrame()
			},
			/** Camera move to { cx, cy, w } over dur seconds. Non-blocking. dur 0 is a cut. */
			cameraTo(target, dur = 1.0, e = ease.smooth) {
				if (dur <= 0) { cam = { ...cam, ...target }; return }
				const from = { ...cam }
				const to = { ...cam, ...target }
				// A long move pulls back a little on the way, so the destination is in view before it arrives.
				const travel = Math.hypot(to.cx - from.cx, to.cy - from.cy) / Math.max(from.w, to.w)
				const bump = Math.min(0.35, Math.max(0, travel - 0.35) * 0.45)
				const start = t()
				tweens.push({ start, dur, ease: e, apply: (k) => {
					cam = { cx: from.cx + (to.cx - from.cx) * k, cy: from.cy + (to.cy - from.cy) * k, w: from.w * (to.w / from.w) ** k * (1 + bump * Math.sin(Math.PI * k)) }
				} })
			},
			/** Cursor move along a gentle arc to a world point. Blocking for its duration. */
			async moveTo(p, dur = 0.6, { kind, arc = 0.08 } = {}) {
				const from = { x: cur.x, y: cur.y }
				const dx = p.x - from.x, dy = p.y - from.y
				const nx = -dy * arc, ny = dx * arc
				tweens.push({ start: t(), dur, ease: ease.inOutCubic, apply: (k) => {
					const bend = 4 * k * (1 - k)
					cur = { ...cur, x: from.x + dx * k + nx * bend, y: from.y + dy * k + ny * bend }
				} })
				await api.wait(dur)
				if (kind) cur = { ...cur, kind }
			},
			setCursor(patch) { cur = { ...cur, ...patch } },
			async click({ button = "left", count = 1, hold = 0.09 } = {}) {
				const vp = toViewport(cur)
				// A click the viewer cannot see is a script bug, and off-screen it lands nowhere.
				if (vp.x < 0 || vp.y < 0 || vp.x > F.w || vp.y > F.h) throw new Error(`click outside the frame at ${t().toFixed(2)}s (${vp.x.toFixed(0)}, ${vp.y.toFixed(0)})`)
				await page.mouse.move(vp.x, vp.y)
				for (let i = 0; i < count; i++) {
					cur = { ...cur, down: true }
					await page.mouse.down({ button, clickCount: i + 1 })
					await api.wait(hold)
					await page.mouse.up({ button, clickCount: i + 1 })
					cur = { ...cur, down: false }
					if (i < count - 1) await api.wait(0.06)
				}
			},
			async mouseDown() { const vp = toViewport(cur); await page.mouse.move(vp.x, vp.y); await page.mouse.down(); cur = { ...cur, down: true } },
			async mouseUp() { await page.mouse.up(); cur = { ...cur, down: false } },
			/** Types text at a human pace: msPerChar with seeded jitter, deterministic across renders. */
			async type(text, msPerChar = 55, seed = 7) {
				let s = seed
				const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
				for (const ch of text) {
					await page.keyboard.type(ch)
					await api.wait((msPerChar * (0.65 + rnd() * 0.7)) / 1000)
				}
			},
			async key(k) { await page.keyboard.press(k) },
			/** Shows a caption with a fade; returns immediately. */
			caption(text, { fade = 0.18, scrim = false } = {}) {
				caption = { text, scrim, opacity: 0 }
				tweens.push({ start: t(), dur: fade, ease: ease.out, apply: (k) => { caption = { ...caption, opacity: k } } })
			},
			hideCaption({ fade = 0.15 } = {}) {
				const from = caption.opacity
				tweens.push({ start: t(), dur: fade, ease: ease.out, apply: (k) => { caption = { ...caption, opacity: from * (1 - k) } } })
			},
			/** card("title"|"end", "Line", { sub, mono, fade }) or card({ kind, title, sub, mono }, { fade }) */
			card(spec, a = "", b = {}) {
				const opts = typeof spec === "string" ? b : (a && typeof a === "object" ? a : b)
				const fade = opts.fade ?? 0.2
				const base = typeof spec === "string" ? { kind: spec, title: a, sub: opts.sub ?? "", mono: opts.mono ?? "" } : { kind: "title", ...spec }
				cardState = { sub: "", mono: "", ...base, opacity: fade ? 0 : 1 }
				if (fade) tweens.push({ start: t(), dur: fade, ease: ease.out, apply: (k) => { cardState = { ...cardState, opacity: k } } })
			},
			hideCard() { cardState = { kind: "none", opacity: 0, title: "", sub: "", mono: "" } },
			/** Stage state outside the tweened set: an editor, a layout toggle, custom fields. */
			async stage(patch) { await page.evaluate((p) => window.__stage.set(p), patch) },
			async eval(fn, arg) { return page.evaluate(fn, arg) },
			/**
			 * World-space box of an element, measured the way the browser lays it out:
			 * its own getBoundingClientRect, plus each iframe's offset on the way up
			 * (inner documents are untransformed), with the camera undone once at the top.
			 */
			async worldBox(locator) {
				const handle = await locator.elementHandle({ timeout: 10000 })
				if (!handle) throw new Error("no element for locator")
				const rect = await handle.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })
				let fr = await handle.ownerFrame()
				if (!fr || !fr.parentFrame()) {
					const a = toWorld({ x: rect.x, y: rect.y }), b = toWorld({ x: rect.x + rect.w, y: rect.y + rect.h })
					return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }
				}
				let x = rect.x, y = rect.y
				while (fr.parentFrame()) {
					const el = await fr.frameElement()
					const off = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left + e.clientLeft, y: r.top + e.clientTop } })
					const parent = fr.parentFrame()
					if (!parent.parentFrame()) {
						const origin = toWorld({ x: off.x, y: off.y })
						return { x: origin.x + x, y: origin.y + y, w: rect.w, h: rect.h }
					}
					x += off.x; y += off.y
					fr = parent
				}
				throw new Error("unreachable")
			},
			async worldOf(locator, anchor = { x: 0.5, y: 0.5 }) {
				const b = await api.worldBox(locator)
				return { x: b.x + b.w * anchor.x, y: b.y + b.h * anchor.y }
			},
			async close() {
				if (ffmpeg) { ffmpeg.stdin.end(); await new Promise((r) => ffmpeg.on("close", r)) }
				await browser.close()
				process.stdout.write("\n")
			},
		}
		return api
	}

	if (mode === "timeline") {
		const duration = await page.evaluate(() => window.DURATION)
		if (!Number.isFinite(duration)) throw new Error("timeline stage must set window.DURATION (seconds)")
		const to = Math.min(until, duration)
		let ffmpeg = startFfmpeg(out, preview, fps)
		if (stills) fs.mkdirSync(stills, { recursive: true })
		const total = Math.round(to * fps)
		const startedAt = Date.now()
		for (let f = 0; f <= total; f++) {
			const now = f / fps
			await page.evaluate((t) => window.seek(t), now)
			const nowMs = (f + 1) * msPerFrame
			for (const fr of page.frames()) {
				try { await fr.evaluate((n) => window.__seek && window.__seek(n), nowMs) } catch {}
			}
			if (ffmpeg || (stills && onStill(now))) {
				const png = await page.screenshot({ type: "png" })
				if (ffmpeg) await new Promise((r) => (ffmpeg.stdin.write(png) ? r() : ffmpeg.stdin.once("drain", r)))
				if (stills && onStill(now)) fs.writeFileSync(path.join(stills, `t${now.toFixed(2).padStart(6, "0")}.png`), png)
			}
			if (f % 60 === 0) process.stdout.write(`\r${format} ${now.toFixed(1)}s / ${to}s (${((Date.now() - startedAt) / 1000).toFixed(0)}s)`)
		}
		function onStill(now) { return Math.abs(now / stillEvery - Math.round(now / stillEvery)) < 1e-6 }
		return {
			mode, format, F, page, errors,
			duration,
			async route(channel, fn) {
				routes.set(channel, fn)
				await page.evaluate((c) => window.__filmRoutes.add(c), channel)
			},
			async seek(seconds) { await page.evaluate((t) => window.seek(t), seconds) },
			async screenshot(p) { return page.screenshot({ path: p, type: "png" }) },
			async close() {
				if (ffmpeg) { ffmpeg.stdin.end(); await new Promise((r) => ffmpeg.on("close", r)) }
				await browser.close()
				process.stdout.write("\n")
			},
		}
	}

	await browser.close()
	throw new Error(`unknown mode "${mode}" (use "film" or "timeline")`)
}

function startFfmpeg(out, preview, fps) {
	if (!out || preview) return null
	fs.mkdirSync(path.dirname(out), { recursive: true })
	return spawn("ffmpeg", [
		"-y", "-loglevel", "error",
		"-f", "image2pipe", "-framerate", String(fps), "-i", "-",
		"-c:v", "libx264", "-preset", "slow", "-crf", "14",
		"-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
	], { stdio: ["pipe", "inherit", "inherit"] })
}
