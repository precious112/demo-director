/**
 * code-slowmo promo — the worked example for demo-director's motion-design mode.
 *
 * The stage is self-contained: it sets window.DURATION and window.seek(t), and
 * draws every frame from t. Nothing animates on its own, so any frame renders the
 * same way every time. The engine only samples it — see mode: "timeline" in
 * references/rendering.md.
 *
 *   node film/render.mjs p            → 1080x1350 (4:5) master
 *   node film/render.mjs w            → 1920x1080 (16:9) master
 *   node film/render.mjs p preview    → stills only, fast
 */
import path from "node:path"
import { fileURLToPath } from "node:url"

import { film } from "../../../../scripts/engine.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const [fmt = "p", mode = "final"] = process.argv.slice(2)
const preview = mode === "preview"
const format = fmt === "w" ? "wide" : "phone"
const name = fmt === "w" ? "16x9" : "4x5"

const F = await film({
  mode: "timeline",
  format,
  preview,
  scale: preview ? 1 : Number(process.env.SCALE || 2),
  root: here,
  url: `http://film.local/stage.html?f=${fmt}`,
  out: path.join(here, `../renders/code-slowmo-promo-${name}.mp4`),
  stills: path.join(here, `../renders/${mode}-stills-${name}`),
  stillEvery: 0.5,
})

console.log(`\n${name}: ${F.duration.toFixed(1)}s`)
await F.close()
if (F.errors.length) {
  console.error("page errors:\n" + [...new Set(F.errors)].join("\n"))
  process.exitCode = 1
}
