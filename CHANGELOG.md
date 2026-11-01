# Changelog

## Unreleased

- In «Tu centro», «Verlo en la vista previa» instead of «Verlo en la pantalla»: it plays in the preview, not on the real
  screens, and the old words said otherwise.

## 0.7.4 (2026-11-01)

- «Show one now» given right after turning the surprises on was lost: the order reached the screen before the manifest
  that says who comes out. It now waits for it.

## 0.7.3 (2026-11-01)

- In «Tu centro», the surprises go under the screen, with a button of their own to save: at the end of the long column
  they were too far down.

## 0.7.2 (2026-11-01)

- **Surprises**: now and then a character crosses the screen, stops, looks at whoever is passing, makes a gesture and runs
  away, on a layer of its own over whatever is there; slides go on changing under it, and only an urgent notice takes it
  off. The first one is the little worm, in 3D from the art direction, which either takes fright or sticks out its tongue.
  Off by default: «Tu centro» turns them on, with how often (every 20 minutes, every hour or every three hours, never at a
  fixed beat) and who comes out, and «See it on the screen» plays it in the preview. Each screen can leave them out in its
  sheet, which also has «Show one now». New field `surprises` in the manifest and command `surprise` in the heartbeat.
- A long word in a headline on a showcase or a poster fits the screen: the letter goes down in steps and, if a word is
  still too long, as far as it takes.

## 0.7.1 (2026-11-01)

- **The agenda that goes up** (`agenda`): the month with its days marked in the colours of their categories, and a diary of
  the next thirty days that rises by stretches and stops to be read, into the next month if it comes to that. Nothing is
  ever cut, holidays are told apart, and a quiet month says so. From 8 m, and 5 m behind glass, the month and the diary
  take turns over the whole body. It takes the turn of the coming days: always from 5 m; from close, all but Mondays and
  Fridays, which stay with the week.
- **Albums**, a new kind of content: several photos at once, with a name, a line and a web. On the screens they go **in a
  third** (`fotos-tercio`, from three photos: one at a time, beside what leads) and **on a wall** (`muro`, from four: a
  mosaic where one changes at a time; on a showcase, with a poster and its QR). Among the pictures, an album takes the turn
  of one thing and gives the next photo each time, so a large one does not push out the rest.
- A picture without words on a showcase is no longer darkened for words that are not there.
- Uploading a picture or a video failed since 0.6.0: the file library was not loaded. Fixed.
- «Duplicar» in a content's menu: a copy with the same text, destinations and files, unpublished, open to change.
- «Recargando…» on a screen's card until the screen takes the order, then «Recargada».
- A menu says its own name on the screens when a day has several («Menú de hoy · D»).

## 0.7.0 (2026-11-01)

The screens, read at a glance: the art direction's design of the compositions on the player.

- **One thing big in each slide**, like the front page of a newspaper: what leads (the menu, a notice, the important
  notice, an event or the countdown, a different one each time; around midday the menu first) and the rest in a third,
  which turns a page with each slide. The important notice stays fixed on top, in the accent's colour, with its mark.
- **The letters by the distance**: each screen says in its sheet from where it is read (3, 5 or 8 m) and whether it is
  behind glass, and every size comes from that. From 5 m no week; from 8 m no thirds and no ticker: «Today» comes one
  thing at a time, big, and the ticker's sentences come as slides of their own (`titular`, also for a countdown).
- **What each screen is for**, in its sheet: informative, showcase (only pictures and videos over the whole screen, their
  headline big, and their web with a QR, for people from outside and from afar) or mixed (also the weather in a third:
  today big and the next three days). And another use at some hours: an entrance informative on weekdays and a showcase
  at the weekend. New fields `use` and `useplan` in the manifest, `distance` and `glass` in its `screen`.
- **A web for a picture or a video**: on a showcase it shows with a big QR to open it on a phone, and the address
  written short. The QR is made in the player (qrcode-generator, MIT), with no network.
- **Landscape videos have their own place** (`apaisado`): two thirds with their band under them, playing at once, and the
  rest in the other third.
- **The ticker, one sentence at a time**, instead of running; a long one is cut at a comma into two.
- **Headlines by steps and in even lines**, measured in the player (Chromium 56 has no `text-wrap: balance`).
- **«Tomorrow» at the end of the day:** each centre sets in «Tu centro» when its day ends (16:00 by default). From then
  until midnight «Today» shows tomorrow's events under «Tomorrow», the coming days start after it, and the menu switches
  at the same hour. New field `dayend` in the manifest.
- «Today» lists the events that take place today by their own dates: an event shown days before its day stays in the
  coming days, and one of several days is on each of them.
- The week has a strip with what comes next and matters.
- The events come a month ahead and the weather the next three days, for what comes next: the agenda that scrolls.

## 0.6.3 (2026-11-01)

- «Pantallas y grupos» balanced on wide screens: the screens and the groups on the left, the permissions in a column of
  their own on the right (as the preview on the other pages), stacked below on narrow ones. «Grupo nuevo» is a button
  in the head of «Grupos» that opens a small dialog, and without groups an empty state says what one is for.
- Buttons keep the gap between their icon and their text on any theme (Boost Union did not give one).
- The example name of a new group is no longer a school's.

## 0.6.2 (2026-11-01)

- «Tu centro»: a keyword added with Enter no longer shows twice, and one already there is not added again; «palabra»
  is now «palabra clave», with a hint of what to write and a help that says it.
- **Who publishes everywhere and who runs the screens, chosen in the panel**, with the same search as the groups: a
  third role, «Publica en todas las pantallas» (view, publish, publishall), given by whoever runs the screens from
  «Todas las pantallas»; and «Quién lleva las pantallas», chosen there by whoever may give that role in Moodle (the
  administrator). Both are plain role assignments in the site, so the administration sees and can undo them too.

## 0.6.1 (2026-11-01)

- **Each centre names its own categories** to colour its events (the stages of a school, the faculties of a
  university, the areas of an academy), up to six, none by default: in «Tu centro», each with its colour and the words
  that mark it in a title or in «for whom», or brought from Moodle's top course categories, linked, so their calendar
  events reach the screens in their colour. The four fixed stages (Infantil, Primaria, ESO, Bachillerato) go; colours a
  site had chosen for them become its first categories. Adding an event chooses among the centre's categories.
- «Tu centro» says when its colours are still Hechauka's own.
- The urgent notice's sentences already made fit any centre (severe weather, early closing).
- Mustache scripts pass Moodle 4.5's ESLint; on a phone the panel keeps 16 px from the edge.

## 0.6.0 (2026-11-01)

The panel, as the art direction drew it (DESIGN.md), and run without being an administrator.

- **Who runs it.** Four capabilities (view, publish, publishall, managescreens) instead of one, each cloned from the
  old one on upgrade; two roles made at install, without archetype; who publishes in each group of screens is chosen
  in the panel. Who only publishes sends content to their groups and changes only what they made.
- **Its own page**, «Pantallas», linked from the main bar and the user menu, at full width.
- **Home («Lo que sale»):** the wall of screens, each as a television with its light, its picture (the player itself
  when there is no screenshot), its state (running, off by its hours and when it comes on, no signal since when, clock
  off, never seen) and what it shows now; a line that says whether one needs someone; what is on them in three groups,
  with filters and «De todos / Lo mío».
- **Adding content** with the screen beside it: the draft goes to the player as one types (a new photo too, before it
  is sent); «Cuándo» with shortcuts said as a sentence and drawn on a two-week strip; «Dónde» as chips; defaults that
  end by themselves.
- **The urgent notice:** two steps to put it on (sentences already made, where, until when, the red screen beside it),
  one to take it off; on the screens it covers everything until it goes.
- **A screen's sheet:** its preview and facts, and a card per topic (name and groups, power hours in bars and in a
  sentence, the warning if it stops answering, sound, light or dark).
- **«Pantallas y grupos»:** the screens in rows, adding one in a dialog, and a card per group with its screens and who
  publishes in it, with a search of the people of the school.
- **«Tu centro»:** the place for the weather found by name and confirmed on a small map drawn by the plugin (Natural
  Earth, no map service) with the weather there now; the colours, each with the text that reads on it, chosen by
  itself (the screens get it too); the two logos; the screen beside them, live.
- **A new screen from the phone** in three steps, new or replacing another.
- **The player:** the urgent notice, drafts and colours from the panel's preview, titles of events kept to two lines,
  slides measured again once the letters arrive; the preview never sounds.
- The same event from an agenda and from the site calendar reaches a screen once; saving the location asks for its
  weather at once.

## 0.5.1 (2026-11-01)

- **«La semana»**, the seventh composition (the art direction's design): the next five school days side by side (one
  under the other on a vertical screen), today highlighted, a day without anything stepped back, a holiday striped with
  its name, and events of more than a day as a band across their days (a flag on a pole on a vertical screen) that
  says from or until when it goes on. Each day fits its list; what does not fit says «+2 more». It comes every 8
  slides, every 5 on Mondays and Fridays, only when the week has something beyond today.
- **Stages by colour**: an event takes its stage from the group in its title or its «who or where» (Inf, Pri, ESO,
  Bach: the four colours of the centre, in that order); one of the whole school goes in a neutral grey. Calendar events
  no longer come all in the first colour; an agenda can take each event's stage (the default) or a colour of its own.
## 0.5.0 (2026-10-31)

- **Compositions that change with each slide** (the design of the art direction): a landscape picture with «Today»
  beside it, a portrait one in a slot of its shape with a wider «Today», two portrait pictures together, the picture
  alone, «Today» alone with the menu big, and a picture at full screen with its caption. They take turns by the shape
  of each picture or video and how much «Today» has, with a soft pass from one to the next. A video shows its caption
  over its first frame, then plays clean.
- **«Today» fills its slot**: two columns at the largest size at which nothing overflows; when nothing fits, notices
  and events turn pages. And **the coming days**: the events of the next week with their day in front («Tomorrow»,
  «Thu 5»), titles split on « - » («Camp» with «3º ESO» under it), and a countdown to the nearest event of more than a
  day.
- **The weather**, from MET Norway (free for any use, with its credit on the screen): now in the header, today and
  tomorrow in the moment of «Today». Each centre writes its location in the settings; the server looks it up once
  (OpenStreetMap) and asks MET Norway every half hour at most.
- **Agendas**: a new kind of content, an iCal address with its colour and where it goes (every screen, some groups,
  some screens). The server reads it every quarter of an hour and keeps the events of the next two weeks: one-off,
  all-day, many-day and repeating ones, with their exceptions and moved occurrences.
- **Sound** as an option of each screen (off by default); the video conversion keeps the sound now.
- **Media served by the service worker** from the cache, in pieces for videos, instead of held whole in memory (the
  old Chromium of some screens could not take several videos). A newer list of media waits for the one being brought
  instead of being dropped.
- The screen page shows what the screen itself reports (files that fail).
- Fixed: the nightly reload never happened on a screen with power hours (it is off at night); a slide could stay
  hidden and playing when two slides came close together; «Whole, over a blurred copy» had been lost; texts with «&»
  reached the screens as «&amp;»; the menu of the day after the change of time; a screen claimed at the last minute of
  its code; a device with its clock wrong asked for a new code every minute; a screenshot is checked to be an image;
  what a heartbeat brings is kept only as the contract says; the preview runs on the site's clock; the shell keeps one
  copy of each file; an event without an end stays an hour; indexes on where each item goes.
- Libraries a task does not have loaded (the file constants, curl) are loaded by the code that uses them, and a test
  checks it.
## 0.4.3 (2026-10-31)

- Fixed: a screen that reloaded while its site was being updated showed Moodle's maintenance page and stayed there.
  The service worker now keeps going with its copy of the player when the server answers with an error, as it does
  without a network; with no copy yet, the screen shows black and tries again every half minute.
- «Reload» on each screen of the panel, and «Reload every screen»: the screen reloads at its next heartbeat, within a
  minute, at its next change of slide.
- A screen reloads by itself when the server has a new player (the heartbeat says its build), instead of waiting for
  the night.
## 0.4.2 (2026-10-31)

- Fixed: the all-day events of a calendar subscription (a school's Google calendar, for example) never reached the
  screens. Moodle keeps them at midnight lasting nothing, and the screen took them as over as soon as they started. An
  event from midnight that lasts nothing, or up to another midnight, is now a whole day and lasts until the end of its
  last day.
## 0.4.1 (2026-10-31)

- Fixed: «Picture or video» failed to open on a site where the page had not loaded the file constants of the
  repositories (`FILE_INTERNAL`). The form loads them itself now, and a test checks that every file using them does.
- A test builds every form of the panel for every kind of content.
## 0.4.0 (2026-10-31)

- When an item shows, said as people say it: always, a single day, between two dates, from a date on or every day until
  a date; every day or only some days; all day or at some hours; every N weeks. Together they make every combination.
  The panel says it the same way («On 4/11», «From 2/11», «Until 18/12»).
- Video conversion runs at the lowest priority (`nice -n 19`): it takes every core it can, about four for a 4K video, and
  the pages of the site must not wait for it.
## 0.3.0 (2026-10-31)

- Each screen has its own page: how it is doing (on, off by its hours, or how long without a signal), the version of
  its player, its size, and a warning when its clock or time zone disagrees with the site's, since it runs its
  schedule by its own clock. There, its name, layout, light or dark, groups and hours on.
- A warning when a screen stops answering: after 15 minutes without a heartbeat within its hours, the people who run
  the screens (or the site admins, if nobody has the permission) get a Moodle notification with a link to the screen,
  and another one when it comes back. A screen that has just reached its hours has time to start first. It can be
  turned off for each screen.
- Videos made ready for the screens: with `ffmpeg` set in the settings, an ad hoc task converts each uploaded video,
  one at a time and with two threads, to what every screen plays (H.264 in MP4, 1080p and 30 fps at most, upright,
  without sound), with a still and a blurred still. Until it is ready the screens do not get it; if it fails, or after
  an hour, they get it as it was uploaded. Without `ffmpeg`, the panel says so.
- Fixed: the settings and the forms asked Moodle for strings it does not have («logo», «days»), which broke the
  installation of the tests. A test now checks every string the plugin asks for.
## 0.2.0 (2026-10-31)

- The server side of the contract in Moodle: a new screen asks for a code (`api/pair.php`), someone with
  `local/oksigeniahechauka:manage` gives it a name in `claim.php` (the QR of the screen opens it), and the screen
  picks up its key once (`api/poll.php`). Then its manifest, its files, its heartbeat and its screenshots, each with
  the key of the screen; a key can be revoked, and a new device can take the place of a screen.
- The manifest of each screen: the content made in the panel that reaches it (every screen, its groups or that
  screen), with dates, weekdays, hours and every N weeks; and what comes by itself: the menu of the day from
  Oksigenia Meals (each day's until the afternoon, then tomorrow's), the events of the site calendar and the site
  news as notices. The colours and logos of the site, light, dark or dark at night.
- The panel: the screens and whether they are on, adding a screen with its code, the content (picture or video,
  notice, event, ticker line) with its schedule and where it goes, the groups, and the preview: the same player,
  at the size of the screen, on the day and at the time chosen.
- The player keeps its own page for starting without a network; without a logo, the header starts with the name.
- Example content for demos (`cli/sample.php`), marked as example data on the screens.
- Tests: pairing, the schedule, what reaches each screen and the items of the contract.

## 0.1.0 (2026-10-31)

- The contract between a screen and its server, version 1 (draft): pairing with a code and a QR, the manifest with
  its schedule rules, media, heartbeat and screenshots (`docs/contract.md`).
- The screen player, built for Chromium 56 and later: the templates of the art direction in horizontal and vertical,
  light and dark, sized to the screen; pictures and videos that take turns with a cross-fade, a vertical picture or
  video kept whole over a blurred copy of itself; the menu, the notices and the events of the day, a page at a time;
  the ticker; power hours; media kept on the device for working without a network; pairing; heartbeat.
- A demo of the player with example data (`player/demo/`).
