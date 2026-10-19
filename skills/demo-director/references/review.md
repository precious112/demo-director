# Review before you call it done

A film is finished when you have looked at every frame, not when it renders without
error. This is the pass that separates a demo from a deliverable.

## 1. Frame review

Render stills at a fixed interval (every 0.5s is a good default; 0.25s around
transitions), make a contact sheet, and look at every one at full size.

For each still ask:

1. **Could this frame be a real screenshot of the product?** (For anything inside
   the app frame.) Put one beside a real screenshot at the same size and compare
   density, spacing, colour and wording.
2. **Is there exactly one thing the viewer should look at, and is it framed?**
3. **Is any text too small to read at 1080p on a phone, or held too briefly?**
4. **Is anything glowing, floating, blurred, tilted, gradient-filled or sparkling**
   that the slop list rules out?
5. **Does any caption use a banned word or a claim nobody measured?**
6. **Is anything here that the product cannot actually do?**
7. **Does any text overlap something it should not** — in *any* frame of a camera
   move, not just where the camera settles? A caption scrim (a near-solid caption
   background) is the fix when a move carries UI through the band.

## 2. Motion review

Watch the whole film at 1x. Then watch it again at 0.25x around every transition and
camera move, looking for:

- a jump in a curve, or a move that starts or stops abruptly;
- a cursor that teleports, or clicks before the camera has arrived;
- UI that pops in rather than being there when the scene starts;
- a frame where two primary moves overlap and the eye has nowhere to go;
- text that changes under a fade, or a caption that leaves before it can be read;
- a zoom so far that pixels or antialiasing are the subject;
- a cut that arrives off the beat in a motion piece.

## 3. Copy review

Run the checker, then read the captions as a viewer who does not know the product:

```bash
node scripts/check-copy.mjs plan plan.json
```

- Does each caption say a specific thing that happened?
- Could it describe any other product? If so, it is too general.
- Is every word load-bearing?
- Is the product the only brand named?

## 4. Honesty review

- Does every on-screen behaviour happen in the real product, in this order?
- Is every compressed time visible (a cut, a speed ramp, the app's own progress)?
- Is every number measured, every quote real, every logo actually a customer?
- Is the invented demo project plausible and specific, and unnamed in the captions?
- Would a viewer reproduce what they saw and find it true?

## 5. Accessibility

- **Flashing.** Nothing may flash more than three times in any one second, at any
  size above the general-flash threshold (WCAG 2.3.1, Level A). Motion-design cuts
  and strobes are where this bites; pass a flash checker over anything with rapid
  brightness changes.
- **Motion sickness.** Avoid large-area parallax, spinning and zoom during the whole
  film. Where the film will be embedded on the web, the player should respect
  `prefers-reduced-motion`; a still poster and transcript cover the rest.
- **Legibility.** Hold text long enough to read (1s + ~0.3s per word), keep contrast
  high, and keep text out of the bottom 15% of a vertical frame.
- **Captions and transcript** for any narration, and for the film as a whole when it
  carries information (NN/g: don't rely on video alone; give an alternate path).

## 6. Findings

Anything that makes you wince is a finding, even if no rule names it. Fix it. If the
rule was missing, add it to the reference it belongs in, so the next film does not
repeat it.

## 7. Delivery

- The master (2x, primary format), and the second format cut from the same script.
- Short cutdowns (6–15s) for social, rendered with `until`, not re-timed by hand.
- A GIF or poster for a README or an image-only post.
- The stills and the plan next to the film, so it can be changed without re-deriving
  it.
- One short note on what is staged, and what to change if the product changes.

Then say where the files are. Do not repeat the film's argument in chat; the film is
the argument.
