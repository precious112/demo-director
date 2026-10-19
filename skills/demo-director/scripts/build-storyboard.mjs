#!/usr/bin/env node
/**
 * Build a storyboard page from a plan file. This is the plan-mode artifact: the
 * thing a person reviews before any frames are rendered.
 *
 *   node scripts/build-storyboard.mjs plan.json [storyboard.html]
 *
 * The plan is a small JSON file (see references/storyboard.md). The builder
 * checks it, draws a ruler, a strip of key frames per beat and the notes, and
 * writes one self-contained HTML file. Key frames may point at stills already
 * rendered; otherwise the builder draws a labelled placeholder in the film's
 * own colours.
 */
import fs from "node:fs"
import path from "node:path"

const [, , planPath, outArg] = process.argv
if (!planPath) {
  console.error("usage: build-storyboard.mjs plan.json [storyboard.html]")
  process.exit(2)
}

const plan = JSON.parse(fs.readFileSync(planPath, "utf-8"))
const outPath = outArg || path.join(path.dirname(planPath), "storyboard.html")
const baseDir = path.dirname(path.resolve(planPath))

const errors = []
const warn = []
const need = (cond, msg) => { if (!cond) errors.push(msg) }

need(plan.title, "plan.title is required")
need(plan.thesis, "plan.thesis is required (one sentence the film proves)")
need(Array.isArray(plan.beats) && plan.beats.length, "plan.beats must be a non-empty array")

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))
const mmss = (s) => {
  const t = Math.max(0, Number(s) || 0)
  return `${Math.floor(t / 60)}:${String((t % 60).toFixed(1)).padStart(4, "0")}`
}
const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length

// --- validate beats ---------------------------------------------------------
let cursor = 0
for (const [i, b] of (plan.beats || []).entries()) {
  const at = `beats[${i}]${b.title ? ` (${b.title})` : ""}`
  need(b.title, `${at}.title is required`)
  need(Number.isFinite(b.from), `${at}.from must be a number (seconds)`)
  if (Number.isFinite(b.from) && b.from < cursor - 1e-6) warn.push(`${at}: from ${b.from}s overlaps the previous beat`)
  if (Number.isFinite(b.from)) cursor = b.to ?? b.from
  need(Number.isFinite(b.to), `${at}.to must be a number (seconds)`)
  if (Number.isFinite(b.from) && Number.isFinite(b.to) && b.to <= b.from) errors.push(`${at}: to must be after from`)
  if (!b.action && !b.motion && !(b.keyframes || []).length) warn.push(`${at}: no action, motion or keyframes; almost nothing for a reviewer to approve`)
  for (const c of b.captions || []) {
    if (words(c.text) > 9) warn.push(`${at}: caption is ${words(c.text)} words ("${c.text}"); a caption reads best under 9`)
    if (Number.isFinite(c.from) && Number.isFinite(c.to) && c.to - c.from < 1) warn.push(`${at}: caption shown for under 1s ("${c.text}")`)
  }
}

const duration = plan.runtime || Math.max(...(plan.beats || []).map((b) => b.to || 0), 0)
const palette = {
  bg: "#0d0f13", panel: "#12161d", line: "#242c39", ink: "#e7ebf2", muted: "#8b95a7",
  accent: "#4f8cff", ...(plan.palette || {}),
}

function keyframe(f, b) {
  const src = f.img ? path.resolve(baseDir, f.img) : null
  const rel = src && fs.existsSync(src) ? path.relative(path.dirname(outPath), src) : null
  if (src && !rel) warn.push(`${b.title}: still not found at ${f.img}`)
  const frame = rel
    ? `<img src="${esc(rel)}" alt="">`
    : `<div class="ph">${esc(f.label || b.kind || "frame")}</div>`
  const cap = f.caption ? `<div class="kf-cap">${esc(f.caption)}</div>` : ""
  return `<figure class="kf"><div class="frame">${frame}${cap}</div><figcaption><b>${mmss(f.t)}</b>${esc(f.note || "")}</figcaption></figure>`
}

const beatHtml = (b, i) => `
  <section class="beat" id="b${i}">
    <div class="beat-head">
      <h2>${esc(b.title)}</h2>
      <span class="tc">${mmss(b.from)} – ${mmss(b.to)} · ${((b.to - b.from) || 0).toFixed(1)}s</span>
    </div>
    ${(b.keyframes || []).length ? `<div class="strip">${b.keyframes.map((f) => keyframe(f, b)).join("")}</div>` : ""}
    <div class="notes">
      <dl class="fields">
        ${b.action ? `<dt>Action</dt><dd>${esc(b.action)}</dd>` : ""}
        ${b.camera ? `<dt>Camera</dt><dd>${esc(b.camera)}</dd>` : ""}
        ${b.motion ? `<dt>Motion</dt><dd>${esc(b.motion)}</dd>` : ""}
        ${b.honesty ? `<dt>Honesty</dt><dd>${esc(b.honesty)}</dd>` : ""}
      </dl>
      ${(b.captions || []).length ? `<div class="caps"><span class="label">Captions on screen</span><ol>${
        b.captions.map((c) => `<li><span class="line">${esc(c.text)}</span><span class="meta">${mmss(c.from)} – ${mmss(c.to)}${c.draft ? " · DRAFT" : ""}</span></li>`).join("")
      }</ol></div>` : ""}
    </div>
  </section>`

const ruler = (plan.beats || []).map((b) => {
  const w = ((b.to - b.from) / duration) * 100
  return `<a href="#b${plan.beats.indexOf(b)}" class="seg k-${esc(b.kind || "beat")}" style="width:${w}%"><span>${esc(b.title)}</span></a>`
}).join("")

const questions = (plan.openQuestions || []).map((q) => `
  <div class="q"><h3>${esc(q.q)}</h3>${q.note ? `<p>${esc(q.note)}</p>` : ""}${q.pick ? `<p class="pick"><b>My pick:</b> ${esc(q.pick)}</p>` : ""}</div>`).join("")

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(plan.title)} — storyboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root { --bg:${palette.bg}; --panel:${palette.panel}; --line:${palette.line}; --ink:${palette.ink}; --muted:${palette.muted}; --accent:${palette.accent};
  --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; --mono: ui-monospace, "SF Mono", Menlo, monospace; color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans); font-size: 15px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 48px 20px 96px; }
h1 { font-size: clamp(28px, 4vw, 40px); line-height: 1.1; letter-spacing: -0.02em; margin: 0; text-wrap: balance; }
h2 { font-size: 18px; margin: 0; }
h3 { font-size: 15px; margin: 0; }
p { margin: 0; }
.label { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--muted); }
.lede { font-size: 17px; color: var(--muted); max-width: 74ch; }
header .thesis { font-size: 19px; }
.meta { display: flex; flex-wrap: wrap; gap: 6px 20px; color: var(--muted); font-size: 13px; }
.meta b { color: var(--ink); font-weight: 600; }
.stack { display: flex; flex-direction: column; gap: 12px; }
.block { margin-top: 56px; display: flex; flex-direction: column; gap: 16px; }
.ruler { display: flex; height: 34px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.ruler .seg { display: flex; align-items: center; justify-content: center; min-width: 0; background: var(--panel); color: var(--muted); text-decoration: none; border-right: 1px solid var(--bg); }
.ruler .seg span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 8px; font-size: 11px; }
.ruler .seg:hover { background: #1b212c; color: var(--ink); }
.k-intro { background: #1a2130; } .k-open { background: #16233a; } .k-action { background: #14251d; } .k-state { background: #241d0c; } .k-out { background: #201a2a; } .k-end { background: #241419; }
.beat { border-top: 1px solid var(--line); padding: 28px 0; display: flex; flex-direction: column; gap: 16px; }
.beat-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.tc { font-family: var(--mono); font-size: 12.5px; color: var(--accent); font-variant-numeric: tabular-nums; }
.strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.kf { margin: 0; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.frame { position: relative; aspect-ratio: 4 / 5; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; display: grid; place-items: center; }
.frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
.frame .ph { color: var(--muted); font-size: 12px; }
.frame .kf-cap { position: absolute; left: 8px; right: 8px; bottom: 8px; background: color-mix(in srgb, var(--bg) 86%, transparent); border-radius: 6px; padding: 3px 7px; font-size: 11.5px; }
.kf figcaption { font-size: 12px; color: var(--muted); display: flex; gap: 6px; }
.kf figcaption b { font-family: var(--mono); color: var(--ink); font-weight: 500; }
.notes { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 24px; }
.fields { display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 8px 14px; margin: 0; font-size: 14px; align-content: start; }
.fields dt { font-family: var(--mono); font-size: 11.5px; color: var(--muted); padding-top: 3px; }
.fields dd { margin: 0; }
.caps { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; align-self: start; }
.caps ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.caps .line { font-size: 17px; font-weight: 600; display: block; text-wrap: balance; }
.caps .meta { font-family: var(--mono); font-size: 11px; color: var(--muted); }
.qs { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.q { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
.q p { font-size: 13.5px; color: var(--muted); }
.q .pick b { color: var(--accent); }
@media (max-width: 820px) { .notes { grid-template-columns: minmax(0, 1fr); } }
</style>
</head>
<body>
<div class="wrap">
  <header class="stack">
    <span class="label">Storyboard · for review before any frames are rendered</span>
    <h1>${esc(plan.title)}</h1>
    <p class="lede thesis">${esc(plan.thesis)}</p>
    <div class="meta">
      ${plan.mode ? `<span>Mode&nbsp; <b>${esc(plan.mode)}</b></span>` : ""}
      ${plan.audience ? `<span>Audience&nbsp; <b>${esc(plan.audience)}</b></span>` : ""}
      <span>Runtime&nbsp; <b>${duration.toFixed(1)}s</b></span>
      ${(plan.formats || []).length ? `<span>Formats&nbsp; <b>${esc(plan.formats.join(", "))}</b></span>` : ""}
      ${plan.sound ? `<span>Sound&nbsp; <b>${esc(plan.sound)}</b></span>` : ""}
    </div>
    ${plan.note ? `<p class="lede">${esc(plan.note)}</p>` : ""}
  </header>

  <section class="block">
    <span class="label">The film at a glance · ${duration.toFixed(1)}s</span>
    <div class="ruler" role="img" aria-label="Timeline of ${plan.beats.length} beats">${ruler}</div>
  </section>

  ${(plan.beats || []).map(beatHtml).join("\n")}

  ${questions ? `<section class="block"><span class="label">Decisions I need from you</span><div class="qs">${questions}</div></section>` : ""}

  <section class="block">
    <span class="label">Before we build</span>
    <p class="lede">Reply with any changes, or say <b>go</b> to build it. If you would rather skip the review, say <b>build it anyway</b> and I will render straight to a preview.</p>
  </section>
</div>
</body>
</html>`

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, html)
console.log(`storyboard: ${outPath}`)
for (const w of warn) console.warn(`  warn: ${w}`)
if (errors.length) {
  console.error("plan errors:")
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`  ok — ${plan.beats.length} beats, ${duration.toFixed(1)}s`)
