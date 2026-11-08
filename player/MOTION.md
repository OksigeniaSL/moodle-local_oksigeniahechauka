# How the screens of Hechauka move

One language of movement for every slide of the player (art direction, 8 November 2026). `src/movimiento.js` and
`movimiento.css` apply it. Its tone is the birthdays': it comes in with energy and then stays calm.

## Five rules

1. **Movement tells the order of reading.** What comes in first is what has to be read first.
2. **In with energy, then still.** The whole entrance takes less than 2 s; the 8 to 15 s after it, the slide is read. What
   moves after that is little, slow and never over what is being read.
3. **Only one thing calls.** Only the sign of what is important pulses. Nothing blinks.
4. **Two texts never cross.** The old slide has gone before anything of the new one comes in.
5. **Only `transform` and `opacity`.** No sizes, margins or positions moved, no filters. The graphics card moves those
   without painting the page again, which is what Chromium 56 (Samsung) and the Raspberry Pi do best.

## The pass between two slides

| Time | What happens |
|---|---|
| 0 – 0.3 s | The old one goes, all of it: it rises 1.4 rem and fades, curve «goes» (it speeds up as it leaves). All its parts at once: leaving is never made to wait. |
| 0.3 s | The new one appears, with its parts still hidden: an instant of empty stage between the two, felt as a breath. |
| 0.3 – 2 s | Its parts come in one after the other (below). |

The header (logo, weather, clock) and the ticker do not pass: they are the frame and stay. The ticker's sentence changes
with the slide, in the same movement. The full screens (full photo, showcase, idle), the agenda, the wall, the photos in a
third and the birthdays keep the pass they had and their own movement.

## How the parts come in

In the **order of reading**, not of the document: the frame first, then the headline, what explains it, the object with
its gesture, and last the third, from the top down, with the page dots at the end. Each part starts one **step** after the
one before; the lines of a list, one **line** after.

| Way | What for | How it comes in |
|---|---|---|
| block | the lead's block of colour | appears and grows from 97 % to 100 %; the bubble, from its tail |
| frame | what takes the whole body: the 8 m headline, the sheet of what falls due, the library's shelf | only appears (0.4 s); what is inside moves. Growing the whole body costs too much without a graphics card |
| rise | labels, headlines, second lines | rises 2.4 rem and appears |
| line | each line of the third, each row of a list | rises 1.4 rem, shorter |
| row of a headline | each line of an 8 m headline | rises from under itself, clipped by its line |
| photo | a photo in its place | appears, and the picture inside settles: from 107 % to 100 % in 12 s, fast at first and nearly still after |
| plate | the dish of the menu | comes in turning from the right, as a plate is served |
| sign | the sign of what is important | is put up at once, with a short bounce (in sober too, without the bounce) |
| stub | the time of an event | comes out from the side, as the stub of a ticket |
| board | the flaps of a countdown | appear with yesterday's number and **turn** once to today's |
| sheet | the calendar sheet of a holiday | swings hanging from its rings |
| stamp | the icon of an event | is stamped: big and turned, and falls into place |
| book | the library's cover | rises to its place on the shelf (without turning: turning a big picture costs without a graphics card) |
| shelf | the next books | slide along the shelf |

## What moves while the slide stands

| What | How | Why |
|---|---|---|
| The clock beats | the colon of the time breathes every 2 s (opacity 1 to 0.4), only in the clock, and stops on a still screen | the screen is seen alive; a hung screen has a still colon |
| A sheen passes | a band of light crosses the lead's block of colour (menu, notice, important), the headline's or the book's cover, some 2 s after it comes in and then every 30 s (25 in playful), in 2 s | it gives life to a big block without touching its words, about once a slide so it is not read as an ornament; never on a white card |
| The bar of the time left | under the heading of what is read for long (what falls due, tables), and on the third's page dot, a bar that fills in the slide's time | whoever is reading knows how long is left |
| The sign pulses | the sign of what is important grows 6 % and back, every 3.2 s | it is the only thing that must call |
| The photo settles | the one of the entrance, through its 12 s | a still photo looks like a capture; this one breathes |

Nothing else. No confetti outside the birthdays, nothing that crosses a text, nothing that repeats faster than every 2 s.

## Times and curves

| | |
|---|---|
| Leaving | 0.3 s, `cubic-bezier(.5, 0, .75, 0)` («goes») |
| A part coming in | appear 0.45 s (`ease`); move 0.75 s, `cubic-bezier(.2, .7, .2, 1)` («settles», the house's) |
| A line of a list | appear 0.4 s; move 0.6 s |
| Bounce (playful, the sign, the sheet) | `cubic-bezier(.3, 1.35, .5, 1)` |
| Life | `cubic-bezier(.45, .05, .55, .95)` (breathes); cycles of 2 s or more |

**How much party: the skin says**, with `--hk-fiesta`, the same variable as the birthdays':

| | sober | elegant | playful |
|---|---|---|---|
| Skin by default | bottle green | petroleum (and the default) | aubergine |
| Step between parts | 0.06 s | 0.09 s | 0.11 s |
| Travel when rising | 1.6 rem | 2.4 rem | 3.2 rem |
| Bounce | never | only the sign and the sheet | in all that rises and in the objects |
| Plate | 12° | 40° | 80° |
| Flaps before the number | 1 | 1 | 1 |
| Sheen | no | every 30 s, soft | every 25 s, brighter |
| Pulse of the sign | 2.5 % | 6 % | 6 % |

**A still screen** (the screen's card, or the system's «reduced motion»: `keepsStill()`): the same order, closer, **with
fades only** of 0.5 s. No travel, no turns, no flaps, no sheen, no pulses, no bar; the clock with its colon still.

**Distance:** the same language at 3, 5 and 8 m, in rem, so it grows with the letter. At 8 m there are fewer parts (no
third) and the entrance shows more; at 8 m the headline also comes, by its lines.

## A new slide

Its parts go in `PARTS` of `src/movimiento.js`: selector, way and rank (when it comes in, in steps). If it has an object
of its own, its gesture goes in `movimiento.css`, within these ways and these curves. What is not in `PARTS` keeps the old
pass.
