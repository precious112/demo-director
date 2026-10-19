/**
 * Film 3 — Edit where you see it.
 *
 *   node render/film3.mjs phone preview | phone final | desk final
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { helpers } from "./common.mjs"
import { film } from "./film-kit.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const project = path.join(here, "../project/vahl/.caret")
const [format = "phone", mode = "preview", untilArg] = process.argv.slice(2)
const final = mode === "final"
execFileSync(path.join(here, "reset-project.sh"))

const F = await film({
	format,
	preview: !final,
	scale: final ? 2 : Number(process.env.SCALE ?? 1),
	out: path.join(here, `../renders/film3-${format}.mp4`),
	stills: path.join(here, `../renders/film3-${format}-${final ? "final" : "preview"}-stills`),
	stillEvery: final ? 1 : 0.5,
	until: untilArg ? Number(untilArg) : Infinity,
})
const { page } = F
const H = helpers(F, { deskMinW: 1150 })
const { PHONE, READ, frameOn, union, centre, pump, settleOn, nearest, landWrites, armSelection, scrollFocusedTo, hostMessage, toCanvas } = H
const PATH = "/Users/ingrid/vahl"

const canvas = page.frameLocator("#canvas-view")
const focused = canvas.frameLocator("iframe.caret-focused-iframe")
const chrome = page.locator("#caret-window")
const tid = (id) => chrome.locator(`[data-testid="${id}"]`)
const card = (title) => canvas.locator(".caret-canvas-frame", { hasText: title }).first()
const focusedFrame = () => page.frames().find((f) => f.url().includes("mode=focused"))
const settleGrid = async () => {
	await F.settle(async () => (await canvas.locator(".caret-canvas-frame-title").count().catch(() => 0)) >= 7, { maxMs: 60000, step: 16 })
	await pump(20, 4)
}

// ---------------------------------------------------------------- the main process, scripted

const SKILLS = [
	{ id: "frontend-design", name: "Frontend Design", by: "Anthropic", does: "Pushes away from the generic AI look: a clear visual direction, strong typography, deliberate layout.", licence: "Apache 2.0", installed: true, chosen: true },
	{ id: "impeccable", name: "Impeccable", by: "Paul Bakaus", does: "Builds on Frontend Design with detailed guides on type, colour, spacing, motion and interface writing.", licence: "Apache 2.0", installed: false, chosen: false },
	{ id: "taste-skill", name: "Design Taste", by: "Leonxlnx", does: "Bans common AI design giveaways and lets you dial variety, motion and density. Best for landing pages.", licence: "MIT", installed: false, chosen: false },
	{ id: "emil-design-eng", name: "Design Engineering", by: "Emil Kowalski", does: "The small details that make an interface feel finished: motion, transitions and polish.", licence: "MIT", installed: false, chosen: false },
	{ id: "shadcn", name: "shadcn/ui", by: "shadcn", does: "How to use shadcn/ui well: its components, presets and registries.", licence: "MIT", installed: false, chosen: false },
	{ id: "web-design-guidelines", name: "Web Interface Guidelines", by: "Vercel", does: "Reviews interface code against Vercel's guidelines for accessibility, forms and interaction details.", licence: "Your own use", installed: false, chosen: false },
]
const skillsChanged = () => page.evaluate((p) => window.__stage.bridge.emit("skills:changed", p), PATH)
await F.route("skills:list", () => SKILLS.map((s) => ({ ...s })))
await F.route("skills:install", async (id) => {
	await new Promise((r) => setTimeout(r, 900))
	SKILLS.find((s) => s.id === id).installed = true
	return { ok: true }
})
await F.route("skills:choose", (_p, id) => {
	for (const s of SKILLS) s.chosen = s.id === id
	void skillsChanged()
	return { ok: true }
})
const LIBRARIES = [
	{ id: "shadcn", name: "shadcn registries", gives: "Components, blocks and templates from shadcn/ui, Magic UI, Aceternity's free items, Smooth UI and Kokonut UI", kind: "components", access: "none", installed: true, enabled: true, state: "ready" },
	{ id: "aceternity", name: "Aceternity UI", gives: "Animated components and blocks", kind: "components", access: "none", installed: true, enabled: true, state: "ready" },
	{ id: "lazyweb", name: "Lazyweb", gives: "Real marketing pages and app screens, with descriptions", kind: "inspiration", access: "free-token", installed: true, enabled: true, state: "ready" },
	{ id: "gummble", name: "Gummble", gives: "300,000+ screens, flows, microcopy and website sections", kind: "inspiration", access: "sign-in", installed: false, enabled: false, state: "off" },
	{ id: "twentyfirst", name: "21st.dev", gives: "12,000+ components, plus themes and templates", kind: "components", access: "key", installed: false, enabled: false, state: "off" },
]
await F.route("libraries:list", () => LIBRARIES.map((l) => ({ ...l })))

// ---------------------------------------------------------------- setup (not filmed)

// Experiment takes are copies of Home that the grid hides (variantOf). Created now so
// opening the exploration mid-film is a record change, not new routes reloading the canvas.
const TAKES = [
	{ id: "home--v1", src: "hero-v1.tsx", label: "Take 1", angle: "Restrained" },
	{ id: "home--v2", src: "hero-v3.tsx", label: "Take 2", angle: "Bolder" },
	{ id: "home--v3", src: "hero-v2.tsx", label: "Take 3", angle: "Structural" },
]
const HOME_SOURCE = fs.readFileSync(path.join(project, "pages/home/index.tsx"), "utf-8")
for (const t of TAKES) {
	const dir = path.join(project, "pages", t.id)
	fs.mkdirSync(dir, { recursive: true })
	fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ id: t.id, title: `Vahl — Home — ${t.label.toLowerCase()}`, type: "landing", states: ["default"], tags: ["marketing", "landing"], variantOf: "home" }, null, 2))
	fs.writeFileSync(path.join(dir, "index.tsx"), HOME_SOURCE)
}
await page.waitForTimeout(2500)
await page.frames().find((f) => f.url() === "http://localhost:5310/")?.evaluate(() => location.reload()).catch(() => {})
await page.waitForTimeout(1500)
await settleGrid()
const strandCard = await F.worldBox(card("Vahl — Strand"))

// ---------------------------------------------------------------- 1. open
F.cameraTo(frameOn(strandCard, { pad: 1.4 }), 0)
F.setCursor({ x: strandCard.x + strandCard.w * 0.85, y: strandCard.y + strandCard.h * 1.15, kind: "arrow", visible: true })
await F.wait(0.3)
F.caption("Change your pages by touching them.")
await F.moveTo({ x: strandCard.x + strandCard.w * 0.5, y: strandCard.y + strandCard.h * 0.55 }, 1.3, { kind: "pointer" })
await F.wait(1.2)
await F.click()
await settleOn(focused.locator("[data-caret-id=strand-name]"))
await pump(12, 4)
F.setCursor({ kind: "arrow" })
const strandTop = await F.worldBox(focused.locator("[data-caret-id=strand-name]"))
F.cameraTo(frameOn(strandTop, { pad: 1.2 }), 1.2)
await F.wait(1.6)
F.hideCaption()
await armSelection(focused)

// ---------------------------------------------------------------- 2. select and resize
const cockpit = focused.locator("[data-caret-id=detail-cockpit]")
const view = { x: 120, y: 160, w: 1360, h: 700 }
F.cameraTo(frameOn(view, { pad: 1.0 }), 1.0)
await scrollFocusedTo("detail-cockpit", { top: 150, seconds: 1.1 })
await pump(3, 16)
const cockpitBox = await F.worldBox(cockpit)
F.cameraTo(frameOn(cockpitBox, { pad: 1.12 }), 1.2)
await F.moveTo({ x: cockpitBox.x + cockpitBox.w * 0.45, y: cockpitBox.y + cockpitBox.h * 0.5 }, 1.2)
await F.wait(0.45)
await F.click()
const handle = focused.locator('#caret-resize-handles > div[data-axis="width"]')
await settleOn(handle)
// The property sidebar slides in (180ms) and narrows the page view; measure after it lands.
await F.wait(0.6)
const handleBox = await F.worldBox(handle)
if (process.env.DEBUG_RESIZE) {
	const ff = page.frames().find((f) => f.url().includes("mode=focused"))
	console.log("\n[handle]", JSON.stringify(await ff.evaluate(() => {
		const h = document.querySelector('#caret-resize-handles > div[data-axis="width"]')
		const r = h.getBoundingClientRect()
		const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
		return { r: r.toJSON(), top: top?.tagName + "#" + top?.id + "." + (top?.className?.toString?.() ?? "").slice(0, 40), isHandle: top === h, vw: innerWidth }
	})))
	const vp = F.toViewport(centre(handleBox)); console.log("[viewport pt]", JSON.stringify(vp), JSON.stringify(handleBox))
	await ff.evaluate(() => { window.__pd = []; for (const t of ["pointerdown", "pointermove", "pointerup", "lostpointercapture", "pointercancel"]) window.addEventListener(t, (e) => { if (t !== "pointermove" || window.__pd.filter((x) => x[0] === "pointermove").length < 4 || e.buttons) window.__pd.push([t, Math.round(e.clientX), e.buttons, e.target.tagName]) }, true); const po = window.parent.postMessage.bind(window.parent); window.parent.postMessage = (m, o) => { window.__pd.push(["post", m?.type]); return po(m, o) } })
	for (const fr of [page.mainFrame(), page.frames().find((f) => f.url() === "http://localhost:5310/")]) await fr.evaluate(() => { window.__pd2 = []; for (const t of ["pointerdown", "pointerup", "mouseup"]) window.addEventListener(t, (e) => window.__pd2.push([t, e.target.tagName]), true) })
	globalThis.__dumpPd2 = async () => { for (const fr of [page.mainFrame(), page.frames().find((f) => f.url() === "http://localhost:5310/")]) console.log("[outer]", fr.url().slice(0, 40), JSON.stringify(await fr.evaluate(() => window.__pd2))) }
	globalThis.__dumpPd = async () => console.log("[pointerdowns]", JSON.stringify(await ff.evaluate(() => window.__pd)))
}
const inspector = canvas.locator("#caret-inspector")
F.caption("Drag an edge. The new width is written to the page.")
const rightCol = await F.worldBox(focused.locator("[data-caret-id=detail-disc]"))
F.cameraTo(frameOn(union(await F.worldBox(cockpit), handleBox, rightCol), { pad: 1.06 }), 1.0)
await F.moveTo(centre(handleBox), 1.1)
F.setCursor({ kind: "arrow" })
await F.wait(0.4)
await page.evaluate(() => window.__stage.hostConfig.patches.push({ file: ".caret/pages/strand/index.tsx", find: "aspect-[4/3] w-[760px] object-cover", replace: "aspect-[4/3] w-[940px] object-cover" }))
await F.mouseDown()
await F.moveTo({ x: handleBox.x + handleBox.w / 2 + 180, y: handleBox.y + handleBox.h / 2 }, 1.2, { arc: 0 })
await F.wait(0.25)
await F.mouseUp()
// The release does not reach a nested frame after a captured press under automation; deliver it where a hand would.
await focusedFrame().evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, isPrimary: true })))
if (process.env.DEBUG_RESIZE) {
	await F.wait(0.5)
	if (globalThis.__dumpPd) { await globalThis.__dumpPd(); await globalThis.__dumpPd2() }
	console.log("\n[hostLog]", JSON.stringify(await page.evaluate(() => window.__stage.hostLog.map((m) => m.type))))
	console.log("[canvas log]", JSON.stringify(await page.evaluate(() => window.__stage.hostLog.slice(-3))).slice(0, 600))
}
const commit = await hostMessage("resize-commit")
if (commit.payload.px !== 940) console.log("\n[warn] resize committed", commit.payload.px)
await landWrites()
await F.wait(0.9)
const verify = focused.locator("text=/Width \\d+px ✓/").first()
await settleOn(verify)
const verifyBox = await F.worldBox(verify)
F.cameraTo(frameOn(union(await F.worldBox(cockpit), await F.worldBox(focused.locator("[data-caret-id=detail-disc]"))), { pad: 1.06 }), 1.0)
await F.moveTo({ x: verifyBox.x + verifyBox.w * 0.6, y: verifyBox.y + verifyBox.h * 0.7 }, 1.0)
await F.wait(1.6)
F.hideCaption()
// Done with the element: Escape, as the panel's own hint says.
await F.key("Escape")
await F.wait(0.3)

// ---------------------------------------------------------------- 3. paint the part you mean
const specs = focused.locator("[data-caret-id=specs-list]")
F.cameraTo(frameOn(view, { pad: 1.0 }), 1.0)
await scrollFocusedTo("specs-title", { top: 130, seconds: 1.1 })
await pump(3, 16)
const paintBtn = focused.locator('button[title="Paint to edit"]')
const paintBox = await F.worldBox(paintBtn)
F.cameraTo(frameOn({ x: paintBox.x - 20, y: paintBox.y - 20, w: 220, h: 120 }, { pad: 1.2, minW: READ }), 1.1)
await F.moveTo(centre(paintBox), 1.1)
await F.wait(0.35)
await F.click()
await F.wait(0.3)
const specsBox = await F.worldBox(specs)
F.cameraTo(frameOn(specsBox, { pad: 1.12 }), 1.2)
await F.moveTo({ x: specsBox.x - 14, y: specsBox.y - 14 }, 1.2, { kind: "crosshair" })
F.setCursor({ kind: "crosshair" })
await F.wait(0.3)
await F.mouseDown()
await F.moveTo({ x: specsBox.x + specsBox.w + 14, y: specsBox.y + specsBox.h + 14 }, 1.1, { arc: 0.02 })
await F.mouseUp()
await F.wait(0.4)
F.caption("Paint the part you mean. Say what you want.")
const paintInput = focused.locator('input[placeholder="Describe the change, @ for an asset"]')
await settleOn(paintInput)
const inputBox = await F.worldBox(paintInput)
F.cameraTo(frameOn({ x: inputBox.x - 30, y: inputBox.y - 60, w: inputBox.w + 60, h: 120 }, { pad: 1.15, minW: READ }), 1.0)
F.setCursor({ kind: "text" })
await F.wait(0.5)
await F.type("Make the specs a two-column table", 52, 2)
await F.wait(0.4)
await F.key("Enter")
F.setCursor({ kind: "arrow" })
await hostMessage("overlay-edit")
F.cameraTo(frameOn(specsBox, { pad: 1.14 }), 1.2)
await F.moveTo({ x: specsBox.x + specsBox.w * 0.9, y: specsBox.y - 40 }, 1.2)
await toCanvas("edit-status", { phase: "working", instruction: "Make the specs a two-column table", detail: "Editing pages/strand/index.tsx" })
await F.wait(2.0)
await page.evaluate(() => window.__stage.writeFile({ patch: {
	file: ".caret/pages/strand/index.tsx",
	find: 'className="col-span-7 col-start-6 border-t border-neutral-300"',
	replace: 'className="col-span-8 col-start-5 grid grid-cols-2 gap-x-10 border-t border-neutral-300"',
} }))
await landWrites()
await toCanvas("edit-status", { phase: "done" })
await toCanvas("edit-result", { success: true, kind: "agent" })
await F.wait(0.3)
const specs2 = await F.worldBox(specs)
F.cameraTo(frameOn(union(specs2, await F.worldBox(focused.locator("[data-caret-id=specs-title]"))), { pad: 1.08 }), 1.1)
await F.moveTo({ x: specs2.x + specs2.w * 0.5, y: specs2.y + specs2.h + 40 }, 1.1)
await F.wait(2.0)
F.hideCaption()

// ---------------------------------------------------------------- 4. three takes at once
const back = canvas.locator('button[title="Back to canvas"]')
const backBox = await F.worldBox(back)
F.cameraTo(frameOn(backBox, { pad: 1.2, minW: PHONE ? 600 : 1300 }), 1.1)
await F.moveTo(centre(backBox), 1.1)
await F.wait(0.3)
await F.click()
await settleGrid()
const homeCard = await F.worldBox(card("Vahl — Home"))
F.cameraTo(frameOn(homeCard, { pad: 1.45 }), 1.2)
await F.moveTo({ x: homeCard.x + homeCard.w * 0.5, y: homeCard.y + homeCard.h * 0.55 }, 1.2, { kind: "pointer" })
await F.wait(0.4)
await F.click()
await settleOn(focused.locator("[data-caret-id=hero-title]"))
await pump(10, 4)
F.setCursor({ kind: "arrow" })
const experiment = canvas.locator('[data-testid="explore-enter-focused"]')
const expBox = await F.worldBox(experiment)
F.cameraTo(frameOn(expBox, { pad: 1.2, minW: PHONE ? 600 : 1300 }), 1.2)
await F.moveTo(centre(expBox), 1.2)
await F.wait(0.35)
await F.click()
const instruction = canvas.locator('[data-testid="explore-instruction"]')
await settleOn(instruction)
await pump(4, 16)
const startCard = await F.worldBox(canvas.locator('[data-testid="explore-start-page"]'))
F.cameraTo(frameOn(startCard, { pad: 1.12, minW: READ }), 1.1)
await F.moveTo(await F.worldOf(instruction, { x: 0.3, y: 0.5 }), 1.0, { kind: "text" })
F.setCursor({ kind: "text" })
await F.wait(0.3)
await F.type("a darker hero that leads with the bike", 50, 8)
await F.wait(0.35)
F.setCursor({ kind: "arrow" })
const go = canvas.locator('[data-testid="explore-start-page-go"]')
await F.moveTo(await F.worldOf(go), 0.7)
await F.wait(0.25)
await F.click()
await hostMessage("variant-request")
// What Caret's host writes: three take pages copied from home, and the exploration record.
const startedAt = new Date(await page.evaluate(() => Date.now())).toISOString()
const takes = TAKES
const homeSource = HOME_SOURCE
const heroStart = homeSource.indexOf('\t\t\t<section className="relative h-[920px] overflow-hidden bg-neutral-950">')
const heroEnd = homeSource.indexOf('\t\t\t<section className="bg-neutral-950 text-neutral-50">')
const INSTRUCTION = "a darker hero that leads with the bike"
const exploration = (statuses) => JSON.stringify({
	version: 2, mode: "page", pageId: "home", instruction: INSTRUCTION, startedAt, source: "caret", nextTake: 4,
	nodes: takes.map((t, i) => ({ id: t.id, parentId: "home", instruction: INSTRUCTION, angle: ["restrained", "bolder", "structural"][i], angleLabel: t.angle, label: t.label, status: statuses[i], startedAt, round: "r1" })),
}, null, 2)
fs.writeFileSync(path.join(project, ".variants.json"), exploration(["working", "working", "working"]))
await page.evaluate((p) => window.__stage.bridge.emit("explore:open-changed", p, true), PATH)
await landWrites()
F.caption("Three takes at once. Keep the one you like.")
const boardEl = canvas.locator('[data-testid="explore-board"]')
await settleOn(boardEl)
const boardBox = await F.worldBox(boardEl)
const boardView = { x: boardBox.x, y: boardBox.y, w: PHONE ? 900 : boardBox.w, h: PHONE ? 760 : boardBox.h }
F.cameraTo(frameOn(boardView, { pad: 1.02 }), 1.2)
await F.moveTo({ x: boardBox.x + 700, y: boardBox.y + 120 }, 1.2)
await F.wait(1.0)
const statuses = ["working", "working", "working"]
for (const [i, t] of takes.entries()) {
	const file = path.join(project, "pages", t.id, "index.tsx")
	fs.writeFileSync(file, homeSource.slice(0, heroStart) + fs.readFileSync(path.join(here, "assets/film3", t.src), "utf-8") + homeSource.slice(heroEnd))
	statuses[i] = "ready"
	fs.writeFileSync(path.join(project, ".variants.json"), exploration(statuses))
	await landWrites()
	await F.wait(0.9)
}
await F.wait(0.6)
const take2 = canvas.locator("text=Bolder").first()
const take2Box = await F.worldBox(take2)
await F.moveTo({ x: take2Box.x + 80, y: take2Box.y + 80 }, 1.0, { kind: "pointer" })
await F.wait(0.4)
await F.click()
await F.wait(0.4)
const useThis = canvas.locator('[data-testid="explore-inspector-use"]')
await settleOn(useThis)
const useBox = await F.worldBox(useThis)
F.cameraTo(frameOn(union(useBox, await F.worldBox(canvas.locator('[data-testid="explore-inspector-preview"]'))), { pad: 1.15, minW: READ }), 1.2)
await F.moveTo(centre(useBox), 1.2, { kind: "arrow" })
F.setCursor({ kind: "arrow" })
await F.wait(0.6)
await F.click()
await hostMessage("variant-pick")
// The host settles it: the take becomes the page, the scratch goes.
fs.writeFileSync(path.join(project, "pages/home/index.tsx"), fs.readFileSync(path.join(project, "pages/home--v2/index.tsx"), "utf-8"))
fs.rmSync(path.join(project, ".variants.json"), { force: true })
// (The take pages stay on disk until the reset: deleting routes mid-film reloads the canvas.)
await page.evaluate((p) => window.__stage.bridge.emit("explore:open-changed", p, false), PATH)
await toCanvas("edit-result", { success: true })
await landWrites()
await settleOn(focused.locator("[data-caret-id=hero-wordmark]"))
await pump(6, 16)
const newHero = await F.worldBox(focused.locator("[data-caret-id=hero-photo]"))
const word = await F.worldBox(focused.locator("[data-caret-id=hero-wordmark]"))
F.cameraTo(frameOn({ x: word.x, y: word.y - 40, w: Math.min(word.w, 1300), h: newHero.y + Math.min(newHero.h, 420) - word.y + 40 }, { pad: 1.1, band: false }), 1.2)
await F.moveTo({ x: word.x + word.w * 0.6, y: word.y + word.h * 0.9 }, 1.2)
await F.wait(2.0)
F.hideCaption()

// ---------------------------------------------------------------- 5. a design skill
const skillsBtn = chrome.locator("button", { hasText: "Skills" }).first()
const skillsBtnBox = await F.worldBox(skillsBtn)
F.cameraTo(frameOn(skillsBtnBox, { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.1)
await F.moveTo(centre(skillsBtnBox), 1.1)
await F.wait(0.3)
await F.click()
await settleOn(chrome.locator("text=Design Engineering").first())
await pump(4, 16)
const engCard = chrome.locator("div.rounded-xl", { hasText: "Emil Kowalski" }).last()
const engBox = await F.worldBox(engCard)
const install = engCard.locator('[data-testid="skill-install"]')
F.caption("Choose the design skill your AI follows.")
F.cameraTo(frameOn(engBox, { pad: 1.25, minW: READ }), 1.2)
await F.moveTo({ x: engBox.x + engBox.w * 0.4, y: engBox.y + engBox.h * 0.35 }, 1.2)
await F.wait(1.1)
await F.moveTo(await F.worldOf(install), 0.8)
await F.wait(0.3)
await F.click()
await settleOn(engCard.locator("text=Installed"))
await F.wait(0.7)
const installedTab = tid("catalog-tab-installed")
F.cameraTo(frameOn(await F.worldBox(installedTab), { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.0)
await F.moveTo(await F.worldOf(installedTab), 1.0)
await F.wait(0.3)
await F.click()
const engRow = tid("skill-row").filter({ hasText: "Design Engineering" })
await settleOn(engRow)
const engRowBox = await F.worldBox(engRow)
F.cameraTo(frameOn(union(engRowBox, await F.worldBox(tid("skill-row").first())), { pad: 1.15, minW: READ }), 1.0)
await F.moveTo(await F.worldOf(engRow.locator('[data-testid="skill-choose"]')), 1.0)
await F.wait(0.3)
await F.click()
await F.wait(0.6)
const chatBtn = chrome.locator("button", { hasText: "Chat" }).first()
const chatBtnBox = await F.worldBox(chatBtn)
F.cameraTo(frameOn(chatBtnBox, { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.1)
await F.moveTo(centre(chatBtnBox), 1.1)
await F.wait(0.3)
await F.click()
const chip = chrome.locator("aside").locator("text=Skill: Design Engineering")
await settleOn(chip)
const chipBox = await F.worldBox(chip)
F.cameraTo(frameOn({ x: chipBox.x - 40, y: chipBox.y - 140, w: 380, h: 200 }, { pad: 1.1, minW: READ }), 1.1)
await F.moveTo({ x: chipBox.x + chipBox.w * 0.6, y: chipBox.y + chipBox.h * 0.7 }, 1.1)
await F.wait(1.8)
F.hideCaption()
F.cameraTo(frameOn(chatBtnBox, { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.0)
await F.moveTo(centre(chatBtnBox), 1.0)
await F.wait(0.3)
await F.click()

// ---------------------------------------------------------------- 6. libraries
const libBtn = chrome.locator("button", { hasText: "Libraries" }).first()
const libBtnBox = await F.worldBox(libBtn)
F.cameraTo(frameOn(libBtnBox, { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.0)
await F.moveTo(centre(libBtnBox), 1.0)
await F.wait(0.3)
await F.click()
await settleOn(chrome.locator("text=Aceternity UI").first())
const libCards = chrome.locator("div.rounded-xl", { hasText: "Aceternity UI" }).last()
const shadcnCard = chrome.locator("div.rounded-xl", { hasText: "shadcn registries" }).last()
const cardsBox = union(await F.worldBox(shadcnCard), await F.worldBox(libCards))
F.caption("Real component libraries your AI can search.")
F.cameraTo(frameOn(PHONE ? { x: cardsBox.x, y: cardsBox.y, w: Math.min(cardsBox.w, 470), h: cardsBox.h } : cardsBox, { pad: 1.1, minW: READ }), 1.2)
await F.moveTo(await F.worldOf(PHONE ? shadcnCard : libCards, { x: 0.55, y: 0.4 }), 1.2)
await F.wait(2.6)
F.hideCaption()
await F.wait(0.3)

// ---------------------------------------------------------------- 7. end card
F.card("end", "A design layer that lives in your repo.", { fade: 0.35 })
await F.wait(3.2)

console.log("\nerrors:", F.errors.slice(0, 5))
await F.close()
execFileSync(path.join(here, "reset-project.sh"))
