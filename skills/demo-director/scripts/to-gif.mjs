#!/usr/bin/env node
/**
 * Make a GIF from a rendered film, for a README or a post that only takes images.
 *
 *   node scripts/to-gif.mjs renders/harbor-phone.mp4 renders/harbor.gif --from 3 --to 11 --fps 16 --width 900
 *
 * Two-pass palette so the GIF does not band. Needs ffmpeg.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const [input, output, ...rest] = process.argv.slice(2)
if (!input || !output) {
  console.error("usage: to-gif.mjs <in.mp4> <out.gif> [--from s] [--to s] [--fps n] [--width px]")
  process.exit(2)
}
const arg = (k, d) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : d }
const from = arg("from", "0")
const to = arg("to", "")
const fps = arg("fps", "16")
const width = arg("width", "900")

fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true })
const trim = to ? `trim=start=${from}:end=${to},setpts=PTS-STARTPTS,` : (from !== "0" ? `trim=start=${from},setpts=PTS-STARTPTS,` : "")
const scale = `fps=${fps},scale=${width}:-1:flags=lanczos`
const palette = `/tmp/demo-director-palette.png`

execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-vf", `${trim}${scale},palettegen=stats_mode=diff`, palette])
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-i", palette,
  "-lavfi", `${trim}${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`, output])
fs.rmSync(palette, { force: true })
const kb = Math.round(fs.statSync(output).size / 1024)
console.log(`gif: ${output} (${kb} KB)`)
