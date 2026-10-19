/**
 * Film 1 — One repo.
 *
 *   node render/film1.mjs phone preview   → stills every 0.5s at 1x, no video
 *   node render/film1.mjs phone final     → 2160×2700 60fps master
 *   node render/film1.mjs desk final      → 3840×2160 60fps master
 *
 * Camera rules (the owner's): linger before a move unless the shot has already
 * been held by an action; every move smooth; when the camera goes somewhere so
 * the viewer can see something, the cursor goes to that exact thing.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { helpers } from "./common.mjs"
import { film } from "./film-kit.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const [format = "phone", mode = "preview", untilArg] = process.argv.slice(2)
const final = mode === "final"
execFileSync(path.join(here, "reset-project.sh"))

const F = await film({
	format,
	preview: !final,
	scale: final ? 2 : Number(process.env.SCALE ?? 1),
	out: path.join(here, `../renders/film1-${format}.mp4`),
	stills: path.join(here, `../renders/film1-${format}-${final ? "final" : "preview"}-stills`),
	stillEvery: final ? 1 : 0.5,
	until: untilArg ? Number(untilArg) : Infinity,
	slow: process.env.SLOW_FROM ? { from: Number(process.env.SLOW_FROM), ms: 400 } : null,
})
const { page } = F
const PHONE = format === "phone"
const { armSelection } = helpers(F)

const OLD_HEADLINE = "Made for the long, wet way round."
const NEW_HEADLINE = "Made for roads that are never dry."
const APP_HEADLINE = "Built for wet roads, all year."
const COLOUR_REQUEST = "Change the brand colour to signal yellow, like a hi-vis jacket."
const YELLOW_THEME = fs.readFileSync(path.join(here, "assets/theme-yellow.css"), "utf-8")
const YELLOW_FOUNDATION = fs.readFileSync(path.join(here, "assets/foundation-yellow.json"), "utf-8")
const YELLOW_VARS = Object.fromEntries([...YELLOW_THEME.matchAll(/(--color-brand(?:-\d+)?):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]))

const canvas = page.frameLocator("#canvas-view")
const focused = canvas.frameLocator("iframe.caret-focused-iframe")
const chrome = page.locator("#caret-window")
const focusedFrame = () => page.frames().find((f) => f.url().includes("mode=focused"))

// ---------------------------------------------------------------- framing

const CAPTION_BAND = PHONE ? 250 : 0
const DESK_BAND = PHONE ? 0 : 150
const WINDOW_BOUNDS = PHONE ? { x0: -80, y0: -500, x1: 1680, y1: 1400 } : { x0: -400, y0: 0, x1: 1630, y1: 900 }
/** The phone frame must read Caret's 13px interface text. */
const READ = PHONE ? 430 : 900

function frameOn(box, { pad = 1.15, minW = 0, maxW = Infinity, band = true, within = WINDOW_BOUNDS } = {}) {
	const aspect = F.F.w / F.F.h
	let w = Math.max(box.w * pad, box.h * pad * aspect, minW)
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
/** Of several matches (react-grab's toolbar repeats some menu items), the one nearest the cursor. */
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
/** A write's hot update lands here, between frames, never wherever the render happens to be. */
async function landWrites() {
	await page.waitForFunction(() => window.__stage.writesInFlight === 0, null, { timeout: 15000 })
	await page.waitForTimeout(1800)
	for (let i = 0; i < 4; i++) { await page.clock.runFor(1); await page.waitForTimeout(150) }
}
const cards = () => canvas.locator(".caret-canvas-frame-title")
async function settleGrid(count) {
	await F.settle(async () => (await cards().count().catch(() => 0)) >= count, { maxMs: 60000, step: 16 })
	await pump(25, 4)
}
const card = (title) => canvas.locator(".caret-canvas-frame", { hasText: title }).first()

// ---------------------------------------------------------------- setup (not filmed)

await settleGrid(7)
const homeCard = await F.worldBox(card("Vahl — Home"))
const ridesCard = await F.worldBox(card("Vahl — Ride log"))
const titles = ["Vahl — Home", "Vahl — Journal", "Vahl — Fitting", "Vahl — Fjell", "Vahl — Ride log", "Vahl — Strand", "Vahl — Test ride"]
const gridBox = union(...(await Promise.all(titles.map((t) => F.worldBox(card(t))))))

// ---------------------------------------------------------------- 1. open on the canvas
F.cameraTo(frameOn(union(homeCard, ridesCard), { pad: 1.1 }), 0)
F.setCursor({ x: ridesCard.x + ridesCard.w * 0.92, y: ridesCard.y + ridesCard.h * 1.08, kind: "arrow", visible: true })
await F.wait(0.25)
F.caption("Your design shouldn’t live outside your codebase.")
await F.wait(3.4)
F.hideCaption()
await F.wait(0.35)

// ---------------------------------------------------------------- 2. every page design is a file
F.caption("Every page design is a file in your repo, beside your app.")
F.cameraTo(frameOn(gridBox, { pad: 1.06 }), 1.6)
await F.wait(1.0)
const journalCard = await F.worldBox(card("Vahl — Journal"))
await F.moveTo({ x: journalCard.x + journalCard.w * 0.55, y: journalCard.y + journalCard.h * 0.5 }, 1.0, { kind: "pointer" })
await F.wait(1.0)
await F.moveTo({ x: homeCard.x + homeCard.w * 0.55, y: homeCard.y + homeCard.h * 0.55 }, 0.9)
await F.wait(0.9)
F.hideCaption()
await F.wait(0.3)

// ---------------------------------------------------------------- 3. retype the headline
await F.click()
await settleOn(focused.locator("[data-caret-id=hero-title]"))
await pump(12, 4)
const h1 = focused.locator("[data-caret-id=hero-title]")
const h1Box = await F.worldBox(h1)
F.setCursor({ kind: "arrow" })
// The view has just opened: let it sit, then turn on selection and move in on the headline.
await F.wait(0.5)
await armSelection(focused)
F.cameraTo(frameOn(h1Box, { pad: 1.14 }), 1.3)
await F.moveTo({ x: h1Box.x + h1Box.w * 0.34, y: h1Box.y + h1Box.h * 0.3 }, 1.2, { arc: 0.03 })
await F.wait(0.45)
await F.click({ button: "right" })
await F.wait(0.45)
const editText = await nearest(focused.locator("text=Edit text"))
const menu1 = union(await F.worldBox(await nearest(focused.locator("text=Copy"))), await F.worldBox(editText), await F.worldBox(await nearest(focused.locator("text=Replace image"))))
F.cameraTo(frameOn({ x: menu1.x - 8, y: menu1.y - 34, w: 130, h: menu1.h + 50 }, { pad: 1.25, minW: READ }), 1.0)
await F.wait(1.15)
await F.moveTo(await F.worldOf(editText), 0.7)
await F.wait(0.25)
await F.click()
await F.wait(0.3)
F.cameraTo(frameOn(h1Box, { pad: 1.14 }), 1.0)
const span = await focusedFrame().evaluate(() => {
	const h = document.querySelector("[data-caret-id=hero-title]")
	const tn = h.firstChild
	const s = tn.textContent.indexOf("the long"), e = tn.textContent.indexOf("way round") + 9
	const r = document.createRange()
	r.setStart(tn, s); r.setEnd(tn, s + 1); const a = r.getBoundingClientRect()
	r.setStart(tn, e - 1); r.setEnd(tn, e); const b = r.getBoundingClientRect()
	const hr = h.getBoundingClientRect()
	return { ax: a.left - hr.left, ay: a.top + a.height / 2 - hr.top, bx: b.right - hr.left, by: b.top + b.height / 2 - hr.top }
})
await F.moveTo({ x: h1Box.x + span.ax + 2, y: h1Box.y + span.ay }, 0.9, { kind: "text" })
F.setCursor({ kind: "text" })
await F.wait(0.2)
await F.mouseDown()
await F.moveTo({ x: h1Box.x + span.bx - 1, y: h1Box.y + span.by }, 0.8, { arc: 0.02 })
await F.mouseUp()
await F.wait(0.35)
await page.evaluate(([find, replace]) => window.__stage.hostConfig.patches.push({ file: ".caret/pages/home/index.tsx", find, replace }), [OLD_HEADLINE, NEW_HEADLINE])
await F.type("roads that are never dry", 58, 11)
await F.wait(0.4)
await F.key("Enter")
await landWrites()
F.setCursor({ kind: "arrow" })
await F.wait(0.35)
// The confirmation is up at the top of the page: take the hand to it.
const toast1 = focused.locator("text=Edit applied").first()
await settleOn(toast1)
const toast1Box = await F.worldBox(toast1)
F.cameraTo(frameOn(union(toast1Box, h1Box), { pad: 1.1 }), 1.2)
await F.moveTo({ x: toast1Box.x + toast1Box.w * 0.62, y: toast1Box.y + toast1Box.h * 0.75 }, 1.1)
F.caption("Edit on the page. The change is written to the file.")
await F.wait(2.7)
F.hideCaption()
await F.wait(0.3)

// ---------------------------------------------------------------- 4. one token, every place it is used
const back = canvas.locator('button[title="Back to canvas"]')
const backBox = await F.worldBox(back)
F.cameraTo(frameOn(union(backBox, toast1Box), { pad: 1.15, minW: PHONE ? 600 : 1300 }), 1.1)
await F.moveTo(centre(backBox), 1.1)
await F.wait(0.3)
await F.click()
await settleGrid(7)
const ridesCard2 = await F.worldBox(card("Vahl — Ride log"))
F.cameraTo(frameOn(ridesCard2, { pad: 1.5 }), 1.2)
await F.moveTo({ x: ridesCard2.x + ridesCard2.w * 0.5, y: ridesCard2.y + ridesCard2.h * 0.55 }, 1.1, { kind: "pointer" })
await F.wait(0.45)
await F.click()
await settleOn(focused.locator("[data-caret-id=rides-title]"))
await pump(12, 4)
F.setCursor({ kind: "arrow" })
const ridesPage = await F.worldBox(focused.locator("main").first())
F.cameraTo(frameOn({ x: ridesPage.x, y: ridesPage.y, w: ridesPage.w, h: 860 }, { pad: 1.02 }), 1.2)
await F.wait(1.6)
// Ask for the change in the chat.
const chatBtn = chrome.locator("button", { hasText: "Chat" }).first()
const chatBtnBox = await F.worldBox(chatBtn)
F.cameraTo(frameOn(chatBtnBox, { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.1)
await F.moveTo(centre(chatBtnBox), 1.1)
await F.wait(0.3)
await F.click()
const chat = chrome.locator("aside").first()
await settleOn(chat)
const chatBox = await F.worldBox(chat)
const composer = chat.locator("textarea").first()
/** Keeps the newest part of the chat in a readable frame. */
async function followChat(target, dur = 0.9) {
	const b = await F.worldBox(target ?? chat.locator("div.overflow-y-auto > div > *").last())
	const w = PHONE ? 440 : 900
	const h = w * (F.F.h / F.F.w)
	let cy = b.y + b.h - h * 0.16
	cy = Math.min(Math.max(cy, chatBox.y + h / 2 - 110), chatBox.y + chatBox.h - h / 2 + 30)
	if (!PHONE) cy = Math.min(Math.max(cy, h / 2), 900 - h / 2)
	const cx = PHONE ? chatBox.x + chatBox.w / 2 : chatBox.x + chatBox.w - w / 2 + 40
	F.cameraTo({ cx, cy, w }, dur)
}
await followChat(composer, 1.1)
await F.moveTo(await F.worldOf(composer, { x: 0.3, y: 0.4 }), 1.0, { kind: "text" })
await F.wait(0.2)
await F.click()
await F.type(COLOUR_REQUEST, 42, 5)
await F.wait(0.4)
await F.key("Enter")
F.setCursor({ kind: "arrow" })
const now = async () => page.evaluate(() => Date.now())
const push = async (patch) => page.evaluate((p) => window.__stage.bridge.setAgent(p), patch)
const usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 }
const chatActivity = { id: "chat-1", kind: "chat", title: "Chat", mode: "write", sessionId: "ses_vahl_2" }
const talk = [{ kind: "user", id: "t1", text: COLOUR_REQUEST }]
await push({ activity: chatActivity, mode: "write", streaming: true, lastEventAt: await now(), transcript: { entries: [...talk], files: [], usage } })
await F.wait(0.2)
await followChat(undefined, 0.8)
await F.wait(0.7)
for (const [id, name, summary] of [["t2", "caret_get_tokens", "foundation"], ["t3", "caret_update_tokens", "brand #ff5a1f → #ffc414"]]) {
	talk.push({ kind: "tool", id, callId: id, name, summary, status: "running" })
	await push({ lastEventAt: await now(), transcript: { entries: [...talk], files: [], usage } })
	await F.wait(0.45)
	talk[talk.length - 1] = { ...talk[talk.length - 1], status: "ok" }
	await push({ lastEventAt: await now(), transcript: { entries: [...talk], files: [], usage } })
	await F.wait(0.3)
}
talk.push({ kind: "assistant", id: "t4", text: "Done. The brand colour is now signal yellow, `#ffc414`, with its scale derived from it. Everything bound to the brand token follows." })
await push({ streaming: false, lastEventAt: null, transcript: { entries: [...talk], files: [".caret/tokens/foundation.json"], usage } })
await F.wait(0.1)
await followChat(undefined, 0.8)
await F.wait(2.0)
// Close the chat to see the whole page, then the colour moves through it.
const closeChat = chat.locator('button[title="Close"]').first()
const closeBox = await F.worldBox(closeChat)
F.cameraTo(frameOn(closeBox, { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.0)
await F.moveTo(centre(closeBox), 1.0)
await F.wait(0.25)
await F.click()
await settleOn(focused.locator("[data-caret-id=rides-plan]"))
await pump(6, 4)
const plan = await F.worldBox(focused.locator("[data-caret-id=rides-plan]"))
const page2 = await F.worldBox(focused.locator("main").first())
F.cameraTo(PHONE ? frameOn({ x: page2.x + page2.w * 0.36, y: page2.y + 60, w: 860, h: 720 }, { pad: 1.02 }) : frameOn({ x: page2.x, y: page2.y + 40, w: page2.w, h: 800 }, { pad: 1.0 }), 1.3)
await F.moveTo({ x: plan.x + plan.w * 0.5, y: plan.y + plan.h * 0.55 }, 1.3)
await F.wait(0.6)
// The sweep starts where the hand is and travels across the page.
const body = await F.worldBox(focused.locator("body"))
const origin = { x: F.cursor.x - body.x, y: F.cursor.y - body.y }
await focusedFrame().evaluate(({ origin, vars }) => {
	const speed = 1500 // px per second
	for (const el of document.querySelectorAll('[class*="brand"]')) {
		const r = el.getBoundingClientRect()
		const d = Math.hypot(r.left + r.width / 2 - origin.x, r.top + r.height / 2 - origin.y)
		const delay = Math.round((d / speed) * 1000)
		el.style.transition = ["background-color", "color", "border-color", "stroke", "fill"].map((p) => `${p} 450ms ease ${delay}ms`).join(", ")
	}
	for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v)
}, { origin, vars: YELLOW_VARS })
await F.wait(0.35)
F.caption("Change a token once. Everything bound to it follows.")
await F.wait(2.9)
F.hideCaption()
// The token is now on disk as Caret writes it; the hot update lands on the same values.
await page.evaluate(async ([foundation, theme]) => {
	await window.__stage.writeFile({ write: { file: ".caret/tokens/foundation.json", content: foundation } })
	await window.__stage.writeFile({ write: { file: ".caret/caret-theme.css", content: theme } })
}, [YELLOW_FOUNDATION, YELLOW_THEME])
await landWrites()
await F.wait(0.3)

// ---------------------------------------------------------------- 5. sync into the app
const syncBtn = chrome.locator("button", { hasText: "Sync" }).first()
const syncBox = await F.worldBox(syncBtn)
F.cameraTo(frameOn(syncBox, { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.2)
await F.moveTo(centre(syncBox), 1.2)
F.caption("Your app’s own source stays untouched until you sync.")
await F.wait(1.5)
await F.click()
await F.eval(() => window.__stage.bridge.notify({ id: "n-sync", level: "info", message: "Syncing design → app: 2 changed design file(s).", actions: [] }))
const toastSync = chrome.locator("text=Syncing design → app").first()
await settleOn(toastSync)
const toastSyncBox = await F.worldBox(toastSync)
F.cameraTo(frameOn(toastSyncBox, { pad: 1.15, minW: PHONE ? 520 : 1250 }), 1.1)
await F.moveTo({ x: toastSyncBox.x + toastSyncBox.w * 0.5, y: toastSyncBox.y + toastSyncBox.h * 0.8 }, 1.1)
await F.wait(1.0)
F.hideCaption()
const activity = { id: "sync-1", kind: "sync-plan", title: "Sync design → app", mode: "read-only", sessionId: "ses_vahl_3" }
const entries = [
	{ kind: "note", id: "e1", text: "Planning from 2 changed design file(s). Nothing in your app is written yet." },
	{ kind: "user", id: "e2", text: "Bring the app in line with 2 changed design file(s)." },
]
await push({ activity, mode: "read-only", streaming: true, lastEventAt: await now(), transcript: { entries: [...entries], files: [], usage } })
const chatBtnBox2 = await F.worldBox(chatBtn)
F.cameraTo(frameOn(chatBtnBox2, { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.1)
await F.moveTo(centre(chatBtnBox2), 1.1)
await F.wait(0.25)
await F.click()
await settleOn(chat)
await followChat(chat.locator("text=Bring the app in line").first(), 1.1)
F.caption("Sync carries the changes into your app’s own code.")
await F.wait(1.0)
entries.push({ kind: "thinking", id: "e3", text: "The home headline changed, and the brand token moved to yellow." })
await push({ lastEventAt: await now(), transcript: { entries: [...entries], files: [], usage } })
await F.wait(0.4)
for (const [i, s] of [[4, ".caret/pages/home/index.tsx"], [5, ".caret/tokens/foundation.json"], [6, "src/components/home/Hero.tsx"], [7, "src/app/globals.css"]]) {
	entries.push({ kind: "tool", id: `e${i}`, callId: `c${i}`, name: "read", summary: s, status: "running" })
	await push({ lastEventAt: await now(), transcript: { entries: [...entries], files: [], usage } })
	await followChat(undefined, 0.6)
	await F.wait(0.3)
	entries[entries.length - 1] = { ...entries[entries.length - 1], status: "ok" }
	await push({ lastEventAt: await now(), transcript: { entries: [...entries], files: [], usage } })
	await F.wait(0.2)
}
entries.push({
	kind: "assistant",
	id: "e8",
	plan: true,
	text: "Two changes:\n\n1. **`src/components/home/Hero.tsx`** — the headline becomes “Made for roads that are never dry.”\n2. **`src/app/globals.css`** — `--color-signal` moves from `#ff5a1f` to `#ffc414`, so every button, chart and badge that uses it follows.\n\nNothing else changed in the design, so nothing else is touched.",
})
await push({ streaming: false, lastEventAt: null, plan: { kind: "sync-plan", entryId: "e8" }, transcript: { entries: [...entries], files: [], usage } })
await F.wait(0.1)
await followChat(chat.locator("text=PLAN").first(), 0.9)
await F.wait(2.6)
const actBtn = chat.getByRole("button", { name: "Act", exact: true })
await followChat(actBtn, 0.9)
await F.moveTo(await F.worldOf(actBtn), 0.9)
await F.wait(0.25)
await F.click()
entries.push({ kind: "user", id: "e9", text: "Apply the plan." })
entries.push({ kind: "tool", id: "e10", callId: "c10", name: "edit", summary: "src/components/home/Hero.tsx", status: "running" })
entries.push({ kind: "permission", id: "e11", requestId: "perm-1", summary: "Change src/components/home/Hero.tsx?", status: "pending" })
await push({ activity: { ...activity, mode: "write" }, mode: "write", plan: null, streaming: true, lastEventAt: await now(), transcript: { entries: [...entries], files: [], usage } })
const always = chat.getByRole("button", { name: "Always allow", exact: true })
await settleOn(always)
await followChat(always, 0.9)
await F.moveTo(await F.worldOf(always), 0.9)
await F.wait(0.45)
await F.click()
entries[entries.length - 1] = { ...entries[entries.length - 1], status: "allowed" }
entries[entries.length - 2] = { ...entries[entries.length - 2], status: "ok" }
entries.push({ kind: "tool", id: "e12", callId: "c12", name: "edit", summary: "src/app/globals.css", status: "ok" })
entries.push({ kind: "permission", id: "e13", requestId: "perm-2", summary: "Change src/app/globals.css?", status: "allowed", automatic: "you allowed app changes for this project" })
entries.push({ kind: "tool", id: "e14", callId: "c14", name: "caret_report_sync_mapping", summary: "home → Hero.tsx · tokens → globals.css", status: "ok" })
const changedFiles = ["src/components/home/Hero.tsx", "src/app/globals.css"]
await push({ lastEventAt: await now(), transcript: { entries: [...entries], files: changedFiles, usage } })
await F.wait(0.6)
entries.push({ kind: "note", id: "e15", text: "Synced — 2 app file(s) changed. The next sync will only report changes made from here." })
await push({ streaming: false, lastEventAt: null, transcript: { entries: [...entries], files: changedFiles, usage } })
await F.wait(0.1)
const changed = chat.locator("text=CHANGED").first()
await followChat(changed, 0.9)
await F.moveTo(await F.worldOf(changed, { x: 1.4, y: 2.2 }), 0.9)
await F.wait(2.0)
F.hideCaption()
await F.wait(0.3)

// ---------------------------------------------------------------- 6. and back the other way
await F.eval(() => window.__stage.bridge.notify({
	id: "n-drift",
	level: "warn",
	message: "This commit changed app files that were translated from “.caret/pages/home/index.tsx” — the design no longer tells the truth about them.",
	actions: ["Review side by side"],
}))
const reviewBtn = chrome.getByRole("button", { name: "Review side by side" })
await settleOn(reviewBtn)
const driftToast = await F.worldBox(chrome.locator("text=the design no longer tells the truth").first())
F.cameraTo(frameOn(union(driftToast, await F.worldBox(reviewBtn)), { pad: 1.12, minW: PHONE ? 470 : 1250 }), 1.2)
await F.moveTo({ x: driftToast.x + driftToast.w * 0.45, y: driftToast.y + driftToast.h * 0.45 }, 1.2)
F.caption("Edit the app directly, and Caret notices.")
await F.wait(1.8)
await F.moveTo(await F.worldOf(reviewBtn), 0.8)
await F.wait(0.25)
await F.click()
const startedAt = new Date(await now()).toISOString()
const variants = (status) => JSON.stringify({ version: 2, mode: "page", pageId: "home", instruction: "app drift: src/components/home/Hero.tsx", startedAt, source: "caret", kind: "drift-proposal", proposalAppPaths: ["src/components/home/Hero.tsx", "src/app/globals.css"], nextTake: 2, nodes: [{ id: "home--v1", parentId: "home", instruction: "app drift: src/components/home/Hero.tsx", angle: "external", angleLabel: "App's version", label: "App's version", status, startedAt, round: "r1" }] }, null, 2)
await page.evaluate(async ([working, oldH, newH]) => {
	const w = window.__stage.writeFile
	await w({ copyDir: { from: ".caret/pages/home", to: ".caret/pages/home--v1" } })
	await w({ write: { file: ".caret/pages/home--v1/meta.json", content: JSON.stringify({ id: "home--v1", title: "Vahl — Home — App's version", type: "landing", states: ["default"], tags: ["marketing", "landing"], variantOf: "home" }, null, 2) } })
	await w({ patch: { file: ".caret/pages/home--v1/index.tsx", find: oldH, replace: newH } })
	await w({ write: { file: ".caret/.variants.json", content: working } })
	window.__stage.bridge.emit("explore:open-changed", "/Users/ingrid/vahl", true)
}, [variants("working"), NEW_HEADLINE, APP_HEADLINE])
const pill = canvas.locator("[data-testid=explore-open-pill]")
await settleOn(pill)
const pillBox = await F.worldBox(pill)
F.cameraTo(frameOn(pillBox, { pad: 1.3, minW: PHONE ? 470 : 1100 }), 1.1)
await F.moveTo(centre(pillBox), 1.1)
await F.wait(0.35)
await F.click()
await settleOn(canvas.locator("text=Review: home vs the app").first())
await page.evaluate(async (ready) => { await window.__stage.writeFile({ write: { file: ".caret/.variants.json", content: ready } }) }, variants("ready"))
await landWrites()
const appTake = canvas.locator("text=App's version").last()
const currentLabel = canvas.locator("text=Current design").first()
const boardBox = union(await F.worldBox(currentLabel), await F.worldBox(appTake))
const reviewView = { x: boardBox.x - 10, y: boardBox.y - 10, w: boardBox.w + (PHONE ? 20 : 300), h: 250 }
F.cameraTo(frameOn(reviewView, { pad: 1.12, minW: PHONE ? 0 : 1100 }), 1.2)
const appBox = await F.worldBox(appTake)
await F.moveTo({ x: appBox.x + 110, y: appBox.y + 90 }, 1.2, { kind: "pointer" })
await F.wait(0.5)
await F.click()
await F.wait(0.4)
const useApp = canvas.locator('[data-testid="explore-inspector-use"]')
await settleOn(useApp)
const useBox = await F.worldBox(useApp)
F.cameraTo(frameOn(union(await F.worldBox(canvas.locator('[data-testid="explore-inspector"]')), useBox, appBox), { pad: 1.08, minW: PHONE ? 0 : 1100 }), 1.2)
await F.moveTo(centre(useBox), 1.2)
await F.wait(2.2)
F.hideCaption()
await F.wait(0.3)

// ---------------------------------------------------------------- 7. end card
F.card("end", "A design layer that lives in your repo.", { fade: 0.35 })
await F.wait(3.4)

console.log("\nerrors:", F.errors.slice(0, 5))
await F.close()
execFileSync(path.join(here, "reset-project.sh"))
