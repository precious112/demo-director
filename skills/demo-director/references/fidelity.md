# Inside the app frame: fidelity

Everything inside the app frame is the product. The only rule is that it looks and
behaves like the product, because a viewer who downloads it must recognise every
pixel. This file is the list of tells that say "a drawing of software" instead of
software, and what to do instead.

## Render the real thing

- **Mount the product's real components** where you can, with a scripted backend
  (see `rendering.md`, `F.route`). Reuse the real design system, the real icons, the
  real tokens.
- **Redraw only what cannot be mounted**, and then check it against a real
  screenshot side by side, not from memory.
- **Keep the app's own window.** If a window frame is shown, it is the real platform
  frame (macOS traffic lights at their real size and position). Never hand-build
  "three coloured dots on a rounded rectangle", and never float the app in a tilted
  card with a giant shadow.

## Real density

Desktop software runs at 12–14px text, 1px borders, 6–8px radii, tight rows, and a
lot of them. That density is what makes it read as real.

- Never scale individual UI elements up for "readability". Make things readable with
  the **camera** — zoom into the region — and keep the UI at its own size.
- Never remove chrome to "focus attention": top bar, sidebars, status dots,
  scrollbars where the app shows them, the cursor. A screen with the chrome removed
  reads as a mockup.
- Empty is the giveaway. Real screens are full. Populate the demo account the way a
  working account looks: many rows, real names, long values, an avatar or two.

## Real content

- **Copy strings from source.** Every label, menu item, toast, tooltip and empty
  state uses the product's exact words. Do not paraphrase into something smoother.
- **No placeholder anything**: no lorem ipsum, no grey bars, no "Acme", "Jane Doe",
  "Project Alpha", "user@example.com".
- The demo project on screen should be something a viewer would want: a specific made-up
  brand with real-looking content, a real design system and, where a photograph
  appears, a real photograph. Scenery still has to be good; it is what the product
  is being shown to do.
- If a number or state is invented, keep it plausible and mark it in the plan's
  `honesty` field. Never invent a *result*.

## Real states and real latency

- A model call takes seconds. Show the app's real waiting state (its spinner, its
  "Working…" row), then compress time with a cut or a speed ramp. Never make the
  result appear instantly as if nothing happened, and never hide that time passed.
- Show the states a workflow actually passes through: empty before filled, loading
  before loaded, the success toast, the updated row.
- Errors and waiting may be removed for the film. They may not be replaced with a
  capability the product lacks.

## One cursor, behaving like a hand

- The system cursor at native size: arrow, I-beam, pointer, as the real element
  would set it.
- It travels to the element it acts on, and the action lands on that element's own
  pressed/active state. No ripple rings, no expanding circles, no click graphics.
- Typing runs at a believable pace (35–70ms a character, slight jitter) and the full
  text is readable on the final frame where it matters.

## Checking it

Put one frame from the film beside a real screenshot of the same state, at the same
size, and look. If they differ in density, spacing, colour or wording, the frame is
wrong. Do this early — before the camera moves, when it is cheap to fix.
