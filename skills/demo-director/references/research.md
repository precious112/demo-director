# Where the rules come from

The rules in this skill are not a house style invented for one product. They come
from interface-motion and product-video research, plus what the owner approved after
building and reviewing real launch films. This file is the evidence, so a rule can be
checked and argued with rather than obeyed.

## Interface motion

- **NN/g, "Executing UX Animations: Duration and Motion Characteristics" (2020).**
  Most interface animation belongs in 100–500ms; simple feedback ~100ms; a panel or
  modal 200–300ms; 400ms is already very slow and only for large moves. Entrances
  take slightly longer than exits. Ease-out on entry (so the eye can predict where
  it lands), ease-in on exit. Animations should be able to be removed for users who
  ask for reduced motion. <https://www.nngroup.com/articles/animation-duration/>
- **NN/g, "Video Usability" (2014).** Don't rely on video alone; give control,
  a transcript and an alternate path. Start strong: no lengthy introduction, even a
  few seconds feels long. Edit ruthlessly. <https://www.nngroup.com/articles/video-usability/>
- **IBM Carbon, Motion.** Productive vs expressive motion; duration grows with
  distance; duration tokens 70ms (micro) → 150ms (small) → 240ms (expansion, toast)
  → 400ms (large) → 700ms (background dimming); standard, entrance and exit easing
  curves; motion must be purposeful, responsive, meticulous and unobtrusive, with a
  simplified alternative for users who need one.
  <https://www.carbondesignsystem.com/building-blocks/foundations/motion>
- **Material Design, the motion system.** Shared-axis, container-transform,
  fade-through and fade patterns for transitions between screens; emphasized easing
  and durations for expressive moments; motion expresses spatial and navigational
  relationships, not decoration. <https://m2.material.io/design/motion/the-motion-system.html>,
  <https://m3.material.io/styles/motion/easing-and-duration>
- **Apple Human Interface Guidelines, Motion.** "Don't add motion for the sake of
  adding motion. Gratuitous or excessive animation can distract people and may make
  them feel disconnected or physically uncomfortable." Make motion optional; support
  Reduce Motion. <https://developer.apple.com/design/human-interface-guidelines/motion>
- **The 12 principles of animation**, applied to software: staging, anticipation,
  timing, slow in/out, arcs, follow-through, overlapping action, secondary action,
  exaggeration (sparingly) and appeal. Squash/stretch and cartoon physics usually do
  not belong on a rectangle. This is the shared vocabulary behind `motion-design.md`.
- **Kinetic typography.** The historical craft (Saul Bass, film titles) and the
  modern guidance agree on restraint: keep speed low enough to read, use faces whose
  shapes survive motion, limit elements moving at once, hold contrast, and respect
  reduced motion. Movement of type should come from meaning, not the reverse.
  <https://www.svgator.com/blog/kinetic-typography-a-guide-to-text-in-motion/>
- **WCAG 2.3.1 (Three Flashes or Below Threshold, Level A).** Nothing may flash more
  than three times in any one second, or must be below the general flash and red
  flash thresholds. Flashing can cause seizures, migraines, dizziness and nausea.
  <https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html>

## Product demo video

- **Runtime and placement.** Most demos should run 30s–2min, set by where they are
  watched: social 15–30s, homepage 60–90s, product page 90s–3min. Vidyard data: 65%
  of viewers finish a video under a minute, against 20% for videos over 20 minutes.
  <https://vidico.com/news/best-product-demo-video-examples/>
- **Structure.** Open on the problem the viewer already has, not on the company;
  show one workflow rather than the full feature set; prove an outcome rather than a
  feature; end on one specific action. The recurring failure mode is feature overload,
  not low production value.
- **Stylised UI vs real screen.** Rebuilding the interface as motion graphics keeps
  it legible on a phone and removes visual noise, but "a stylised UI has to still
  look like the product a buyer will actually get, or the demo sets up a
  disappointment." The same source's honesty test — "the demo that outruns the
  product" is the clearest tell of a product in trouble — is what the honesty rules
  here encode. <https://vidico.com/news/best-product-demo-video-examples/>
- **Muted first.** Most social views are sound-off; a film that only works with
  narration only works in half its placements. Design captions as the primary
  channel, not an accessibility afterthought.
- **Variant production.** Aspect ratios and short cutdowns are cheaper produced
  together with the master than retrofitted later.

## What the owner approved

From the Caret launch films and the code-slowmo promo (2026):

- Camera moves on a soft ease-in-out (`cubic-bezier(0.45, 0, 0.2, 1)`), 1.0–1.6s,
  with a small pull-back on long trips so the destination is in view on arrival.
- Linger before a move, but count the time already spent acting in the shot.
- When the camera goes somewhere so the viewer can *see* something, the cursor goes
  to that exact element at the same time.
- Open on the product, not a black title card; the thesis is the first caption.
- Keep secondary windows (code editors, terminals) out unless they are the point.
- Captions name only the product being sold; the demo project is scenery and is
  never named.
- A motion-design film may compose freely (the code-slowmo promo's box-becomes-the-
  answer move), but still shows the real output and names no invented capability.

## How to use this file

When a rule is questioned, cite the source. When a source and the owner disagree,
the owner wins for that product, and the disagreement goes in the plan so it is a
decision rather than a silent override.
