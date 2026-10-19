#!/usr/bin/env node
/**
 * Tile a folder of stills into one image, for a fast frame review.
 *
 *   node scripts/contact-sheet.mjs renders/preview-stills-phone [sheet.jpg] [--cols 6]
 *
 * Needs ffmpeg. Reads every .png/.jpg in the folder in name order, so the engine's
 * zero-padded `t012.50.png` names line up with time.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const args = process.argv.slice(2)
const dir = args[0]
if (!dir || dir.startsWith("--")) {
  console.error("usage: contact-sheet.mjs <stills-dir> [out.jpg] [--cols N]")
  process.exit(2)
}
let outArg = ""
let cols = 0
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--cols") { cols = Number(args[++i]); continue }
  if (args[i].startsWith("--")) continue
  outArg = args[i]
}

const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort()
if (!files.length) {
  console.error(`no stills in ${dir}`)
  process.exit(1)
}
const count = files.length
const columns = cols || Math.ceil(Math.sqrt(count))
const rows = Math.ceil(count / columns)
const out = outArg || path.join(dir, "contact-sheet.jpg")

// ffmpeg's glob input wants a pattern; a symlink-free copy is not needed for glob.
const pattern = path.join(path.resolve(dir), "*.png")
execFileSync("ffmpeg", [
  "-y", "-loglevel", "error",
  "-pattern_type", "glob", "-i", pattern,
  "-vf", `scale=340:-1,tile=${columns}x${rows}:padding=6:color=0x111111`,
  "-frames:v", "1", "-q:v", "3", out,
])
console.log(`contact sheet: ${out} (${count} stills, ${columns}×${rows})`)
