# Copy: captions and on-screen words

Captions are the film's argument for a muted viewer, which is most viewers. They
also give the film its pace, because each caption is a beat. Write them first.

Run them through the checker before rendering:

```bash
node scripts/check-copy.mjs plan plan.json
node scripts/check-copy.mjs file captions.txt
node scripts/check-copy.mjs caption "Your page designs are files in your repo."
```

It fails on banned words and warns on softeners, overlong captions, dash asides,
"Not X. Y." set-ups, captions that ask a question, unmeasured numbers, and emoji.

## The shape of a caption

- **One line.** At most about nine words. Under 1s + 0.3s per word on screen.
- **Says what just happened**, in the viewer's terms: "The edit is in the file."
  Not what the product "empowers" you to do.
- **Concrete, not abstract.** Name the thing ("a file in your repo"), not the
  category ("versioned design artefacts").
- **Does not describe a button.** The UI is on screen; the caption should say what
  the action achieved, not which control was clicked.
- **One caption at a time.** If two captions would overlap, the beat is two beats.
- **Does not ask a rhetorical question as a headline.** "Tired of X?" is an ad
  reflex; the answer is never in doubt, so nothing is gained.
- **No "Not X. Y." aphorisms and no em-dash labels** ("DESIGN — reimagined"). Say Y.

## Banned words

Words that promise a feeling instead of naming what happens:

> supercharge, unleash, unlock, seamless(ly), revolutionize, effortless(ly),
> game-changer, next-level, magic(al), elevate, empower, streamline, reimagine,
> cutting-edge, "at the speed of thought", "say goodbye to", "meet X", "introducing",
> "the future of"

Also avoid the filler that makes writing feel generated: utilize, leverage,
facilitate, delve, orchestrate, robust, "under the hood", "it's worth noting", and
the softeners simply, just, basically, essentially, obviously, clearly, actually.

If the owner has written copy (a website headline, a README line), use their words.
Mark invented lines as drafts in the plan so the owner can rewrite them.

## Claims

- **Numbers only when measured.** No "10x faster", no "used by 12,000 teams", no
  percentages nobody calculated. If there is a real number with a real source, cite
  it in the plan.
- **No invented testimonials, user counts, company logos or star ratings.**
- **The product is the only brand the film names.** The demo project on screen (a
  fictional shop, app or studio) is scenery: captions never mention it, because a
  viewer reading a second name thinks it is a second product. Say "your pages",
  "your app", "your design tokens" instead.
- **Be honest about what is staged.** If a beat compresses time, say so in the plan's
  `honesty` field, and show the compression on screen (a cut, a label, the app's own
  progress state).

## The test

Read each caption as a viewer who does not know the product:

- Does it say a specific thing that happened?
- Could it describe any other product? If yes, it is too general.
- Is every word load-bearing? Strike any word the sentence survives without.
- Would the viewer reproduce the claim and find it true?

## Examples

| Bad | Why | Good |
|---|---|---|
| "Unlock seamless design workflows." | banned words, says nothing | "Your page designs are files in your repo." |
| "Meet the future of collaboration." | banned, "meet", "future of" | "Edit the page, and the file changes with it." |
| "10x faster than Figma." | unmeasured claim, names a competitor | "The edit is in the file before you close the tab." |
| "Tired of messy handoffs?" | rhetorical question, names nothing | "There is nothing to hand off." |
| "Now with AI ✨" | emoji, no content | "Ask for a change and watch it land." |
