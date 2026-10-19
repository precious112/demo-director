/**
 * Harbor walkthrough — the worked example for demo-director's walkthrough mode.
 *
 *   node skills/demo-director/assets/examples/walkthrough/film.mjs phone preview
 *   node skills/demo-director/assets/examples/walkthrough/film.mjs phone final
 *   node skills/demo-director/assets/examples/walkthrough/film.mjs wide final
 *
 * The stage is the skill's shell (../../stage) around Harbor (world.html).
 * The script below is the whole film: camera, cursor, typing, captions. Read it
 * with references/storyboard.md and references/camera.md open.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"

import { film, ease } from "../../../scripts/engine.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "../..") // the assets folder, served at http://film.local/
const [format = "phone", mode = "preview", untilArg] = process.argv.slice(2)
const final = mode === "final"

const F = await film({
  format,
  preview: !final,
  scale: final ? Number(process.env.SCALE || 2) : 1,
  root,
  stage: "examples/walkthrough/index.html",
  out: path.join(here, `renders/harbor-${format}.mp4`),
  stills: path.join(here, `renders/${mode}-stills-${format}`),
  stillEvery: final ? 1 : 0.5,
  until: untilArg ? Number(untilArg) : Infinity,
  camera: { cx: 760, cy: 420, w: 1500 },
  cursor: { x: 980, y: 640, kind: "arrow", visible: true },
})
const { page } = F
const PHONE = format !== "wide"

/**
 * Frame a world box in the area below the caption band, never wider than `maxW`.
 * The band is reserved screen space so captions never sit on UI the viewer must read.
 */
const CAP_BAND = PHONE ? 260 : 0
const READ = PHONE ? 420 : 760 // the widest a framing may be and still read 13px UI on a phone
/**
 * `inside` keeps the frame within one panel of the app (no slice of the next
 * panel at either edge): the frame is never wider than the panel, and its
 * centre is held so both edges stay on the panel.
 */
function frameOn(box, { pad = 1.14, maxW = READ, band = true, inside = null } = {}) {
  const usable = F.F.h - (band ? CAP_BAND : 0)
  const fit = F.F.w / usable // world units of height per world unit of width
  let w = Math.max(box.w * pad, box.h * pad * fit)
  w = Math.min(w, maxW, inside ? inside.w : Infinity)
  const s = F.F.w / w
  let cx = box.x + box.w / 2
  let cy = box.y + box.h / 2 - (band ? CAP_BAND / 2 : 0) / s
  if (inside) cx = Math.min(Math.max(cx, inside.x + w / 2), inside.x + inside.w - w / 2)
  // Never past the window's own top or bottom.
  const h = w * (F.F.h / F.F.w)
  const top = appBox.y - (band ? CAP_BAND / s : 0)
  cy = Math.min(Math.max(cy, top + h / 2), appBox.y + appBox.h - h / 2)
  return { cx, cy, w }
}
const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const union = (...boxes) => {
  const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y))
  const r = Math.max(...boxes.map((b) => b.x + b.w)), btm = Math.max(...boxes.map((b) => b.y + b.h))
  return { x, y, w: r - x, h: btm - y }
}
/** Camera and hand go to the same element together, then click it after a beat. */
async function goClick(locator, { dur = 1.0, hold = 0.28, pad = 1.14, inside = null } = {}) {
  const box = await F.worldBox(locator)
  F.cameraTo(frameOn(box, { pad, inside }), dur)
  await F.moveTo(centre(box), dur, { kind: "arrow" })
  await F.wait(hold)
  await F.click()
}

const appBox = await F.worldBox(page.locator(".app"))
const list = page.locator(".list")
const firstConv = page.locator('.conv[data-id="4821"]')
const lastMsg = page.locator(".messages .msg:last-child")

/** The list column is the film's home framing: one column, cropped and readable. */
const listBox = await F.worldBox(list)
const threadPanel = await F.worldBox(page.locator(".thread"))
const home = frameOn({ x: listBox.x, y: 0, w: listBox.w, h: 430 }, { pad: 1.0, inside: listBox })

// ------------------------------------------------------------------ 1. open on the queue
F.cameraTo(home, 0)
F.setCursor({ x: listBox.x + listBox.w * 0.5, y: 520, visible: true })
await F.wait(0.3)
F.caption("Every customer question, in one queue.", { scrim: true })
await F.wait(3.0)
F.hideCaption()
await F.wait(0.3)

// ------------------------------------------------------------------ 2. open one conversation
await goClick(firstConv, { dur: 0.9, pad: 1.1, inside: listBox })
await F.wait(0.5) // the app's own loading state, held long enough to see
// A vertical slice through the thread: header, message and note fill the frame.
const threadBox = await F.worldBox(page.locator(".thread-body"))
F.cameraTo(frameOn({ x: threadBox.x, y: 258, w: 430, h: 520 }, { pad: 1.0, inside: threadPanel }), 1.0)
F.caption("Open one and the whole history is there.", { scrim: true })
await F.wait(2.2)
F.hideCaption()
await F.wait(0.3)

// ------------------------------------------------------------------ 3. write and send a reply
const composerText = page.locator(".composer-text")
const cBox = await F.worldBox(composerText)
const clickPt = { x: cBox.x + 34, y: cBox.y + cBox.h * 0.32 }
// Include the message above the box, so the reply has context and the frame is full.
F.cameraTo(frameOn({ x: cBox.x, y: cBox.y - 380, w: READ, h: 450 }, { pad: 1.0, inside: threadPanel }), 1.0)
await F.wait(0.6)
await F.moveTo(clickPt, 0.7, { kind: "ibeam" })
await F.wait(0.2)
await F.click()
await F.wait(0.35)
await F.type("Sorted — a replacement ships today.", 42)
await F.wait(0.4)

// Then pull back far enough to reach Send, and take the hand to it.
const sendBox = await F.worldBox(page.locator(".send-btn"))
F.cameraTo(frameOn(union(cBox, sendBox), { pad: 1.06, maxW: Infinity, inside: threadPanel }), 1.0)
await F.moveTo(centre(sendBox), 1.0, { kind: "pointer" })
await F.wait(0.55) // hold on the written reply and the button before pressing it
await F.click()
await F.wait(0.7)

// ------------------------------------------------------------------ 4. the state changes by itself
// Frame the reply and the toast together, so the confirmation is never half-cut.
const lastBox = await F.worldBox(lastMsg)
const toastBox = await F.worldBox(page.locator(".toast"))
F.cameraTo(frameOn(union(lastBox, toastBox), { pad: 1.06, maxW: Infinity, inside: threadPanel }), 1.0)
await F.setCursor({ kind: "arrow" })
F.caption("Harbor tracks the state for you.", { scrim: true })
await F.wait(3.2)
F.hideCaption()
await F.wait(0.3)

// ------------------------------------------------------------------ 5. out
F.cameraTo(home, 1.2, ease.smooth)
F.caption("One queue. Nothing slips.", { scrim: true })
await F.wait(2.4)
F.hideCaption()
await F.wait(0.4)

F.card({ kind: "end", title: "Harbor", sub: "Every customer question, in one queue." }, { fade: 0.25 })
await F.wait(3.0)

await F.close()
if (F.errors.length) {
  console.error("page errors:\n" + [...new Set(F.errors)].join("\n"))
  process.exitCode = 1
}
