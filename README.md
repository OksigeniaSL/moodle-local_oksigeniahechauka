# Information screens for Moodle (Oksigenia Hechauka)

[![License: GPLv3](https://img.shields.io/badge/license-GPLv3+-blue.svg)](LICENSE)
![Moodle](https://img.shields.io/badge/Moodle-4.5%E2%80%936.0-orange)
![Status](https://img.shields.io/badge/status-alpha-orange)
[![Sponsor](https://img.shields.io/badge/sponsor-Oksigenia-00d4ff)](https://oksigenia.com/en/open-source#sponsor)

**Oksigenia Hechauka** runs the information screens of any centre from its Moodle™ site (a school, a university, an
academy, a town hall, a company): notices, pictures, videos, the events of the day and the menu of the canteen, each
screen with its own schedule. What Moodle already knows reaches the screens by itself, and every screen can be seen from
afar exactly as it is. *Hechauka* means "to show" in Guarani.

[Leer en español](README.es.md)

## Status

**Alpha**, in use since November 2026 with screens of every kind below (two Raspberry Pi and two Samsung professional
displays, one of them a touch screen). A screen opens one address and shows a code; someone gives it a name from the
phone and it starts. The panel («Screens», in the main bar) shows each screen as it is now and what is on it; adding
content puts the screen beside the form, changing as one types; an urgent notice covers every screen in two clicks.

## Installation

1. Put the plugin in `local/oksigeniahechauka` and upgrade the site, as any plugin. Moodle 4.5 to 6.0.
2. Open «Screens» in the main bar: the first time it is «Get started», five steps in one page (the kind of centre, its
   look, what comes by itself, where it is and its first screen).
3. Optional on the server: `ffmpeg` (a static build is enough, found by itself or set in the settings), so that every
   uploaded video is made ready for every screen.

## The screens

One address, the player's (`https://YOUR-MOODLE/local/oksigeniahechauka/player/`), shown in «Get started» and in «Add a
screen», with a short one when the site has a shortener:

- **A TV or a small computer with a browser**: open that address in full screen (kiosk mode).
- **A Samsung professional display** (Tizen 4 to 6.5): the same address in its URL Launcher («Install Web App»). The
  plugin serves the signed app it asks for next to the player. See [device/README.md](device/README.md).
- **A Raspberry Pi**: «A Raspberry Pi for the screen», in the panel, gives the card image and a file with the address of
  the site; the device keeps itself up to date from the site, signed by Oksigenia.

Each one shows a code; whoever runs the screens names it from their phone with the QR.

## What it asks outside the site

Nothing until the centre turns it on or gives what it needs:

- **The picture of the day** (on by default, can be switched off): a list and its pictures from a server of Oksigenia,
  `recursos.oksigenia.com`, once an hour. Nothing of the site is sent.
- **The weather**: the place of the centre is looked up once with OpenStreetMap's Nominatim; the forecast comes from
  MET Norway every hour. Only when the centre has a place.
- **Instagram**: the Graph API of Meta, once an hour, only with a key of the centre.
- **Cifra** (pupils' birthdays): only when the site has an OAuth 2 connection to it.
- **A link shortener**: only when the site has one (the common piece `shortener`), for the QR codes.

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
  slide one thing leads; the rest gives way to a third or, from afar, comes one at a time. There is an agenda that goes up
  with the month beside it, and photo albums that show in a third or in a mosaic.
- **Surprises**, if the centre wants them: now and then a 3D character crosses the screen, stops, looks at whoever is
  passing, makes a gesture and runs away. Or, on the dates the centre sets, it snows, and it rains when it really rains.
- **The player** is one web page that every screen opens: a small computer with a browser in kiosk mode, a smart TV
  with a kiosk browser or a professional display that loads a web page. It keeps what it needs on the device and goes
  on without a network.
- **The user's guide**, in English ([docs/guia/en.md](docs/guia/en.md)) and in Spanish
  ([docs/guia/es.md](docs/guia/es.md)), each with its printed version, is also inside the panel, in its «Guide» tab.
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
(adding content and «Your centre»). See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

GNU GPL v3 or later. See [LICENSE](LICENSE).

© 2026 Oksigenia SL — dev@oksigenia.cc

The word Moodle and associated Moodle logos are trademarks or registered trademarks of Moodle Pty Ltd or its
related affiliates. Oksigenia is not affiliated with Moodle HQ and is not a Moodle Certified Partner.
