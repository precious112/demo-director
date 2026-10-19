#!/usr/bin/env node
/**
 * Scaffold a film project: copy the stage shell and write the first files.
 *
 *   node scripts/new-project.mjs ./films/my-film "My film"
 *   node scripts/new-project.mjs ./films/my-film "My film" --track
 *
 * A film never bloats the product's repository. Inside a git work tree, the
 * film's top-level folder (e.g. films/) is added to the repo's .gitignore unless
 * it is already ignored; --track skips that, for teams who want the plan and the
 * script in git. Either way the film gets its own .gitignore for renders,
 * node_modules and video, so no master is ever committed by accident.
 *
 * Then edit stage/world.html and stage/world.css, write plan.json, build the
 * storyboard, and run film.mjs.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const shell = path.resolve(here, "../assets/stage")

const args = process.argv.slice(2)
const track = args.includes("--track")
const [dirArg, title = "New film"] = args.filter((a) => a !== "--track")
if (!dirArg) {
  console.error("usage: new-project.mjs <dir> [title] [--track]")
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

// Output never belongs in git, tracked film or not.
fs.writeFileSync(path.join(dir, ".gitignore"), "# Rendered output and dependencies: everything here re-renders from film.mjs.\nrenders/\nnode_modules/\n*.mp4\n*.mov\n*.webm\n*.gif\n")

/** The repo root, or null when the film is not inside a git work tree. */
function gitRoot(at) {
  try {
    return execFileSync("git", ["-C", at, "rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()
  } catch {
    return null
  }
}
function isIgnored(root, rel) {
  try {
    execFileSync("git", ["-C", root, "check-ignore", "-q", rel], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}
let gitNote = "not inside a git repository; nothing to ignore."
const root = gitRoot(dir)
if (root) {
  const rel = path.relative(fs.realpathSync(root), fs.realpathSync(dir))
  // Ignore the film's top-level folder (films/), so every later film is covered too.
  const top = rel.split(path.sep)[0]
  if (!rel || rel.startsWith("..")) {
    gitNote = "the film is the repository root; its own .gitignore keeps renders out."
  } else if (track) {
    gitNote = `--track: ${rel}/ stays in git; renders, node_modules and video are ignored by its own .gitignore.`
  } else if (isIgnored(root, top + "/")) {
    gitNote = `${top}/ is already ignored by git.`
  } else {
    const gi = path.join(root, ".gitignore")
    const before = fs.existsSync(gi) ? fs.readFileSync(gi, "utf-8") : ""
    const sep = !before ? "" : before.endsWith("\n") ? "\n" : "\n\n"
    fs.writeFileSync(gi, before + sep + `# Demo films (demo-director): re-render from their scripts; never commit them.\n/${top.split(path.sep).join("/")}/\n`)
    gitNote = `added /${top}/ to ${path.relative(process.cwd(), gi) || ".gitignore"}, so films never enter the repository.`
  }
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
const READ = PHONE ? 420 : 760 // the widest a framing may be and still read 13px UI on a phone
/**
 * Frame a world box below the caption band. \`inside\` keeps the frame within one
 * panel of the app, so no slice of the next panel shows at either edge.
 */
function frameOn(box, { pad = 1.14, maxW = READ, inside = null } = {}) {
  const usable = F.F.h - CAP_BAND
  const fit = F.F.w / usable
  let w = Math.min(Math.max(box.w * pad, box.h * pad * fit), maxW, inside ? inside.w : Infinity)
  const s = F.F.w / w
  let cx = box.x + box.w / 2
  if (inside) cx = Math.min(Math.max(cx, inside.x + w / 2), inside.x + inside.w - w / 2)
  return { cx, cy: box.y + box.h / 2 - (CAP_BAND / 2) / s, w }
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
console.log(`  git: ${gitNote}`)
console.log("  1. npm install && npx playwright install chromium")
console.log("  2. edit stage/world.html and stage/world.css")
console.log("  3. write plan.json and run: node storyboard.mjs plan.json")
console.log("  4. run: node film.mjs phone preview")
