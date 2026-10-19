# Motion design: type, rhythm, transitions

In motion design you compose. The film has a designed ground, type is allowed to be
the image, and cuts are allowed on the beat. That freedom is exactly why the slop
list matters most here: decoration is the thing that makes a composed piece look
generated. Read `modes.md` first for what the mode may and may not do.

## Timing and easing

The feeling of a piece is mostly its timing. Sharp motion reads as energy; slow,
eased motion reads as calm or luxury; the same word can feel frantic or composed
depending on nothing but its pacing.

- **Easing.** Linear reads as mechanical — use it only for a constant-velocity
  marquee or a deliberate machine. Entering elements use ease-out (quick out of the
  gate, long settle: `cubic-bezier(0.16, 1, 0.3, 1)`, `ease.out`); leaving elements
  use ease-in (accelerate away); moves between two visible framings use ease-in-out
  (`ease.smooth`). Never bounce or spring a composed element unless the product's own
  motion system does.
- **Two scales of time, never mixed up.** Interface motion research (NN/g, Carbon,
  Material) measures *feedback inside a UI*: 70–150ms for a state change, 200–300ms
  for a panel, under ~500ms before it feels like a delay. Use those numbers for
  motion that happens **inside the app frame**. A *film* moves at a slower scale:
  a title or a graphic entering takes 400–900ms, a full-frame transition 500–1000ms,
  a camera move 1.0–1.6s, and a held frame is measured in seconds. Applying UI
  timings to a film makes it twitchy; applying film timings to a UI makes the
  product look slow.
- **Duration scales with distance and size.** Within either scale, a bigger or
  further move gets more time.
- **Two families of motion, and one rule about them.** Most UI has a *productive*
  register (subtle, fast, out of the way) and an *expressive* one (vivid, for the
  moments that matter). Use the productive register by default and spend the
  expressive one rarely, so it still means something. A film that is expressive the
  whole way through has no dynamics.
- **Entrances are longer than exits.** An object arriving takes slightly longer than
  the same object leaving; the eye needs the extra time to predict where it lands.

## Choreography

- **One thing leads.** In a group, one element moves first and the others follow with
  a small stagger (30–60ms). The stagger creates hierarchy: the eye knows where to
  start. Equal, simultaneous motion of many elements reads as an effect.
- **Overlap.** Things that move together should not start and finish in lockstep;
  slight overlap reads as natural. But never overlap two *primary* actions — the
  viewer can only follow one.
- **Arcs, not rulers.** A small element travelling across the frame curves; a
  straight diagonal reads as a slide.
- **Settle, do not bounce.** A short deceleration to rest. Overshoot and bounce are a
  genre, not a default, and they date a film fast.
- **Continuity is the strongest transition.** A shape that becomes the next frame, a
  camera move that carries into the next scene, a match cut where two things share a
  silhouette. It costs nothing and looks expensive.
- **The signature move.** Give a motion-design film one move that returns at each
  beat, so the viewer learns the rhythm and then enjoys it. In the code-slowmo promo
  the composer box grows into the visualization and folds back; the repetition is the
  argument. One signature move is a system; five are a mood board.

## Transitions

- Prefer **continuity**: a match cut, or a camera move that carries straight into the
  next scene (zoom out of a canvas, into the code).
- **Hard cuts are fine and usually best.** A cross-dissolve is at most 200–300ms.
- Never use: glitch, RGB split, whip-pan blur, light leaks, spinning cubes, page
  curls, zoom blur, "shatter", wipes with glowing edges, or any transition that draws
  attention to itself instead of the next thing.
- A **scene never begins with its UI flying or popping in.** Screens are already
  there when the scene starts, as in reality. If a scene must build, build it with
  the product's own motion (a list that loads row by row because the data is
  arriving), not with a generic entrance.

## Type in motion

Type that moves has one job before any other: to be read. What is allowed depends
on the mode (`modes.md`).

**In a walkthrough and in captions over a real screen:** a short fade (150–250ms),
or nothing. The caption is a label; the product is the subject.

**In motion design, type is allowed to be the image**, and kinetic type is a real
craft. The test is whether the motion comes *from the meaning* or is applied *to
the sentence*:

- **Motivated reveals.** A line rises out of a mask; words arrive in reading order
  with a short stagger (40–80ms a word) so the sentence builds the way it is read; a
  word that is the point gets the emphasis (a hold, a weight change, a colour from
  the product's tokens). One kinetic idea per line.
- **Type that becomes something.** A word that turns into the UI, a number that is
  the real value counting to itself, a command that becomes its own output. This is
  the strongest kind, because the transformation *is* the argument.
- **Layout as motion.** Lines that reflow, a headline that scales to fill the frame
  and then gives way to the product. Grid-aligned, on the product's type scale.

Never, in any mode:

- per-letter cascades, bounces, spins, or letters flying in from random directions;
- a typewriter with a blinking block cursor, unless the product is a terminal and
  the text is real input;
- type that keeps moving while it is meant to be read;
- more than one moving line at a time, or text that changes under a dissolve.

Hold any text for at least 1s + about 0.3s per word once it has settled. Keep the
face and size readable on a phone: a moving line needs more size and contrast than
a still one, and open letterforms survive motion better than tight ones.

## Ground and graphics

**In a walkthrough**, the ground is the product's flat background colour.

**In motion design**, the film may have a designed ground, but it is built from the
product's own identity: its colours as flat fields, its type, its real shapes
(an icon's geometry, a UI element enlarged into a graphic, a grid the product
actually uses). Flat fields can wipe, split and resize to carry a transition. A
shape from the product can travel and become the next frame.

Never use, in any mode:

- gradient orbs, blurred blobs, mesh gradients, aurora, bokeh, particle fields,
  starry space, generic graph-paper grids, noise grain overlays, spotlight halos;
- floating feature cards drifting around the screen, icon tiles in rounded squares,
  bento grids, stat counters for numbers nobody measured, or checklists that tick
  themselves — show the feature being used instead;
- glows, neon outlines, glassmorphism, gradient text, chromatic shadows, sparkles,
  confetti, emoji, pulsing "LIVE" dots, lens flares, animated gradient borders;
- a logo that spins, bounces or glitches. The mark appears once, at the end (or the
  very start), static or with one simple reveal.

If two frames could be swapped for stock footage from any other product, neither is
carrying the product's own meaning. That is the test, not the list.

## Rhythm

- **Cut and move on a pulse.** Pick a beat length (often 0.5s or a musical beat if
  there will be music) and land the important changes on it. Even a silent film reads
  as edited when its changes share a grid; random timing reads as accidental.
- **Vary the density.** A fast run of short beats is only felt against a held frame.
  Give the film one moment of stillness before the payoff.
- **Leave cut points for sound.** If the owner may add music, note the beat times in
  the plan so a track can be laid under them later.

## The principles behind it

These are the classic animation principles, kept only where they serve software:

| Principle | In a product film |
|---|---|
| Staging | One subject per beat, framed and lit so it is unmistakable |
| Anticipation | A slight lead-in before a big move; a button press before the result |
| Timing | The single biggest lever. Slow in/out for scale; fast, small moves for feedback |
| Slow in, slow out | Ease every move; nothing starts or stops at full speed |
| Arcs | Small elements travel on curves |
| Follow-through | Secondary motion settles a beat after the primary move |
| Overlap | Groups move with a small stagger, not in lockstep |
| Secondary action | A caption or a state change that reinforces the primary move, never competes |
| Exaggeration | Used sparingly, only where the product's own motion is expressive |
| Appeal | Readable shapes, real content, restraint |

Squash, stretch and anything that makes a rectangle behave like rubber usually read
as a cartoon on software. Leave them out unless the product itself does it.

## Sources

The interface-motion sources behind this file: IBM Carbon's productive/expressive split and
duration tokens (70ms fast → 400ms slow, 700ms background dimming), Material's
shared-axis/container-transform/fade-through patterns and its emphasized easing,
Apple's "don't add motion for the sake of motion", and NN/g's finding that most
interface motion belongs in 100–500ms with ease-out on entry. Details and links are
in `research.md`.
