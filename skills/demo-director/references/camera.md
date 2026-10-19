# Camera, cursor and typing

The camera is how a dense, real interface becomes readable. It has to feel like one
operator with a steady hand. This file is the rules and the stage contract the engine
drives.

## Camera

- **One move at a time.** Zoom and pan are a single combined transform on one curve,
  toward one point of interest. Never drift (Ken Burns) during a beat that has its
  own action; the action is the motion.
- **Easing.** Smooth ease-in-out for moves between framings (`cubic-bezier(0.45, 0,
  0.2, 1)` is the house curve, in `ease.smooth`); ease-out (`ease.out`) for arrivals.
  No linear moves, no bounce, no overshoot, no springs on the camera.
- **Durations.** 1.0–1.6s for a move between framings (see the house style below).
  Faster reads as a jolt, especially on a phone where the eye has further to travel
  across a dense UI; much slower reads as filler.
- **Hold.** Linger before a move: at least ~0.5s on a framing before leaving it,
  unless an action in the shot (typing, clicking) already held it. Hold every payoff
  for at least 1.5s at 1x.
- **Scale.** Zoom so the subject of the beat fills roughly 40–60% of the frame. Do
  not zoom so far that the UI's own pixels or text antialiasing become the subject.
  Render at 2x device scale so a 2.5x zoom stays crisp; never upscale a bitmap.
- **No rotation, no 3D tilt, no shake, no parallax layers inside a UI screenshot, no
  fake depth of field.**
- **Payoff moments stay still.** The moment that proves the value (an edit landing in
  a file, a token change rippling across every page) is shown wide enough to see
  cause and effect at once, at 1x, with the camera still.

### The approved house style

This is what the owner approved after the first Caret film, and it now carries into
every film:

- Moves run 1.0–1.6s on `cubic-bezier(0.45, 0, 0.2, 1)`; a long trip pulls back
  slightly mid-move (zoom out up to ~35%, sine-shaped) so the destination is in view
  before arrival. The engine does this for you in `cameraTo`. No hard cuts between
  places inside the app.
- **Linger before every move** — but time already spent acting in the shot (typing,
  clicking) counts toward the linger. Do not pad after an action that held the shot.
- **When the camera goes somewhere so the viewer can see something** (a toast, a plan,
  a dialog), the cursor travels to that exact element at the same time.
- **Open on the product itself**, not a black title card. The thesis is the first
  caption.
- Show a token or colour change on a page dense with that colour, and make the change
  sweep visibly outward from the cursor or the click.
- Keep secondary windows (code editors, terminals) out unless they are the point; a
  caption can carry "it is in your repo".

## The stage contract (mode: "film")

The stage shell in `assets/stage/` already implements this. A project writes only
`world.html`, `world.css` and `world.js`.

- `window.__stage.set(state)` is called once per rendered frame with
  `{ camera, cursor, caption, card, ...custom }`. The shell applies the camera to
  `#world`, positions the cursor, and draws the caption and card.
- `window.__ready === true` once the world is mounted and fonts are in. The engine
  waits for it (advancing the virtual clock) before frame 0.
- A world may register a scripted backend: the engine exposes
  `window.__filmRoute(channel, args)` answered by Node functions registered with
  `F.route(channel, fn)`. `window.__filmRoutes` lists the channels.
- `window.DURATION` is only for `mode: "timeline"` stages.

### Camera maths

The shell maps world coordinates to the frame with `scale = frameWidth / camera.w`,
centred on `(camera.cx, camera.cy)`. So `camera.w` is *how many world units fit
across the frame*: a smaller `w` is a closer zoom. `F.cameraTo({cx, cy, w}, dur)`.

`F.worldBox(locator)` returns an element's box in world coordinates, which is what
you frame on:

```js
const box = await F.worldBox(page.locator(".send-btn"))
F.cameraTo(frameOn(box, { pad: 1.15, minW: READ }), 0.9)
```

`frameOn` is a script-local helper (see the example). Two ideas in it matter:

- **A caption band.** Reserve screen space at the top (or bottom) so captions never
  sit on UI the viewer must read. Frame the subject in the area below the band. A
  desktop app in a phone frame will otherwise always collide with its caption.
- **A readability floor (`READ`).** The minimum zoom at which the app's body text
  reads on the target device. For a 1080-wide phone frame and 13px UI, `READ ≈ 420`
  world units (13 × 1080/420 ≈ 33px on the frame, about 12pt on a phone). Every beat
  that carries text the viewer needs is framed at least this close. Wide shots are
  orientation only and never carry text the viewer needs.

## Cursor

- Moves take 350–750ms depending on distance, on a gentle arc rather than a ruler
  line, ease-in-out. It stops on the target, waits ~120–200ms, then clicks.
- A click is the real element's own pressed/active state. No artificial click
  graphics.
- Hover states happen because the cursor is over the element, in the real app's
  styling, and nowhere else.
- Off-screen clicks are a script bug, and the engine throws rather than landing one
  nowhere. If you need to click something outside the current framing, move the
  camera to include it first, and take the hand there in the same beat.

## Typing

- 35–70ms per character with slight, seeded jitter (`F.type(text, ms, seed)`) so the
  pacing is identical on every render.
- Long text that would be dull is speed-ramped as a block, and the full text must
  still be readable on the final frame.
- Type into the real element (click it first), so the caret and the composer's focus
  state are the product's.

## Camera worked example

For Harbor (a 1440×900 app in a 4:5 phone frame):

- The **list column** is the home framing: `{x: listLeft, w: 330, h: 430}` at `READ`,
  aligned so no half-cut panel shows at the edge.
- A **conversation** is a vertical slice: `{x: threadLeft + 34, y: 258, w: 430,
  h: 520}`, so messages sit below the caption band.
- The **composer** is `{x: composerLeft, y: composerTop - 380, w: 430, h: 450}`,
  which keeps the last message above the box in frame.
- **Send** needs the full composer width: pull back to `frameOn(union(textBox,
  sendBox))` and take the hand to the button.

See `assets/examples/walkthrough/film.mjs`.
