#!/usr/bin/env node
/**
 * Check the words a film puts on screen.
 *
 *   node scripts/check-copy.mjs caption "Your page designs live in your repo."
 *   node scripts/check-copy.mjs plan plan.json        # checks every caption in a plan
 *   node scripts/check-copy.mjs file captions.txt     # one caption per line
 *
 * Exit code 1 means an ERROR. Warnings do not fail the build, but read them:
 * they are the sentences a viewer notices are empty.
 */
import fs from "node:fs"

// Words that promise a feeling instead of naming what happens.
const BANNED = [
  "supercharge", "unleash", "unlock", "seamless", "seamlessly", "revolutionize", "revolutionise",
  "effortless", "effortlessly", "game-changer", "game changer", "next-level", "next level",
  "magical", "magic", "elevate", "empower", "streamline", "reimagine", "cutting-edge",
  "at the speed of thought", "say goodbye to", "the future of", "introducing", "meet ",
  "utilize", "leverage", "facilitate", "delve", "orchestrate", "robust", "under the hood",
  "it's worth noting", "note that", "in order to",
]
// Softeners and hedges that quietly weaken a caption.
const SOFT = ["simply", "just ", "basically", "essentially", "obviously", "clearly", "actually", "really "]

const lines = []
const topic = { kind: "string", value: "" }

const [, , cmd, ...rest] = process.argv
if (cmd === "plan") {
  const plan = JSON.parse(fs.readFileSync(rest[0], "utf-8"))
  for (const b of plan.beats || []) {
    for (const c of b.captions || []) lines.push({ text: c.text, where: `${b.title}` })
  }
} else if (cmd === "file") {
  for (const [i, line] of fs.readFileSync(rest[0], "utf-8").split("\n").entries()) {
    if (line.trim()) lines.push({ text: line.trim(), where: `line ${i + 1}` })
  }
} else if (cmd === "caption" && rest.length) {
  lines.push({ text: rest.join(" "), where: "input" })
} else {
  // A bare path or a missing subcommand used to be checked as caption text and
  // reported clean, which reads as a pass on a file nobody looked at.
  console.error('usage: check-copy.mjs caption "<text>" | plan plan.json | file captions.txt')
  process.exit(2)
}

const errors = []
const warns = []
const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length

for (const { text, where } of lines) {
  const lower = ` ${text.toLowerCase()} `
  for (const w of BANNED) if (lower.includes(` ${w}`)) errors.push(`${where}: banned word "${w.trim()}" — say what happens on screen instead`)
  for (const w of SOFT) if (lower.includes(` ${w}`)) warns.push(`${where}: softener "${w.trim()}" adds nothing ("${text}")`)
  const n = wordCount(text)
  if (n > 9) warns.push(`${where}: ${n} words — a caption reads best under 9 ("${text}")`)
  if (/[—–]/.test(text)) warns.push(`${where}: dash aside — usually a second sentence ("${text}")`)
  if (/^not\b[^.!?]*[.!?]\s+\S/i.test(text) || /^not\b.*\b(but|it'?s)\b/i.test(text)) warns.push(`${where}: "Not X. Y." setup — say Y directly`)
  if (text.trim().endsWith("?")) warns.push(`${where}: a question as a caption asks the viewer to do the work`)
  if (/\b\d+(\.\d+)?\s?(x\b|%)/i.test(text)) warns.push(`${where}: a number nobody measured ("${text}") — remove it or cite the source`)
  if (text.includes("✨") || /[\u{1F300}-\u{1FAFF}]/u.test(text)) warns.push(`${where}: emoji in on-screen copy`)
}

for (const w of warns) console.warn(`warn  ${w}`)
for (const e of errors) console.error(`ERROR ${e}`)
if (!errors.length && !warns.length) console.log(`ok — ${lines.length} caption${lines.length === 1 ? "" : "s"} clean`)
else console.log(`\n${errors.length} error(s), ${warns.length} warning(s) across ${lines.length} caption(s)`)
process.exit(errors.length ? 1 : 0)
