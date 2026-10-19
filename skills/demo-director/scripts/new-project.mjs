#!/usr/bin/env node
/**
 * Scaffold a film project: copy the stage shell and write the first files.
 *
 *   node scripts/new-project.mjs ./films/my-film "My film"
 *
 * Then edit stage/world.html and stage/world.css, write plan.json, build the
 * storyboard, and run film.mjs.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const shell = path.resolve(here, "../assets/stage")

const [dirArg, title = "New film"] = process.argv.slice(2)
if (!dirArg) {
  console.error("usage: new-project.mjs <dir> [title]")
  process.exit(2)
}
const dir = path.resolve(dirArg)
fs.mkdirSync(path.join(dir, "stage"), { recursive: true })
fs.mkdirSync(path.join(dir, "renders"), { recursive: true })

for (const f of fs.readdirSync(shell)) {
  fs.copyFileSync(path.join(shell, f), path.join(dir, "stage", f))
}
// Copy the tools in, so the project runs without knowing where the skill lives.
for (const [src, dest] of [
  ["engine.mjs", "render-kit.mjs"],
  ["build-storyboard.mjs", "storyboard.mjs"],
  ["check-copy.mjs", "check-copy.mjs"],
]) {
  fs.copyFileSync(path.join(here, src), path.join(dir, dest))
}
if (!fs.existsSync(path.join(dir, "stage", "world.html"))) {
  fs.writeFileSync(path.join(dir, "stage", "world.html"), `<!-- The product's screen, in world pixels. Replace this. -->\n<div class="screen">\n  <h1>${title}</h1>\n</div>\n`)
}
if (!fs.existsSync(path.join(dir, "stage", "world.css"))) {
  fs.writeFileSync(path.join(dir, "stage", "world.css"), `.screen { width: 1200px; height: 800px; display: grid; place-items: center; font-size: 14px; }\n`)
}
if (!fs.existsSync(path.join(dir, "stage", "world.js"))) {
  fs.writeFileSync(path.join(dir, "stage", "world.js"), `// The world's behaviour. Real clicks land on the real elements; timers run on\n// the engine's virtual clock, so states are exact and repeatable.\n`)
}

fs.writeFileSync(path.join(dir, "film.mjs"), `/** ${title} — see references/camera.md and the walkthrough example. */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { film, ease } from "./render-kit.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const [format = "phone", mode = "preview"] = process.argv.slice(2)
const final = mode === "final"

const F = await film({
  format,
  preview: !final,
  scale: final ? 2 : 1,
  root: here,
  stage: "stage/index.html",
  out: path.join(here, \`renders/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-\${format}.mp4\`),
  stills: path.join(here, \`renders/\${mode}-stills-\${format}\`),
  stillEvery: 0.5,
  camera: { cx: 600, cy: 400, w: 1200 },
})

const PHONE = format !== "wide"
const CAP_BAND = PHONE ? 210 : 0
const READ = PHONE ? 420 : 760
function frameOn(box, { pad = 1.14, minW = 0 } = {}) {
  const usable = F.F.h - CAP_BAND
  const fit = F.F.w / usable
  let w = Math.max(box.w * pad, box.h * pad * fit, minW)
  const s = F.F.w / w
  return { cx: box.x + box.w / 2, cy: box.y + box.h / 2 - (CAP_BAND / 2) / s, w }
}

// Beat 1 — TODO
await F.wait(0.3)
F.caption("Say what happens on screen.", { scrim: true })
await F.wait(2.6)
F.hideCaption()
await F.wait(0.4)

await F.close()
if (F.errors.length) { console.error(F.errors.join("\\n")); process.exitCode = 1 }
`)

fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
  name: path.basename(dir).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  private: true,
  type: "module",
  scripts: {
    preview: "node film.mjs phone preview",
    render: "node film.mjs phone final",
    storyboard: "node storyboard.mjs plan.json",
  },
  devDependencies: { playwright: "1.62.1" },
}, null, 2) + "\n")

console.log(`project ready: ${dir}`)
console.log("  1. npm install && npx playwright install chromium")
console.log("  2. edit stage/world.html and stage/world.css")
console.log("  3. write plan.json and run: node storyboard.mjs plan.json")
console.log("  4. run: node film.mjs phone preview")
