# Modes: walkthrough, motion design, hybrid

A film is one of three things. Decide which, say which, and hold to what that mode
allows. Most bad demos are a mode confusion: a walkthrough decorated like an ad, or
an ad that keeps stopping to tour a menu.

## The test

Ask: *is the point that the product works, or that the product is good?*

- **Works** → walkthrough. The proof is the product doing the job.
- **Good** → motion design. The proof is taste: what it does, how it feels, what it
  is for. The interface may barely appear.
- **Both, at once** → hybrid. A designed ground, a real screen inside it.

If the product has little or no interface (a CLI tool, a skill, an API, a hardware
device), it is motion design by default, whatever the request called it. There is
nothing to walk through, and pretending otherwise produces the worst kind of demo:
a fake app doing fake things.

## Walkthrough

The product's real screen, used in the real order, at real density.

**What carries the film**
- One workflow, end to end. Not the feature list. If two workflows matter, that is
  two films.
- The camera as the guide: it goes where the eye should go, and it arrives before
  the action does.
- The cursor as the hand: it travels to the exact element and clicks it.
- The product's own states: loading, empty, error, success, toast.

**What it may not do**
- Compose the screen into a nicer layout. The app's layout is the app's.
- Skip the boring-but-honest parts without showing that time passed.
- Add a feature, a button, or a result the product does not have.
- Cut to a title card in the middle of a workflow. Walkthroughs stay in the product
  once they are in it; the caption does the talking.

**Runtime**: 20–60s for social and a README; up to about 2 minutes for a product
page. If it is longer, it is probably two films.

## Motion design

A composed piece: type, shapes, rhythm, cuts, and the product as an image or a beat
inside it. Think title sequence, not feature tour.

**What carries the film**
- A rhythmic spine: a signature move that returns (a box that becomes the answer, a
  word that becomes the interface). The viewer learns the rhythm and then enjoys it.
- Type as a first-class image, held long enough to read.
- Transitions that mean something: a match cut where two things share a shape, a
  camera move that carries into the next scene.
- The product, shown truly, in the moments that matter — a real screen, a real
  result — not a stock of floating cards.

**What it may not do**
- Use the slop list in `motion-design.md`: glows, gradient orbs, kinetic type
  cascades, floating feature cards, emoji, sparkles.
- Show a screen that is not the product, or a behaviour it does not have. Motion
  design is a licence for composition, not for fiction.
- Run long. A motion-design piece earns every second with rhythm; at 60s with no
  app to tour, it had better be very good. 15–40s is the usual honest range.

## Hybrid

The strongest launch films are hybrid: a real, faithful app screen inside a frame
the film designed (a product-coloured ground, a caption style, one signature move),
where the surrounding composition carries meaning the raw screen cannot.

Draw the line once and keep it: **inside the app frame is the product; outside is
the film.** The app screen is never restyled to fit the film. The film's ground,
type and captions are never the app's. A viewer downloading the product must
recognise every pixel inside the frame and recognise nothing but the brand outside
it.

## What changes between modes

| | Walkthrough | Motion design | Hybrid |
|---|---|---|---|
| Ground | The app's own background | The film's designed ground | Designed outside, app inside |
| Cuts | Rare; continuity preferred | On the beat; welcome | At the app boundary |
| Type | Captions only | Type is part of the image | Designed captions over real screen |
| Camera | Always present, serving the UI | Optional; framing is composition | Both: a designed move into the app |
| Cursor | Always the real hand | Only if a real click happens | Real only inside the app |
| Honesty risk | Inventing a cleaner app | Inventing a product capability | Both, at the seam |

## Writing it down

In the plan, name the mode on the first line, and in one sentence say why. A mode
the owner did not expect is the most expensive thing to discover after a render.
