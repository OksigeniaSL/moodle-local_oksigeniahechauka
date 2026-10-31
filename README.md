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

**Pre-alpha.** A screen opens one address and shows a code; someone gives it a name in Moodle and it starts. The
panel keeps the screens, the content and its schedule, and shows a preview of each screen at any day and time. The
menu of Oksigenia Meals, the events of the calendar and the site news reach the screens by themselves. Not for
production sites.

## How it works

- **The plugin** keeps the screens, their groups and their content, with dates, weekdays, hours and "every N weeks".
- **The player** is one web page that every screen opens: a small computer with a browser in kiosk mode, a smart TV
  with a kiosk browser or a professional display that loads a web page. It keeps what it needs on the device and goes
  on without a network.
- **The contract** between the screen and the server is documented in [docs/contract.md](docs/contract.md). The
  player only knows the contract, so the same player can work with another server.

## Development

Code, comments and commit messages in English; texts in the language packs (`lang/en`, `lang/es`). The player lives
in `player/`: its sources in `player/src`, built with esbuild for the old browsers of professional displays
(`npm run build`), and its tests run on Node (`npm test`). The built bundle is committed, so whoever installs the
plugin builds nothing. `player/demo/` shows the player with example data. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

GNU GPL v3 or later. See [LICENSE](LICENSE).

© 2026 Oksigenia SL — dev@oksigenia.cc

The word Moodle and associated Moodle logos are trademarks or registered trademarks of Moodle Pty Ltd or its
related affiliates. Oksigenia is not affiliated with Moodle HQ and is not a Moodle Certified Partner.
