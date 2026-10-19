/**
 * Framing and settling helpers every film shares, so each one moves the same way.
 */
export function helpers(F, { deskMinW = 0 } = {}) {
	const { page } = F
	const PHONE = F.format === "phone"
	const CAPTION_BAND = PHONE ? 250 : 0
	const DESK_BAND = PHONE ? 0 : 150
	const WINDOW_BOUNDS = PHONE ? { x0: -80, y0: -500, x1: 1680, y1: 1400 } : { x0: deskMinW ? -40 : -400, y0: 0, x1: 1640, y1: 900 }

	function frameOn(box, { pad = 1.15, minW = 0, maxW = Infinity, band = true, within = WINDOW_BOUNDS } = {}) {
		const aspect = F.F.w / F.F.h
		let w = Math.max(box.w * pad, box.h * pad * aspect, minW, PHONE ? 0 : deskMinW)
		w = Math.min(w, maxW)
		const h = w / aspect
		const s = F.F.w / w
		let cx = box.x + box.w / 2
		let cy = box.y + box.h / 2
		if (band) cy -= ((CAPTION_BAND - DESK_BAND) / 2) / s
		if (within) {
			const b = within
			cx = w <= b.x1 - b.x0 ? Math.min(Math.max(cx, b.x0 + w / 2), b.x1 - w / 2) : (b.x0 + b.x1) / 2
			cy = h <= b.y1 - b.y0 ? Math.min(Math.max(cy, b.y0 + h / 2), b.y1 - h / 2) : (b.y0 + b.y1) / 2
		}
		return { cx, cy, w }
	}
	const union = (...boxes) => {
		const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y))
		const r = Math.max(...boxes.map((b) => b.x + b.w)), btm = Math.max(...boxes.map((b) => b.y + b.h))
		return { x, y, w: r - x, h: btm - y }
	}
	const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })

	async function pump(steps = 30, step = 50) {
		for (let i = 0; i < steps; i++) { await page.clock.runFor(step); await page.waitForTimeout(40) }
	}
	async function settleOn(locator, { step = 16 } = {}) {
		await F.settle(async () => (await locator.count().catch(() => 0)) > 0 && (await locator.first().isVisible().catch(() => false)), { step })
	}
	/** Of several matches, the visible one nearest the cursor. */
	async function nearest(locator) {
		const n = await locator.count()
		let best = null, bestD = Infinity
		for (let i = 0; i < n; i++) {
			const item = locator.nth(i)
			if (!(await item.isVisible().catch(() => false))) continue
			const b = await F.worldBox(item)
			const d = Math.hypot(b.x + b.w / 2 - F.cursor.x, b.y + b.h / 2 - F.cursor.y)
			if (d < bestD) { bestD = d; best = item }
		}
		if (!best) throw new Error("no visible match for " + locator)
		return best
	}
	/** A write's hot update lands here, between frames. */
	async function landWrites() {
		await page.waitForFunction(() => window.__stage.writesInFlight === 0, null, { timeout: 15000 })
		await page.waitForTimeout(1800)
		for (let i = 0; i < 4; i++) { await page.clock.runFor(1); await page.waitForTimeout(150) }
	}
	/** Camera and hand go to the same element together, then click it after a beat. */
	async function goClick(locator, { frame = null, dur = 1.1, hold = 0.3, kind } = {}) {
		const box = await F.worldBox(locator)
		if (frame) F.cameraTo(frameOn(frame === true ? box : frame.box ?? box, frame), dur)
		await F.moveTo(centre(box), dur, kind ? { kind } : undefined)
		await F.wait(hold)
		await F.click()
	}
	/**
	 * Since 0.3.0 the selection layer starts off on a focused page; a person
	 * turns it on from its toolbar before anything can be right-clicked.
	 */
	async function armSelection(focused, { dur = 1.1 } = {}) {
		const toggle = focused.locator('[aria-label="Copy element"]').first()
		await settleOn(toggle)
		const box = await F.worldBox(toggle)
		F.cameraTo(frameOn({ x: box.x - 70, y: box.y - 40, w: box.w + 140, h: box.h + 80 }, { pad: 1.2, minW: PHONE ? 430 : 1000 }), dur)
		await F.moveTo(centre(box), dur, { kind: "arrow" })
		await F.wait(0.35)
		await F.click()
		await F.wait(0.45)
	}
	/** Scrolls the focused page so an element sits `top` px from the frame's top, over `seconds`, eased. */
	async function scrollFocusedTo(caretId, { top = 150, seconds = 1.0 } = {}) {
		const ff = page.frames().find((f) => f.url().includes("mode=focused"))
		const plan = await ff.evaluate(([id, top]) => {
			const el = document.querySelector(`[data-caret-id="${id}"]`)
			let s = el.parentElement
			while (s && !(s.scrollHeight > s.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(s).overflowY))) s = s.parentElement
			window.__filmScroller = s ?? document.scrollingElement
			return { from: window.__filmScroller.scrollTop, distance: el.getBoundingClientRect().top - top }
		}, [caretId, top])
		const steps = Math.max(1, Math.round(seconds * 60))
		for (let i = 1; i <= steps; i++) {
			const k = i / steps
			const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2
			await ff.evaluate((y) => { window.__filmScroller.scrollTop = y }, plan.from + plan.distance * e)
			await F.wait(1 / 60)
		}
	}
	/** Waits (without filming) until the page has sent the host a message of this type; returns it. */
	async function hostMessage(type) {
		let found = null
		await F.settle(async () => {
			found = await page.evaluate((t) => [...window.__stage.hostLog].reverse().find((m) => m.type === t) ?? null, type)
			return !!found
		}, { step: 16 })
		await page.evaluate((t) => { const log = window.__stage.hostLog; for (let i = log.length - 1; i >= 0; i--) if (log[i].type === t) log.splice(i, 1) }, type)
		return found
	}
	/** Posts a host message into the canvas, as Caret's main process does. */
	async function toCanvas(type, payload) {
		await page.evaluate(([type, payload]) => document.getElementById("canvas-view").contentWindow.postMessage({ source: "caret-host", type, payload }, "*"), [type, payload])
	}
	return { PHONE, READ: PHONE ? 430 : 900, frameOn, union, centre, pump, settleOn, nearest, landWrites, goClick, armSelection, scrollFocusedTo, hostMessage, toCanvas }
}
