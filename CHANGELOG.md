# Changelog

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
