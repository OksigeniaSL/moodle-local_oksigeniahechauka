# Information screens for Moodle (Oksigenia Hechauka)

[![License: GPLv3](https://img.shields.io/badge/license-GPLv3+-blue.svg)](LICENSE)
![Moodle](https://img.shields.io/badge/Moodle-4.5%E2%80%935.3-orange)
![Status](https://img.shields.io/badge/status-pre--alpha-red)
[![Sponsor](https://img.shields.io/badge/sponsor-Oksigenia-00d4ff)](https://oksigenia.com/en/open-source#sponsor)

**Oksigenia Hechauka** runs the information screens of a school or a university from its Moodle™ site: notices,
pictures, videos, the events of the day and the menu of the canteen, each screen with its own schedule. What Moodle
already knows reaches the screens by itself, and every screen can be seen from afar exactly as it is.
*Hechauka* means "to show" in Guarani.

[Leer en español](README.es.md)

## Status

**Pre-alpha.** A screen opens one address and shows a code; someone gives it a name from the phone and it starts. The
panel («Screens», in the main bar) shows each screen as it is now and what is on them; adding content puts the screen
beside the form, changing as one types; an urgent notice covers every screen in two clicks. The menu of Oksigenia
Meals, the events of the calendar, the site news and the weather reach the screens by themselves. Not for production
sites.

## How it works

- **The plugin** keeps the screens, their groups and their content, with dates, weekdays, hours and "every N weeks".
  Each screen has its hours on; if it stops answering within them, the people who run the screens get a Moodle
  notification. What reaches the screens by itself: the menu of Oksigenia Meals, the events of the site calendar, the
  site news, the weather (MET Norway, with the location of the centre) and any iCal agenda added as content. With `ffmpeg` on the server (a static build is enough), each uploaded video is made ready for every
  screen: H.264, 1080p and 30 fps at most, one at a time.
- **Who runs the panel** need not be an administrator: four capabilities (view, publish in one's groups, publish
  everywhere, run the screens) and three roles made at install: «Publishes on the screens», «Publishes on every
  screen» and «Runs the screens». Whoever runs the screens chooses in the panel who publishes in each group and who
  publishes everywhere; the administrator chooses there who runs the screens, without going through Moodle's roles.
- **Each screen says what it is for** (informative, showcase or mixed, and another use at some hours) and from where it
  is read (3, 5 or 8 m, and whether behind glass): its compositions and the size of its letters come from that. In each
  slide one thing leads; the rest gives way to a third or, from afar, comes one at a time.
- **The player** is one web page that every screen opens: a small computer with a browser in kiosk mode, a smart TV
  with a kiosk browser or a professional display that loads a web page. It keeps what it needs on the device and goes
  on without a network.
- **The contract** between the screen and the server is documented in [docs/contract.md](docs/contract.md). The
  player only knows the contract, so the same player can work with another server.
- **In the Moodle app** there is nothing to open: the panel is a page for a computer, and a screen is claimed from
  the phone's browser with its QR code. The warnings about screens reach the app like any Moodle notification.

## Development

Code, comments and commit messages in English; texts in the language packs (`lang/en`, `lang/es`). The player lives
in `player/`: its sources in `player/src`, built with esbuild for the old browsers of professional displays
(`npm run build`), and its tests run on Node (`npm test`). The built bundle is committed, so whoever installs the
plugin builds nothing. `player/demo/` shows the player with example data. The panel follows [DESIGN.md](DESIGN.md): Mustache templates in
`templates/`, `styles.css` built from the design's own sheet plus `panel/extra.css`, and two plain scripts in `panel/`
(adding content and «Your school»). See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

GNU GPL v3 or later. See [LICENSE](LICENSE).

© 2026 Oksigenia SL — dev@oksigenia.cc

The word Moodle and associated Moodle logos are trademarks or registered trademarks of Moodle Pty Ltd or its
related affiliates. Oksigenia is not affiliated with Moodle HQ and is not a Moodle Certified Partner.
