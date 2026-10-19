/**
 * Renders a scripted film of the stage, one frame at a time.
 *
 * Time is virtual: the page's clock (Date, timers, rAF, performance) only moves
 * when a frame is rendered, and every CSS animation and transition in every
 * document is paused and seeked to the frame's time. So the app's own motion
 * plays exactly as written, at any render speed, with no dropped frames.
 *
 * The script is an async function over the API returned by film(). Tweens
 * (camera, cursor, caption fades) run concurrently with whatever the script is
 * doing; `await F.wait(s)` renders frames until s seconds have passed.
 */
import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { chromium } from "playwright"

export const FORMATS = {
	phone: { w: 1080, h: 1350 },
	desk: { w: 1920, h: 1080 },
}

/** Runs in every document, the canvas and its page iframes included. */
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

export const ease = {
	/** Camera moves: a soft start and a long, gentle landing. */
	smooth: cubicBezier(0.45, 0, 0.2, 1),
	linear: (t) => t,
	inOut: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2), // quint
	out: (t) => 1 - (1 - t) ** 4,
	inOutCubic: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function film({ format = "phone", fps = 60, scale = 2, out, stills, stillEvery = 0.5, url = "http://localhost:5320", until = Infinity, preview = false, slow = null }) {
	const F = FORMATS[format]
	const browser = await chromium.launch()
	const context = await browser.newContext({ viewport: { width: F.w, height: F.h }, deviceScaleFactor: scale })
	await context.addInitScript(SEEK)
	const page = await context.newPage()
	const errors = []
	page.on("pageerror", (e) => errors.push(e.message))
	await page.clock.install({ time: new Date("2026-10-20T09:40:00+02:00") })
	// install() alone lets time flow; only a pause makes runFor the sole thing that moves it.
	await page.clock.pauseAt(new Date("2026-10-20T09:40:01+02:00"))
	// Main-process answers the script provides: route(channel, fn) in Node.
	const routes = new Map()
	await page.exposeFunction("__filmRoute", async (channel, args) => {
		const fn = routes.get(channel)
		return fn ? fn(...args) : null
	})
	await page.addInitScript(() => { window.__filmRoutes = new Set() })
	await page.goto(`${url}/?format=${format}`)

	let frame = 0
	const msPerFrame = 1000 / fps
	const tweens = []
	let cam = { cx: 800, cy: 450, w: 1600 }
	/** The camera the page is actually showing: measurements and clicks must use this, not a cut not yet rendered. */
	let domCam = { ...cam }
	let cursor = { x: 1100, y: 600, kind: "arrow", visible: true, down: false }
	let caption = { text: "", opacity: 0 }
	let card = { kind: "none", opacity: 0, text: "" }
	let mouseAt = null

	let ffmpeg = null
	if (out && !preview) {
		fs.mkdirSync(path.dirname(out), { recursive: true })
		ffmpeg = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
			"-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] })
	}
	if (stills) fs.mkdirSync(stills, { recursive: true })

	const t = () => frame / fps
	const toViewport = (p, c = domCam) => {
		const s = F.w / c.w
		return { x: (p.x - c.cx) * s + F.w / 2, y: (p.y - c.cy) * s + F.h / 2 }
	}
	const toWorld = (p, c = domCam) => {
		const s = F.w / c.w
		return { x: (p.x - F.w / 2) / s + c.cx, y: (p.y - F.h / 2) / s + c.cy }
	}

	/** Advances the page's virtual time, letting real-time work (network, React) settle without rendering. */
	async function settle(check, { maxMs = 30000, step = 50 } = {}) {
		const start = Date.now()
		while (Date.now() - start < maxMs) {
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
			tw.apply(tw.ease(k), k)
			if (k >= 1) tweens.splice(tweens.indexOf(tw), 1)
		}
		await page.evaluate((s) => window.__stage.set(s), { camera: cam, cursor, caption, card })
		domCam = { ...cam }
		const vp = toViewport(cursor)
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
		if (ffmpeg || (stills && Math.abs((now / stillEvery) - Math.round(now / stillEvery)) < 1e-6)) {
			const png = await page.screenshot({ type: "png" })
			if (ffmpeg) await new Promise((r) => (ffmpeg.stdin.write(png) ? r() : ffmpeg.stdin.once("drain", r)))
			if (stills && Math.abs((now / stillEvery) - Math.round(now / stillEvery)) < 1e-6) fs.writeFileSync(path.join(stills, `t${now.toFixed(2).padStart(6, "0")}.png`), png)
		}
		if (slow && now >= slow.from) await sleep(slow.ms)
		frame++
		if (frame % 60 === 0) process.stdout.write(`\r${format} ${t().toFixed(1)}s`)
		if (t() > until) throw Object.assign(new Error("until"), { until: true })
	}

	const api = {
		async route(channel, fn) {
			routes.set(channel, fn)
			await page.evaluate((c) => window.__filmRoutes.add(c), channel)
		},
		page,
		format,
		F,
		t,
		errors,
		settle,
		toWorld,
		toViewport,
		get camera() { return cam },
		get cursor() { return cursor },
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
			tweens.push({ start: t(), dur, ease: e, apply: (k) => {
				cam = { cx: from.cx + (to.cx - from.cx) * k, cy: from.cy + (to.cy - from.cy) * k, w: from.w * (to.w / from.w) ** k * (1 + bump * Math.sin(Math.PI * k)) }
			} })
		},
		/** Cursor move along a gentle arc to a world point. Blocking for its duration. */
		async moveTo(p, dur = 0.6, { kind, arc = 0.08 } = {}) {
			const from = { x: cursor.x, y: cursor.y }
			const dx = p.x - from.x, dy = p.y - from.y
			const nx = -dy * arc, ny = dx * arc
			tweens.push({ start: t(), dur, ease: ease.inOutCubic, apply: (k) => {
				const bend = 4 * k * (1 - k)
				cursor = { ...cursor, x: from.x + dx * k + nx * bend, y: from.y + dy * k + ny * bend }
			} })
			await api.wait(dur)
			if (kind) cursor = { ...cursor, kind }
		},
		setCursor(patch) { cursor = { ...cursor, ...patch } },
		async click({ button = "left", count = 1, hold = 0.09 } = {}) {
			const vp = toViewport(cursor)
			// A click the viewer cannot see is a script bug, and off-screen it lands nowhere.
			if (vp.x < 0 || vp.y < 0 || vp.x > F.w || vp.y > F.h) throw new Error(`click outside the frame at ${t().toFixed(2)}s (${vp.x.toFixed(0)}, ${vp.y.toFixed(0)})`)
			await page.mouse.move(vp.x, vp.y)
			for (let i = 0; i < count; i++) {
				cursor = { ...cursor, down: true }
				await page.mouse.down({ button, clickCount: i + 1 })
				await api.wait(hold)
				await page.mouse.up({ button, clickCount: i + 1 })
				cursor = { ...cursor, down: false }
				if (i < count - 1) await api.wait(0.06)
			}
		},
		async mouseDown() { const vp = toViewport(cursor); await page.mouse.move(vp.x, vp.y); await page.mouse.down(); cursor = { ...cursor, down: true } },
		async mouseUp() { await page.mouse.up(); cursor = { ...cursor, down: false } },
		/** Types text at a human pace: msPerChar with seeded jitter. */
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
		caption(text, { fade = 0.18 } = {}) {
			caption = { text, opacity: 0 }
			tweens.push({ start: t(), dur: fade, ease: ease.out, apply: (k) => { caption = { ...caption, opacity: k } } })
		},
		hideCaption({ fade = 0.15 } = {}) {
			const from = caption.opacity
			tweens.push({ start: t(), dur: fade, ease: ease.out, apply: (k) => { caption = { ...caption, opacity: from * (1 - k) } } })
		},
		card(kind, text = "", { fade = 0.2 } = {}) {
			card = { kind, text, opacity: fade ? 0 : 1 }
			if (fade) tweens.push({ start: t(), dur: fade, ease: ease.out, apply: (k) => { card = { ...card, opacity: k } } })
		},
		hideCard() { card = { kind: "none", opacity: 0, text: "" } },
		/** Stage state outside the tweened set: the editor, mostly. */
		async stage(patch) { await page.evaluate((p) => window.__stage.set((s) => ({ ...p, editor: { ...s.editor, ...(p.editor ?? {}) } })), patch) },
		async eval(fn, arg) { return page.evaluate(fn, arg) },
		/**
		 * World-space box of an element, measured the way the browser lays it out:
		 * its own getBoundingClientRect, plus each iframe's offset on the way up
		 * (inner documents are untransformed), with the camera undone once at the
		 * top. Correct for fixed elements and nested frames at any zoom.
		 */
		async worldBox(locator) {
			const handle = await locator.elementHandle({ timeout: 10000 })
			if (!handle) throw new Error("no element for locator")
			const rect = await handle.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })
			let frame = await handle.ownerFrame()
			if (!frame || !frame.parentFrame()) {
				const a = toWorld({ x: rect.x, y: rect.y }), b = toWorld({ x: rect.x + rect.w, y: rect.y + rect.h })
				return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }
			}
			let x = rect.x, y = rect.y
			while (frame.parentFrame()) {
				const el = await frame.frameElement()
				const off = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left + e.clientLeft, y: r.top + e.clientTop } })
				const parent = frame.parentFrame()
				if (!parent.parentFrame()) {
					// The top-level iframe: its rect is in viewport space, under the camera.
					const origin = toWorld({ x: off.x, y: off.y })
					return { x: origin.x + x, y: origin.y + y, w: rect.w, h: rect.h }
				}
				x += off.x; y += off.y
				frame = parent
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
