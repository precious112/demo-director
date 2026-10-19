# code-slowmo promo — a complete motion-design film

A 35-second motion piece for [code-slowmo](https://github.com/precious112/code-slowmo).
There is no app to walk through: a composer box types a question, the box opens into
the visualization that answers it, holds for five seconds, and folds back. Three
rounds, one per kind of picture. The repetition is the argument.

It is the counter-example to a product walkthrough: composed type, a signature
transform, cuts on the send, but the visualizations are real pages from the skill and
every claim is from its README.

## Run it

```bash
node film/render.mjs p            # 1080×1350 (4:5) master
node film/render.mjs w            # 1920×1080 (16:9) master
node film/render.mjs p preview    # stills only
```

The stage is **timeline mode**: `window.DURATION = 35.5`, `window.seek(t)` sets every
element, and nothing animates on its own. The engine samples each frame; see
`references/rendering.md`.

## Read it in this order

1. `storyboard/index.html` — the approved plan, with stills and frame-by-frame notes.
2. `film/stage.html` — the whole film as one `seek(t)` function.
3. `film/render.mjs` — the `mode: "timeline"` render.
4. `film/pages/` — the real code-slowmo pages mounted in the card.

## Why it is not a walkthrough

The owner's note on the first attempt was that it looked like a product demo. The
fix was not more effects; it was a different structure: no terminal, no app chrome,
one composer against a calm ground, and a signature move that repeats. The visual
language is in `references/motion-design.md`.

The film is silent, with cut points on the sends and the morphs if music is added.
