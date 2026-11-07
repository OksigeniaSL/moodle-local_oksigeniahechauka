# The screen's own device

What turns a Raspberry Pi (3, 4 or 5) or a mini computer with a television into a Hechauka screen: Raspberry Pi OS with a
session that only runs the player at full screen, an **agent** that looks after it, and a **guardian** that looks after the
agent and keeps all of this up to date. A screen works without it, with any modern browser in kiosk mode; with it, the
television switches on and off with the screen's hours (HDMI-CEC), the panel sees what the screen really shows, and a
frozen picture or a hung browser recovers by itself.

- `raiz/` is what goes into the device's file system, as it is.
- `instala.sh` installs it on the first boot of a fresh Raspberry Pi OS (cloud-init runs it from the boot partition).
- `imagen/` builds the card: `bash device/imagen/construye.sh WORK_FOLDER --xz` makes the card for every centre, the one
  published with the plugin's releases; its options make a card for one screen.
- `test/` tests where a screen finds its Moodle: `python3 -B -m unittest discover -s device/test`.
- `manifest.json` lists every file of `raiz/` with its SHA-256; `manifest.sig` is Oksigenia's Ed25519 signature of it.
  `python3 -B device/manifest.py` makes the manifest; the signature is made apart, with a private key that is not here.

## One card for every centre

The card knows no Moodle. A centre that has installed the plugin prepares its screens by itself, from the panel page
«A Raspberry Pi for the screen» (`prepare.php`): it writes the image with Raspberry Pi Imager («Use custom», which offers no
customisation for an image of its own, so nothing overwrites the installation) and tells it its Moodle in one of two ways:

- **a file on the card**: the panel's `hechauka.conf`, copied to the `bootfs` drive, with the address of the player, the
  name of the screen on the network, its time zone and, if wanted, the SSH keys of whoever looks after it. `instala.sh`
  reads it (it never runs it) and takes it off the card;
- **on the screen**: with no address, or one that does not answer, the screen asks for it (`hechauka-ajuste`, port 8080):
  typed with a keyboard, or from a phone on the same network through the QR it shows, which carries a PIN. It checks that
  a Moodle with Hechauka answers there (`api/device.php?f=hola`), keeps the address, takes the Moodle's time zone and
  starts the player, which shows its code to be added from the phone.

A screen that worked once never goes back to asking by itself: without a network it shows what it has. To move it to
another Moodle, by SSH: `sudo hechauka-direccion aula.example.org`.

## How a screen keeps itself up to date

The guardian (`raiz/usr/local/lib/hechauka/actualiza.py`, as root) asks its own Moodle twice a day for
`api/device.php?f=manifest.json` and its signature. It only believes a manifest that checks out against
`/etc/hechauka/firma.pub`, so whoever got into a Moodle cannot send code to its screens. It downloads what changed, checks
each file against its hash and keeps it aside, on the card so that a reboot does not lose it, until the screen is off by its
hours or, on one that is never off, until the small hours of the night (a day at most). Then it puts it in, with a copy of
what it replaces; if the agent gives no sign of life within ten minutes, the copy goes back and that version
is not tried again. Its log is `/var/log/hechauka-actualiza.log`.

Updating the plugin in a Moodle updates the devices of all its screens. To look now, by SSH:
`sudo touch /run/hechauka/actualiza-ya`.

A centre that changes `raiz/` for its own devices signs its manifest with its own key and puts its public half in
`raiz/etc/hechauka/firma.pub` of its cards.

## Samsung professional displays, without a Pi

Samsung's professional displays (SSSP, Tizen 4 to 6.5) open a web page through an app that their URL Launcher installs from
an address. The plugin serves that app next to the player, `player/sssp_config.xml` and `player/Hechauka.wgt`, so the
address of the player (`https://MOODLE/local/oksigeniahechauka/player/`) is also the one for the URL Launcher. The package
is the same for every centre: the first time it asks for the address of the Moodle with the remote (the Moodle's own, the
player's, or a short one that leads to it), checks that Hechauka answers there (`api/device.php?f=hola`) and keeps it; from
then on it opens the player, and without a network it waits for one.

- `samsung/app/` is the app: plain HTML, CSS and JavaScript for Chromium 56, with nothing from outside.
- `bash device/samsung/construye.sh` signs it (with the Tizen Studio command line and Oksigenia's Tizen author certificate,
  both outside the repository) and leaves the two files in `player/`. Each change to the app raises the last number of its
  version in `app/config.xml`, which the displays compare to update themselves.
- `python3 -B device/samsung/comprueba.py` checks the package: the app as it is, its size and version, and both signatures
  with their certificates. `test/test_samsung.py` runs it.
