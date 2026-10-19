# Caret — a launch campaign, as a case study

This is the real campaign this skill was distilled from: three silent launch films
for [Caret](https://github.com/precious112/caret-desktop), a design tool whose
designs are React files in the repo. It is here to be read, not run out of the box.

## What it demonstrates

- **A faithful walkthrough at desktop density.** Caret's real window, canvas runtime
  and chat are mounted and driven; nothing is a drawing of the app.
- **A staged demo project.** Vahl, a fictional bike maker, is built as real Caret
  pages so the canvas has something worth showing.
- **The approved camera language.** Smooth 1.0–1.6s moves, linger before a move,
  cursor-led attention, no editor window unless it is the point.
- **A storyboard as the approval artifact.** `storyboard.html` is the plan the owner
  actually reviewed: key frames, camera diagrams, captions, frame-by-frame tables.

## What is included

```
caret/
├── storyboard.html          the approved plan (opens in any browser)
├── docs/vahl/               stills of the demo project, used by the storyboard
├── docs/ui-spec.md          the app-surface spec the stage was built against
└── render/
    ├── film-kit.mjs         the original frame-accurate engine (this skill's
    │                        engine.mjs is the generalised version)
    ├── common.mjs           shared framing and settling helpers
    ├── film1.mjs            "One repo"
    ├── film2.mjs            "Pictures that belong"
    ├── film3.mjs            "Edit where you see it"
    └── reset-project.sh     resets the demo project between renders
```

## What is not included

- `vendor/caret-desktop/` — the pinned Caret checkout the stage mounts. Clone Caret
  at the version in the film scripts to run them.
- `project/vahl/` — the demo project's real Caret pages and app files (about 91 MB).
- `renders/` — the masters (1.3 GB); they are on the Caret repository and README.
- The downloaded Unsplash photographs used by the demo project, beyond the stills
  used in the storyboard.

The scripts are app-specific: they locate Caret's own iframes, toolbar and chat. They
are a reference for what a high-fidelity walkthrough looks like in practice, not a
template to copy verbatim. The general template is
`assets/examples/walkthrough/`.

## Reading order

1. `storyboard.html` — what was approved, and how a beat is described.
2. `render/film-kit.mjs` — the virtual clock, camera and cursor model.
3. `render/film1.mjs` — the approved camera style in a real script.
4. `docs/ui-spec.md` — how the app's surfaces were specified before building.

## Attribution

Caret and its UI are © precious112, Apache-2.0 (see the Caret repository's LICENSE).
The storyboard photographs are from Unsplash, used under the Unsplash License, which
permits commercial use without attribution; they are included only as stills of the
demo project. Vahl is fictional, as are its people and products.
