# Changelog

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
