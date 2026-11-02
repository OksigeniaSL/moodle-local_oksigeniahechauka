# The screen's own device

What turns a Raspberry Pi (3, 4 or 5) or a mini computer with a television into a Hechauka screen: Raspberry Pi OS with a
session that only runs the player at full screen, an **agent** that looks after it, and a **guardian** that looks after the
agent and keeps all of this up to date. A screen works without it, with any modern browser in kiosk mode; with it, the
television switches on and off with the screen's hours (HDMI-CEC), the panel sees what the screen really shows, and a
frozen picture or a hung browser recovers by itself.

- `raiz/` is what goes into the device's file system, as it is.
- `instala.sh` installs it on the first boot of a fresh Raspberry Pi OS (cloud-init runs it from the boot partition).
- `manifest.json` lists every file of `raiz/` with its SHA-256; `manifest.sig` is Oksigenia's Ed25519 signature of it.
  `python3 -B device/manifest.py` makes the manifest; the signature is made apart, with a private key that is not here.

## How a screen keeps itself up to date

The guardian (`raiz/usr/local/lib/hechauka/actualiza.py`, as root) asks its own Moodle twice a day for
`api/device.php?f=manifest.json` and its signature. It only believes a manifest that checks out against
`/etc/hechauka/firma.pub`, so whoever got into a Moodle cannot send code to its screens. It downloads what changed, checks
each file against its hash and keeps it aside until the screen is off by its hours, or for a day at most. Then it puts it in,
with a copy of what it replaces; if the agent gives no sign of life within ten minutes, the copy goes back and that version
is not tried again. Its log is `/var/log/hechauka-actualiza.log`.

Updating the plugin in a Moodle updates the devices of all its screens. To look now, by SSH:
`sudo touch /run/hechauka/actualiza-ya`.

A centre that changes `raiz/` for its own devices signs its manifest with its own key and puts its public half in
`raiz/etc/hechauka/firma.pub` of its cards.
