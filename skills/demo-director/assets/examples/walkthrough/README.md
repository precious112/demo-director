# Harbor — a complete walkthrough

Harbor is a fictional support desk. The film is a real walkthrough of it: open a
conversation, read the history, write a reply, send it, and watch the state change.
Every state is reached by a real click on a real element. The loading state, the
toast and the status chip are the app's own.

## Run it

```bash
npm install
npm run example:still        # stills every 0.5s → renders/preview-stills-phone/
npm run example:render       # 4:5 master, 1080×1350
npm run example:render:wide  # 16:9 master from the same script
```

Or directly:

```bash
node film.mjs phone preview
node film.mjs phone final
node film.mjs wide final
```

`SCALE=1 node film.mjs phone final` renders a lighter master for sharing.

## Read it in this order

1. `plan.json` — the beat sheet, the thesis, the captions.
2. `storyboard.html` — what the owner reviews (built with `build-storyboard.mjs`).
3. `film.mjs` — the whole film: camera, cursor, typing, captions.
4. `world.html` / `world.css` / `world.js` — the product, and its scripted behaviour.
5. `../stage/` — the shell that applies the camera and draws the cursor and captions.

## What to copy, what to change

- Keep the shell (`assets/stage/`) as-is.
- Replace `world.*` with the product's real screen and its real states.
- Keep the beat structure and the framing helpers in `film.mjs`; change the
  subjects, the camera targets and the words.
- Keep the caption band and the readability floor. They are what make a desktop app
  legible in a phone frame.

## What is deliberately not here

- A real app server. The world is HTML/CSS/JS, and its states are scripted. To mount
  real components instead, register a backend with `F.route` (see
  `references/rendering.md`) and keep the film script.
- Sound. The film is silent, so it plays the same with the sound off.
