# Plan mode: the storyboard

The storyboard is the film before it costs anything. You write a small `plan.json`,
the builder turns it into one review page, the owner reads it and answers. Only
then do you render.

```bash
node scripts/build-storyboard.mjs plan.json        # writes storyboard.html next to it
open storyboard.html                               # macOS; xdg-open on Linux
```

## The gate

1. Write the plan. Say your mode, thesis, runtime and formats in the reply.
2. Build the page. Put real stills in it as soon as they exist — a plan that shows
   real screens gets a real decision; a plan of empty boxes gets a shrug.
3. Give the owner two or three **decisions**, not a summary: the caption set, the
   runtime, whether to add a beat. Offer a recommendation for each.
4. **Stop.** Do not render the master while you wait.

If the owner says to skip the review, or asks for the film now, take the escape
hatch: render 8–12 stills at the key beats (a preview costs seconds, not minutes),
show those, then render. Say plainly in one line that you skipped the plan and that
changes cost a re-render. Never quietly render a master before the plan is settled.

## plan.json

```json
{
  "title": "Harbor — a reply, end to end",
  "mode": "walkthrough",
  "thesis": "A support queue is one place, and Harbor keeps the state of every conversation in it.",
  "audience": "Support leads evaluating a helpdesk; watching muted on a phone.",
  "runtime": 23.7,
  "formats": ["phone", "wide"],
  "sound": "silent, with cuts on the click and the send",
  "palette": { "bg": "#0e1116", "ink": "#e7ebf2", "accent": "#4f8cff" },
  "note": "One or two sentences on anything staged, so the honesty rule is visible up front.",
  "beats": [
    {
      "title": "Open · the queue",
      "kind": "intro",
      "from": 0, "to": 3.6,
      "camera": "Static on the conversation column; the app sits below a reserved caption band.",
      "motion": "Nothing moves but the cursor. The first caption fades in over 180ms.",
      "action": "Hold the column long enough to read three subjects.",
      "honesty": "Only what the app really shows.",
      "captions": [{ "text": "Every customer question, in one queue.", "from": 0.3, "to": 3.3 }],
      "keyframes": [
        { "t": 1.5, "img": "renders/preview-stills-phone/t001.50.png",
          "note": "Caption in the band; the list reads at phone size." }
      ]
    }
  ],
  "openQuestions": [
    { "q": "Runtime", "note": "23.7s suits a social feed and a README.", "pick": "Under 25s." }
  ]
}
```

### Fields

- **title, thesis, mode, runtime, formats** — required. Runtime in seconds.
- **audience** — one line; it is the tie-breaker for every later argument.
- **sound** — say "silent" unless there is a real reason otherwise; a silent film
  plays identically with the sound off, where most views happen.
- **palette** — the product's own tokens, so the plan looks like the film.
- **note** — what is staged. Put the honesty statement where the owner will see it.
- **beats** — the film. Each beat:
  - `title`, `from`, `to` (required), `kind` (`intro`, `open`, `action`, `state`,
    `out`, `end` — used for the ruler colours).
  - `camera` and `motion` — how the shot moves and cuts. A beat with no movement is
    a still; that is allowed and sometimes right.
  - `action` — what happens on screen, and who does it.
  - `honesty` — only when there is something to say: staged data, compressed time,
    an invented reply. If it is empty, the beat is doing what the product does.
  - `captions` — every line, with `from`/`to`, and `draft: true` for any line you
    invented that the owner should rewrite.
  - `keyframes` — one per moment worth seeing, with `t`, an optional `img` (a
    still), and `note`. Without an image the builder draws a labelled placeholder.
- **openQuestions** — the two or three decisions, each with your `pick`.

The builder warns on: a beat out of order, a beat with nothing to approve, a
caption over nine words, a caption held under a second, and a missing still. Treat
the warnings as findings.

## Key frames

Shoot the key frames, not the pretty ones: the first frame, the moment of change,
the payoff, the last frame. A storyboard is a proof of causality, so the stills
should read as a sequence that happens in order.

Take them from the real stage once it exists:

```bash
node film.mjs phone preview        # writes renders/preview-stills-phone/t*.png every 0.5s
```

Point `img` at those files. When the stage is not built yet, describe the frame in
`note` and let the placeholder stand; the owner can still judge the beat structure.

## What the plan must make obvious

- the one idea, in the thesis;
- the mode, and therefore what kind of film this is;
- the first two seconds, because that is the hook;
- the payoff beat, and why it is the payoff;
- what is staged, so trust is not spent later;
- the length and the formats;
- exactly what you want decided.

If the owner cannot answer "what am I approving?" from the page, the plan is not
finished.

## After approval

The plan is the contract for the build. Keep it next to the film, update it when a
beat changes, and check the finished film against it before delivery. The storyboard
is also the first deliverable: it is what lets someone else change the film without
watching it.
