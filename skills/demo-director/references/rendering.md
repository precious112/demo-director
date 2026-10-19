# Rendering and the project layout

Films are rendered frame by frame from a stage page, never screen-recorded. Time is
virtual, so every frame is exact and the same on every machine, at any render speed.

## Requirements

- Node 18 or newer.
- Playwright (`npm i -D playwright@1.62`, or the version matching your browser
  cache) with its chromium.
- ffmpeg on the PATH (the engine pipes PNGs to it).

The example projects each carry a `package.json` with Playwright; `npm install`
once.

## The engine

`scripts/engine.mjs` exports `film(options)`. The important options:

| Option | Meaning |
|---|---|
| `mode` | `"film"` (camera/script) or `"timeline"` (self-contained `seek`) |
| `format` | `wide` 1920×1080, `vertical` 1080×1920, `phone` 1080×1350, `square` 1080×1080 |
| `scale` | Device pixel ratio. 2 for a master, 1 for a quick look |
| `root` | Directory served at `http://film.local/` (so stages can open iframes) |
| `stage` | Stage path inside `root` |
| `out` | mp4 path. Omit to render stills only |
| `stills`, `stillEvery` | Still directory and interval, for the review sheet |
| `preview` | Render no video, even if `out` is set |
| `until` | Stop the film at this many seconds (fast iteration) |
| `camera`, `cursor`, `stageState` | Initial state pushed to the stage before frame 0 |

In `mode: "film"` the returned object has the driving API: `wait(seconds)`,
`waitUntil(t)`, `cameraTo(target, dur, ease)`, `moveTo(point, dur, {kind, arc})`,
`click()`, `type(text, msPerChar, seed)`, `key()`, `caption(text, {fade, scrim})`,
`hideCaption()`, `card(spec, {fade})`, `hideCard()`, `stage(patch)`, `route(channel,
fn)`, `worldBox(locator)`, `worldOf(locator, anchor)`, `settle(check)`, `eval`,
`page`, `errors`, `close()`.

In `mode: "timeline"` it is much smaller: `seek(seconds)`, `screenshot(path)`,
`duration`, `close()`.

### Determinism

- The clock is installed and paused; only `runFor` advances it. Timers and rAF fire
  as frames render, so a `setTimeout(420)` in the world is a visible, repeatable
  loading state.
- Every CSS animation and transition in every document is paused and seeked each
  frame (`window.__seek`).
- Typing jitter is seeded.
- Always render a film forward from 0: clicks happen as time passes them.

### Scripted backend

A walkthrough of a real app should not run the real app. Mount the real components
and answer their calls from Node:

```js
await F.route("save-document", async (doc) => { await sleep(1200); return { ok: true, doc } })
```

The page calls `window.__filmRoute("save-document", [doc])` and awaits the result.
`window.__filmRoutes` is the set of registered channels. This is how a model call
takes seconds and the app's own "Working…" state shows, without a model.

## The stage

A stage is an HTML page plus a world. Copy `assets/stage/` (the shell) and write the
world:

```
project/
  stage/
    index.html      the shell (do not edit per film)
    stage.css       the shell's styles (edit only to add tokens)
    stage.js        the shell's runtime (do not edit)
    world.html      the product's markup, in world pixels
    world.css       the product's styles
    world.js        the product's behaviour, scripted
  film.mjs          the film: camera, cursor, clicks, typing, captions
  plan.json         the storyboard
  storyboard.html   built from plan.json
  renders/          output
```

The shell: applies the camera to `#world`, positions the cursor, draws the caption
band and the card. It loads `world.html`, then `world.css`, then `world.js`, then
waits for fonts and `window.__worldReady()` before setting `window.__ready`. The
stage contract is in `camera.md`.

### Timeline stages

For a self-contained motion piece, a stage may ignore the shell and implement:

```js
window.DURATION = 35.5            // seconds
window.seek = (t) => { /* set every element for time t; no self-running animation */ }
window.__ready = true             // after fonts and initial layout
```

The engine samples every frame from 0 to `DURATION`. Nothing may animate on its own;
every visual state must be a pure function of `t`, or frames are not reproducible.
CSS animations are still seeked automatically, so a CSS timeline works if it does not
depend on wall time.

## Formats and fonts

- Build the primary format first, then cut the second from the same script (only the
  camera framings change; avoid duplicating the film).
- Fonts must be in before frame 0. The shell awaits `document.fonts.ready`; if you
  serve web fonts, self-host them or preconnect, and never rely on a font that
  arrives after the first second.
- Render masters at 2x (`scale: 2`). Do not upscale a bitmap.

## Encoding

The engine pipes PNG frames to ffmpeg: H.264, `yuv420p`, CRF 12–14, `+faststart`.
That is the right default for social and the web. For a smaller file, raise CRF
(16–18) and keep 60fps for screen motion; 30fps is acceptable for a slow, held
motion piece. Keep the master; cut lighter versions from it.

## Helpers

- **Contact sheet**: `node scripts/contact-sheet.mjs renders/stills` tiles the stills
  into one image for a fast review.
- **GIFs**: `node scripts/to-gif.mjs renders/film.mp4 renders/film.gif --from 0 --to 8
  --fps 16 --width 900` for a README or a post that only takes images.
- **Cutdowns**: render an `until` version for a 6–15s social cut; do not re-time the
  master.

## Working loop

1. `node film.mjs phone preview` — stills every 0.5s, seconds.
2. Look at every still. Fix the stage, the framing and the copy.
3. `node film.mjs phone final` — the 2x master.
4. Watch at 1x, then at 0.25x around every move.
5. Repeat in the second format.
