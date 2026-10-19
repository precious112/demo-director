/**
 * Film 2 — Pictures that belong.
 *
 *   node render/film2.mjs phone preview | phone final | desk final
 *
 * Generated photographs are curated stand-ins (render/assets/takes); every
 * state they pass through is the take board's own.
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
	out: path.join(here, `../renders/film2-${format}.mp4`),
	stills: path.join(here, `../renders/film2-${format}-${final ? "final" : "preview"}-stills`),
	stillEvery: final ? 1 : 0.5,
	until: untilArg ? Number(untilArg) : Infinity,
})
const { page } = F
const { PHONE, READ, frameOn, union, centre, pump, settleOn, nearest, landWrites, armSelection } = helpers(F, { deskMinW: 1150 })
const PATH = "/Users/ingrid/vahl"

const REQUEST = "a rider alone on a wet road in thick fog"
const BRIEF =
	"A lone road cyclist seen from behind on an empty, rain-wet road in thick fog, early morning. Cool fog-grey light and low contrast, the tarmac catching a sheen of rain. Muted greens and greys; no warm cast. The rider small, a third of the way into the frame, with open sky above for a headline. Eye level, 35 mm, natural grain."
const TAG = "fog-ride"

const canvas = page.frameLocator("#canvas-view")
const focused = canvas.frameLocator("iframe.caret-focused-iframe")
const chrome = page.locator("#caret-window")
const tid = (id) => chrome.locator(`[data-testid="${id}"]`)

// ---------------------------------------------------------------- the main process, scripted

const dataUrl = (name) => "data:image/jpeg;base64," + fs.readFileSync(path.join(here, "assets/takes", name)).toString("base64")
const board = {
	id: "board-1",
	version: 1,
	kind: "image",
	aspect: "3:2",
	surface: "#eef0ee",
	transparent: false,
	mode: "polish",
	yourWords: REQUEST,
	briefing: true,
	branches: [{ id: "b1", parentTakeId: null, label: "First takes", source: "brief", takeIds: ["t1", "t2", "t3", "t4"] }],
	takes: ["t1", "t2", "t3", "t4"].map((id, index) => ({ id, branchId: "b1", index, status: "waiting", width: 1500, height: 1000 })),
}
const PICTURES = { t1: "first-1", t2: "first-2", t3: "first-3", t4: "first-4", t5: "warm-1", t6: "warm-2" }
const snapshot = () => JSON.parse(JSON.stringify(board))
async function pushBoard() {
	board.version++
	await page.evaluate(([p, b]) => window.__stage.bridge.emit("generate:board", p, b), [PATH, snapshot()])
}
async function setTake(id, status) {
	const take = board.takes.find((t) => t.id === id)
	take.status = status
	if (status === "ready") take.preview = dataUrl(PICTURES[id] + "-preview.jpg")
	await pushBoard()
}

function assetList() {
	const index = JSON.parse(fs.readFileSync(path.join(project, "assets/index.json"), "utf-8"))
	return index.assets.map((a) => ({ ...a, url: "/caret-assets/" + a.file, posterUrl: null }))
}
await F.route("assets:list", () => assetList())
await F.route("generate:boardStart", () => snapshot())
await F.route("generate:boardBranch", (_path, takeId, change) => {
	board.branches.push({ id: "b2", parentTakeId: takeId, label: change.chips.map((c) => c.toLowerCase()).join(", ") || "a little different", strength: change.strength, source: "brief", takeIds: ["t5", "t6"] })
	board.takes.push({ id: "t5", branchId: "b2", index: 0, status: "waiting", width: 1500, height: 1000 }, { id: "t6", branchId: "b2", index: 1, status: "waiting", width: 1500, height: 1000 })
	board.version++
	return { ok: true, board: snapshot() }
})
await F.route("generate:boardSave", (_path, takeId, tag) => {
	fs.copyFileSync(path.join(here, "assets/takes", PICTURES[takeId] + ".jpg"), path.join(project, "assets", tag + ".jpg"))
	const indexPath = path.join(project, "assets/index.json")
	const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"))
	index.assets.unshift({
		tag, file: tag + ".jpg", kind: "image", mime: "image/jpeg", width: 1500, height: 1000,
		bytes: fs.statSync(path.join(project, "assets", tag + ".jpg")).size, hash: "sha256:film", alt: "A rider on a fog-bound road in warm early light",
		description: "A lone rider from behind on a wet road in fog, warm low sun breaking through", origin: "generated", addedAt: new Date().toISOString(),
	})
	fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
	board.takes.find((t) => t.id === takeId).savedAs = tag
	board.version++
	void page.evaluate(([p, b]) => window.__stage.bridge.emit("generate:board", p, b), [PATH, snapshot()])
	return { ok: true, tag }
})
await F.route("generate:boardPicture", (_path, takeId) => dataUrl(PICTURES[takeId] + ".jpg"))

// ---------------------------------------------------------------- setup (not filmed)

await F.settle(async () => (await canvas.locator(".caret-canvas-frame-title").count().catch(() => 0)) >= 7, { maxMs: 60000, step: 16 })
await pump(25, 4)
const card = (title) => canvas.locator(".caret-canvas-frame", { hasText: title }).first()
const journalCard = await F.worldBox(card("Vahl — Journal"))

// ---------------------------------------------------------------- 1. open on the page that needs a picture
F.cameraTo(frameOn(journalCard, { pad: 1.35 }), 0)
F.setCursor({ x: journalCard.x + journalCard.w * 0.8, y: journalCard.y + journalCard.h * 1.15, kind: "arrow", visible: true })
await F.wait(0.3)
F.caption("Make the pictures your pages need, inside Caret.")
await F.moveTo({ x: journalCard.x + journalCard.w * 0.3, y: journalCard.y + journalCard.h * 0.62 }, 1.4, { kind: "pointer" })
await F.wait(1.6)
F.hideCaption()

// ---------------------------------------------------------------- 2. assets → generate
const assetsBtn = chrome.locator("button", { hasText: "Assets" }).first()
const assetsBtnBox = await F.worldBox(assetsBtn)
F.cameraTo(frameOn(assetsBtnBox, { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.2)
await F.moveTo(centre(assetsBtnBox), 1.2, { kind: "arrow" })
F.setCursor({ kind: "arrow" })
await F.wait(0.3)
await F.click()
await settleOn(tid("asset-row"))
await pump(10, 4)
const assetsView = await F.worldBox(tid("assets-view"))
const generateBtn = tid("assets-generate")
const generateBox = await F.worldBox(generateBtn)
const row0 = await F.worldBox(tid("asset-row").nth(0))
F.cameraTo(frameOn(PHONE ? { x: generateBox.x + generateBox.w - 520, y: generateBox.y - 20, w: 540, h: 360 } : union(generateBox, row0), { pad: 1.1, minW: PHONE ? 600 : 1250 }), 1.2)
await F.moveTo({ x: generateBox.x - 160, y: generateBox.y + 150 }, 1.1)
await F.wait(0.7)
await F.moveTo(centre(generateBox), 0.8)
await F.wait(0.3)
await F.click()
const request = tid("generate-request")
await settleOn(request)
await pump(6, 4)

// ---------------------------------------------------------------- 3. say what it is
const askBox = await F.worldBox(tid("generate-ask"))
const requestBox = await F.worldBox(request)
F.cameraTo(frameOn({ x: askBox.x, y: askBox.y, w: askBox.w, h: requestBox.y + requestBox.h - askBox.y + 20 }, { pad: 1.1, minW: READ }), 1.2)
await F.moveTo({ x: requestBox.x + requestBox.w * 0.25, y: requestBox.y + requestBox.h * 0.35 }, 1.1, { kind: "text" })
F.setCursor({ kind: "text" })
await F.wait(0.2)
await F.click()
F.caption("Say what the picture is.")
await F.type(REQUEST, 52, 3)
await F.wait(0.5)
F.setCursor({ kind: "arrow" })
const help = tid("generate-help")
const helpBox = await F.worldBox(help)
const begin = tid("generate-begin")
const beginBox = await F.worldBox(begin)
F.cameraTo(frameOn(union(helpBox, beginBox), { pad: 1.1, minW: READ }), 1.2)
const polish = help.locator("button", { hasText: "Polish it" }).first()
await F.moveTo(await F.worldOf(polish, { x: 0.4, y: 0.5 }), 1.1, { kind: "pointer" })
await F.wait(1.3)
await F.moveTo(centre(beginBox), 0.9)
await F.wait(0.3)
await F.click()
F.hideCaption()
const promptText = tid("board-prompt-text")
await settleOn(promptText)
await pump(6, 4)

// ---------------------------------------------------------------- 4. the brief comes from the design system
const promptStrip = await F.worldBox(tid("board-prompt"))
const stripView = (b) => ({ x: b.x, y: b.y, w: PHONE ? 470 : b.w, h: b.h })
F.cameraTo(frameOn(stripView(promptStrip), { pad: 1.04, minW: PHONE ? 480 : 1300 }), 1.0)
F.setCursor({ kind: "arrow" })
await F.moveTo({ x: promptStrip.x + (PHONE ? 300 : promptStrip.w * 0.45), y: promptStrip.y + promptStrip.h + 60 }, 1.0)
await F.wait(1.1)
board.briefing = false
board.brief = BRIEF
await pushBoard()
await F.wait(0.25)
const strip2 = await F.worldBox(tid("board-prompt"))
F.cameraTo(frameOn(stripView(strip2), { pad: 1.04, minW: PHONE ? 480 : 1300 }), 0.9)
await F.moveTo({ x: strip2.x + (PHONE ? 300 : strip2.w * 0.42), y: strip2.y + strip2.h * 0.62 }, 1.0)
F.caption("Caret writes the brief from your design system.")
await F.wait(3.2)
F.hideCaption()

// ---------------------------------------------------------------- 5. takes land
for (const id of ["t1", "t2", "t3", "t4"]) board.takes.find((t) => t.id === id).status = "working"
await pushBoard()
await F.wait(0.1)
const takeEls = tid("board-take")
const column = union(await F.worldBox(takeEls.nth(0)), await F.worldBox(takeEls.nth(3)))
F.cameraTo(frameOn(column, { pad: 1.12 }), 1.3)
await F.moveTo({ x: column.x + column.w + 60, y: column.y + column.h * 0.3 }, 1.2)
await F.wait(0.6)
for (const id of ["t1", "t2", "t3", "t4"]) {
	await setTake(id, "ready")
	await F.wait(0.75)
}
await F.wait(0.8)

// ---------------------------------------------------------------- 6. change one, and it branches
const take2 = takeEls.nth(1)
const take2Box = await F.worldBox(take2)
await F.moveTo({ x: take2Box.x + take2Box.w * 0.5, y: take2Box.y + take2Box.h * 0.35 }, 0.9, { kind: "pointer" })
await F.wait(0.35)
await F.click()
await F.wait(0.3)
const inspector = tid("board-inspector")
const chip = inspector.locator('[data-testid="board-change-chip"]', { hasText: "Warmer light" })
const grow = tid("board-grow")
const controls = union(await F.worldBox(chip), await F.worldBox(grow), await F.worldBox(tid("board-inspector-title")))
F.cameraTo(frameOn(controls, { pad: 1.12, minW: READ }), 1.2)
await F.moveTo(await F.worldOf(chip), 1.1)
await F.wait(0.3)
await F.click()
await F.wait(0.4)
await F.moveTo(await F.worldOf(tid("board-strength-strong")), 0.7)
await F.wait(0.2)
await F.click()
await F.wait(0.6)
await F.moveTo(await F.worldOf(grow), 0.7)
await F.wait(0.25)
await F.click()
await settleOn(tid("board-branch").nth(1))
await pump(4, 4)
F.caption("Change one and it branches. Nothing is overwritten.")
const branchArea = union(take2Box, await F.worldBox(tid("board-branch").nth(1)))
F.cameraTo(frameOn(branchArea, { pad: 1.1 }), 1.3)
await F.moveTo({ x: take2Box.x + take2Box.w * 0.8, y: take2Box.y + take2Box.h * 0.5 }, 1.2, { kind: "arrow" })
F.setCursor({ kind: "arrow" })
await setTake("t5", "working")
await setTake("t6", "working")
await F.wait(1.2)
await setTake("t5", "ready")
const t5 = tid("board-take").nth(4)
await F.moveTo(await F.worldOf(t5, { x: 0.55, y: 0.45 }), 0.9)
await F.wait(0.7)
await setTake("t6", "ready")
await F.wait(1.8)
F.hideCaption()

// ---------------------------------------------------------------- 7. name it
const nameInput = tid("board-name")
const useBtn = tid("board-use")
const nameBox = union(await F.worldBox(nameInput), await F.worldBox(useBtn))
F.cameraTo(frameOn(nameBox, { pad: 1.25, minW: READ }), 1.2)
await F.moveTo(await F.worldOf(nameInput, { x: 0.6, y: 0.5 }), 1.1, { kind: "text" })
F.setCursor({ kind: "text" })
await F.wait(0.2)
await F.click({ count: 3 })
await F.wait(0.2)
await F.type(TAG, 70, 9)
await F.wait(0.35)
F.setCursor({ kind: "arrow" })
await F.moveTo(await F.worldOf(useBtn), 0.6)
await F.wait(0.25)
await F.click()
const savedNote = tid("board-saved-note")
await settleOn(savedNote)
await pump(4, 4)
F.cameraTo(frameOn(union(nameBox, await F.worldBox(savedNote)), { pad: 1.2, minW: READ }), 0.9)
await F.moveTo(await F.worldOf(savedNote, { x: 0.3, y: 0.6 }), 0.9)
F.caption("Saved by name. Type @fog-ride anywhere in Caret.")
await F.wait(2.6)
F.hideCaption()

// ---------------------------------------------------------------- 8. use it on the page
const done = tid("board-done")
await F.moveTo(await F.worldOf(done), 1.0)
F.cameraTo(frameOn(await F.worldBox(done), { pad: 1.3, minW: PHONE ? 560 : 1250 }), 1.0)
await F.wait(0.3)
await F.click()
await page.evaluate((p) => window.__stage.bridge.emit("assets:changed", p), PATH)
await F.settle(async () => (await tid("asset-row").count()) >= 9, { step: 16 })
await pump(6, 4)
const newRow = await F.worldBox(tid("asset-row").first())
F.cameraTo(frameOn(newRow, { pad: 1.15, minW: PHONE ? 600 : 1250 }), 1.1)
await F.moveTo({ x: newRow.x + newRow.w * 0.45, y: newRow.y + newRow.h * 0.3 }, 1.0)
await F.wait(1.4)
// Back to the canvas: the Assets button again.
const assetsBox2 = await F.worldBox(assetsBtn)
F.cameraTo(frameOn(assetsBox2, { pad: 1.2, minW: PHONE ? 560 : 1250 }), 1.1)
await F.moveTo(centre(assetsBox2), 1.1)
await F.wait(0.25)
await F.click()
await F.settle(async () => (await canvas.locator(".caret-canvas-frame-title").count().catch(() => 0)) >= 7, { step: 16 })
await pump(15, 4)
const journalCard2 = await F.worldBox(card("Vahl — Journal"))
F.cameraTo(frameOn(journalCard2, { pad: 1.45 }), 1.2)
await F.moveTo({ x: journalCard2.x + journalCard2.w * 0.35, y: journalCard2.y + journalCard2.h * 0.6 }, 1.2, { kind: "pointer" })
await F.wait(0.4)
await F.click()
const photo = focused.locator("[data-caret-id=feature-photo]")
await settleOn(photo)
await pump(12, 4)
F.setCursor({ kind: "arrow" })
const photoBox = await F.worldBox(photo)
const featureTitle = await F.worldBox(focused.locator("[data-caret-id=feature-title]"))
await F.wait(0.4)
await armSelection(focused)
F.cameraTo(frameOn(union(photoBox, featureTitle), { pad: 1.05 }), 1.3)
await F.moveTo({ x: photoBox.x + photoBox.w * 0.5, y: photoBox.y + photoBox.h * 0.45 }, 1.2)
await F.wait(0.6)
await F.click({ button: "right" })
await F.wait(0.45)
const aiEdit = await nearest(focused.locator("text=AI Edit"))
const menu = union(await F.worldBox(await nearest(focused.locator("text=Copy"))), await F.worldBox(await nearest(focused.locator("text=Replace image"))))
F.cameraTo(frameOn({ x: menu.x - 8, y: menu.y - 34, w: 130, h: menu.h + 50 }, { pad: 1.25, minW: READ }), 1.0)
await F.wait(1.0)
await F.moveTo(await F.worldOf(aiEdit), 0.7)
await F.wait(0.25)
await F.click()
await F.wait(0.4)
// react-grab's prompt input lives in its shadow root; type into it like a person.
const ff = page.frames().find((f) => f.url().includes("mode=focused"))
const inputBox = await ff.evaluate(() => {
	const host = [...document.querySelectorAll("[data-react-grab]")].find((h) => h.shadowRoot?.querySelector("textarea, input"))
	const el = host.shadowRoot.querySelector("textarea") || host.shadowRoot.querySelector("input")
	const r = el.getBoundingClientRect()
	return { x: r.left, y: r.top, w: r.width, h: r.height }
})
const frameOrigin = await F.worldBox(focused.locator("body"))
const promptWorld = { x: frameOrigin.x + inputBox.x, y: frameOrigin.y + inputBox.y, w: inputBox.w, h: inputBox.h }
F.cameraTo(frameOn({ x: promptWorld.x - 20, y: promptWorld.y - 40, w: Math.max(promptWorld.w, 260) + 40, h: 160 }, { pad: 1.15, minW: READ }), 1.0)
F.caption("Use it on the page by name.")
await F.type("Use @fog", 60, 4)
await F.wait(0.9)
await F.key("Enter")
await F.wait(0.3)
await F.type(" for this photo", 55, 6)
await F.wait(0.5)
await F.key("Enter")
await F.wait(0.3)
const pillCam = frameOn(union(photoBox, featureTitle), { pad: 1.05 })
F.cameraTo(pillCam, 1.2)
await F.moveTo({ x: photoBox.x + photoBox.w * 0.75, y: photoBox.y + photoBox.h * 0.3 }, 1.1)
await F.wait(1.3)
// The host's answer: the page file now points at the asset; the pill resolves.
await page.evaluate(async () => {
	await window.__stage.writeFile({ patch: {
		file: ".caret/pages/journal/index.tsx",
		find: 'src="/caret-assets/photos/dusk-silhouette.jpg"\n\t\t\t\t\talt="A rider beside a bike against a low sun"',
		replace: 'src="/caret-assets/fog-ride.jpg"\n\t\t\t\t\talt="A rider on a fog-bound road in warm early light"',
	} })
})
await landWrites()
await page.evaluate(() => {
	const c = document.getElementById("canvas-view").contentWindow
	c.postMessage({ source: "caret-host", type: "edit-status", payload: { phase: "done" } }, "*")
	c.postMessage({ source: "caret-host", type: "edit-result", payload: { success: true, kind: "agent" } }, "*")
})
await F.wait(2.6)
F.hideCaption()
await F.wait(0.3)

// ---------------------------------------------------------------- 9. end card
F.card("end", "A design layer that lives in your repo.", { fade: 0.35 })
await F.wait(3.2)

console.log("\nerrors:", F.errors.slice(0, 5))
await F.close()
execFileSync(path.join(here, "reset-project.sh"))
