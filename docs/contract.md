# The screen contract (version 1, draft)

Everything a Hechauka screen and its server say to each other. The player only knows this contract: it does not know
whether Moodle or another backend is behind it. This plugin is the first implementation; any server that speaks this
contract can drive the same player.

Version 1 is a draft until the first school runs on it. Until then it can still change without a new number.

## Rules

- HTTPS and JSON in UTF-8. The player also works on `http://localhost` for development.
- **Versioning.** `contract` is a whole number. Adding a field or an item type keeps the number; removing or changing
  the meaning of one raises it. Both sides ignore the fields they do not know, and the player skips item types it does
  not know.
- **Errors** come with an HTTP status and a body `{"error": "<code>", "message": "<text for a log>"}`.
- **Times.** Dates and hours in a manifest are wall-clock values of the screen (`"2026-11-02"`, `"08:30"`): the player
  evaluates them against the clock of the device it runs on. Instants (heartbeat times, expiry) are Unix seconds.
- **No user accounts on a screen.** A screen holds one key of its own, which the server can revoke at any time.

## Boot

The page that serves the player tells it where everything is, in a JSON block, so the player never builds a URL of
its own:

```html
<script id="hechauka-boot" type="application/json">
{
  "contract": 1,
  "mode": "screen",
  "lang": "es",
  "endpoints": {
    "pair": "https://school.example/local/oksigeniahechauka/api/pair.php",
    "poll": "https://school.example/local/oksigeniahechauka/api/poll.php",
    "manifest": "https://school.example/local/oksigeniahechauka/api/manifest.php",
    "heartbeat": "https://school.example/local/oksigeniahechauka/api/heartbeat.php",
    "screenshot": "https://school.example/local/oksigeniahechauka/api/screenshot.php"
  },
  "strings": {"pair_title": "…", "pair_steps": "…"}
}
</script>
```

- `mode`: `screen` for a real screen; `preview` inside the management panel (see «Preview»).
- `strings`: the few texts the player shows on its own (pairing, «no connection»), in the language of the site.
- `build`: the build of the player this page carries (see «Heartbeat»).
- The page, its script and its styles are kept on the device (a service worker), and used when the network fails or
  the server answers with an error, for example while the site is being updated.

## Pairing

A new screen shows a short code and a QR code. Someone with the right permission opens the QR (or types the code) on
the server, names the screen and chooses its groups and template. The screen then receives its key.

1. `POST pair` with `{"device": {"ua": "…", "width": 1920, "height": 1080, "dpr": 1}}` answers:

   ```json
   {"code": "KM7Q4X", "token": "…", "claim_url": "https://…/claim.php?code=KM7Q4X", "qr_svg": "<svg …>",
    "expires": 1793520000, "expires_in": 900, "poll": 5}
   ```

   - `code`: six characters from an alphabet without look-alikes (no `0 O 1 I L`).
   - `token`: the secret of this pairing; only the screen has it.
   - `claim_url`: what the QR opens.
   - `qr_svg`: the QR of `claim_url` as SVG markup, made by the server, so the player needs no QR library.
     Optional: without it the screen shows the code and the address.
   - `expires_in`: seconds the code lasts from now. The player counts with it, not with `expires`, so a device with
     its clock wrong waits the whole time.
   - `poll`: seconds between polls.

2. `POST poll` with `{"token": "…"}` every `poll` seconds answers one of:

   ```json
   {"status": "pending"}
   {"status": "paired", "key": "…", "screen": {"id": 7, "name": "Library"}}
   {"status": "expired"}
   ```

   The key is handed out once and the pairing is then forgotten. On `expired`, the player asks for a new code.

The key is 32 random bytes in base64url. The server keeps only its SHA-256.

## Calls with the key

`manifest`, `heartbeat`, `screenshot` and every media URL take the header `X-Hechauka-Key: <key>`. A custom header
and not `Authorization`, because some web servers drop that one before it reaches the application.

- `401` with `{"error": "revoked"}`: the key is no longer valid. The player forgets it and goes back to pairing.
- Any other failure (network, `5xx`, a `401` without that code): the player keeps its key and what it has cached, and
  tries again later.

## Manifest

`GET manifest`, with `If-None-Match: "<etag>"` when the player already has one. The answer is `304` if nothing
changed, or the manifest with its `ETag` header:

```json
{
  "contract": 1,
  "etag": "9f2c…",
  "generated": 1793520000,
  "horizon": "2026-11-16",
  "dayend": "16:00",
  "screen": {
    "id": 7, "name": "Library", "width": 1920, "height": 1080,
    "timezone": "Atlantic/Canary", "lang": "es", "sound": false
  },
  "template": "zones",
  "theme": {
    "mode": "light",
    "vars": {"--hk-primario": "#1b6f5c", "--hk-letra-titulos": "Nunito"},
    "logo": {"id": 12, "url": "…", "sha1": "…"},
    "logo_dark": {"id": 13, "url": "…", "sha1": "…"},
    "fonts": [{"family": "Nunito", "weight": 700, "media": {"id": 14, "url": "…", "sha1": "…"}}]
  },
  "labels": {"menu": "Menú de hoy", "notices": "Avisos", "events": "Hoy en el colegio", "ticker": "Al día",
             "upcoming": "Próximos días", "today": "Hoy", "tomorrow": "Mañana", "days": "días"},
  "power": [{"days": [1, 2, 3, 4, 5], "on": "07:30", "off": "18:30"}],
  "weather": {
    "now": {"symbol": "fair_day", "temp": 22},
    "today": {"symbol": "partlycloudy_day", "max": 24, "min": 18, "rain": 40, "text": "Intervalos nubosos"},
    "tomorrow": {"symbol": "lightrain", "max": 21, "min": 17, "text": "Lluvia débil"},
    "credit": "Datos de MET Norway"
  },
  "sample": false,
  "items": [ … ]
}
```

- `horizon`: the last day the manifest has data for. The server sends what is due from today to the horizon (two
  weeks is a good default), so a screen without a network keeps going. After the horizon the player keeps showing what
  it has and reports itself as stale.
- `use`: what the screen is for: `info` (inside: «Today», the menu, the notices, the agenda, with pictures and
  videos), `showcase` (seen from afar and by people from outside: only pictures and videos over the whole screen, their
  headline big and their web with a QR; no ticker) or `mixed` (also the weather in a third beside a picture or video).
  Without it, `info`.
- `useplan`: another use at some hours, as the power hours: `[{"days": [6, 7], "from": "00:00", "until": "24:00",
  "use": "showcase"}]` (days 1 Monday to 7 Sunday, none for every day; an `until` before `from` crosses midnight).
- `dayend`: when the day ends for the centre («HH:MM»). From then until midnight, «Today» shows tomorrow's events under
  «Tomorrow» and the coming days start after it; the server sends tomorrow's menu from the same hour.
- `screen.sound`: whether its videos play with their sound (most screens are muted: behind glass, or in a room that
  would hear the same thing forty times an hour).
- `screen.timezone`: the time zone the screen should be in. The player reports its own offset in the heartbeat, so
  the panel can warn when a device clock or zone is wrong.
- `template`: `zones` (the compositions of each slide, with «Today») or `full` (the pictures alone, never «Today»).
  The player chooses each slide's composition by the shape of its picture or video (`media.width` and
  `media.height`) and how much «Today» has. The orientation is the one of the page itself: a screen turned on its side
  lays itself out in vertical.
- `theme.mode`: `light`, `dark` or `auto` (dark from `theme.dark_from` to `theme.dark_until`, for example
  `"19:00"`–`"07:30"`).
- `theme.vars`: CSS custom properties of the templates, only names that start with `--hk-` (colours, the two fonts).
  The list is in the stylesheet of the player.
- `theme.logo` and `theme.logo_dark`: the client's logo for each theme; without the dark one, the light one serves for
  both. `theme.fonts`: the client's fonts, as media, so they work without a network too.
- `labels`: the titles of the blocks and the ticker, and the words of the coming days, in the language of the screen.
- `weather`: optional. The sky as a `symbol_code` of MET Norway (the player has an icon for each), temperatures in
  degrees Celsius, `rain` the chance of rain in percent only where the source gives it, `text` the sky in words, and
  the `credit` the source asks to show. `now` is the current hour; `today` and `tomorrow`, days of the site's calendar. `days`: the next three days, each with its `date` (for the weather in a third).
- `sample`: true when the manifest carries example data; the screen says so in a corner.
- `power`: when the screen should be on. Outside these hours the player shows black and a device agent may turn the
  display off. Without `power`, always on.

### Items

Every item has an `id`, a `type`, a `zone` (`main`, `side` or `ticker`) and, optionally, `duration` (seconds),
`order` and `when`. Items of a zone play one after another in `order`, each for its `duration`; a video lasts its own
length unless it has a duration.

| `type` | Zone | Fields |
|---|---|---|
| `image` | `main` | `media`, `fit` (`cover`, `contain` or `blur`), `focus` (`[x, y]` from 0 to 1, for `cover`), `caption`, `web` (optional: its web, shown on a showcase with a QR) |
| `video` | `main` | `media`, `poster` and `backdrop` (still images), `fit`, `caption`, `web` |
| `notice` | `side` | `title`, `body` (one short line), `tone` (`normal` or `important`) |
| `event` | `side` | `title`, `detail` (who or where, one line), `start` and `end` (`"2026-11-02T10:00"`), `allday`, `color` (1 to 6, optional: the centre's category), `holiday` (optional). A title «3º ESO - Acampada» reads as «Acampada» with «3º ESO» under it |
| `menu` | `side` | `date`, `label`, `menus`, `closed`, `title`, `note` |
| `ticker` | `ticker` | `text` |
| `urgent` | `urgent` | `title`, `body`, `ends` (optional, `"2026-11-02T11:46"`). The urgent notice: while one is live and its `ends` has not come, it covers the whole screen (red with white, striped edges, the clock) and nothing moves under it; the newest one wins. A screen off by its power hours shows it when it comes on, if it is still there |

- `caption`: `{"title": "…", "text": "…"}`, over the picture on a dark fade.
- «Today» has the menu, the notices, the events of the day and the coming days (the events of the next week, from
  the same items, with one countdown to the nearest event of more than a day). It fills its slot at the largest size
  at which nothing overflows; when nothing fits, notices and events turn pages.
- «La semana» shows the events of the next five school days, holidays and events of more than a day. A holiday is an
  event with `holiday: true`, or whose title starts with «Festivo», «No lectivo» or «Vacaciones» before « - ».
- The colour of an event is its category, one of the centre's own (the manifest's `categories`: `[{n, name, words}]`,
  up to six, `--hk-marca-1` to `-6` in the theme): the event's `color` if it has one; else the first category with a
  word that starts a word of the group of its title or of its `detail` («Ing» marks «Ingeniería Civil»; a word of
  several words, whole); without either, a neutral grey. Each centre names its categories: nothing is fixed.
- An `event` disappears by itself once its end has passed (an hour after its start if it has no end; the end of its
  last day if it is all day). `color` picks one of the centre's categories (`--hk-marca-1` to `-6`).
- A `menu` is the menu of one day: `menus` is `[{"name": "Menu A", "courses": [{"label": "First course", "dishes":
  ["…"]}]}]`, and every menu is a page of the block. `label` replaces the title of the block (the server can show
  tomorrow's menu in the afternoon, with its own `when` and «Tomorrow's menu»). With `closed`, `title` says why.
- `fit: blur` shows the whole picture or video over a blurred copy of itself, the way a vertical video fills a
  horizontal screen. For videos the blurred copy is the still `backdrop`, never a second video.

A **media** object, wherever it appears:

```json
{"id": 45, "url": "https://…/media.php?id=45", "sha1": "…", "size": 4182233, "mime": "video/mp4",
 "width": 1080, "height": 1920, "duration": 31.5}
```

The player caches media by `sha1` and deletes what no manifest references any more. Videos should arrive as H.264 in
MP4, 1080p at most and 30 fps; the server converts them on upload when it can.

### When

All fields are optional; an item without `when` is always on.

```json
{"from": "2026-11-02", "until": "2026-12-18", "days": [1, 3, 5], "times": [["08:00", "10:30"]], "every": 2}
```

- `from` and `until`: first and last day, both included.
- `days`: ISO weekdays, 1 for Monday to 7 for Sunday.
- `times`: time ranges, start included and end excluded. A range whose end is earlier than its start crosses
  midnight.
- `every`: every N weeks, counting from the week (Monday to Sunday) of `from`.

## Heartbeat

`POST heartbeat` every minute:

```json
{
  "time": 1793520060, "tz_offset": 0, "version": "0.1.0", "uptime": 86400,
  "manifest": "9f2c…", "stale": false,
  "showing": [{"zone": "main", "item": "i12"}, {"zone": "side", "item": "i30"}],
  "display": {"width": 1920, "height": 1080},
  "cache": {"files": 14, "bytes": 182334112},
  "errors": ["media 45: 404"]
}
```

- `tz_offset`: minutes east of UTC on the device, now.
- `errors`: the last few, short.

Answer:

```json
{"manifest": "9f2c…", "commands": ["reload"], "build": 2026103106}
```

- When `manifest` differs from the etag the player holds, it fetches the manifest again.
- `commands`: what the screen was asked to do, handed out once. `reload`: the page loads again (at its next change of
  slide). Restart and «screenshot now» will go here too.
- `build`: the build of the player on the server, the same value as `build` in the boot block. A screen whose page
  came with another build reloads, at its next change of slide, to pick up the new player.

## Screenshot

`POST screenshot` with the image as the body (`Content-Type: image/jpeg` or `image/png`, 2 MB at most), answered with
`204`. It shows what the screen is really showing, a few times an hour. Usually the device agent sends it; the player
does it where the platform lets a page capture itself.

## Preview

The management panel runs this same player at the size of a screen, inside the page, with `mode: preview`:

- the manifest comes with the session of the person signed in to the panel, not with a screen key;
- the clock is the one chosen in the panel («Monday at ten»), and it runs from there;
- no service worker, no heartbeat and no screenshot.

Because it is the same player with the same manifest, what the preview shows is what the screen will show.

## Still open in version 1

- How a device agent (CEC, screenshots, restarts) gets the key of the screen it lives with.
- The record of what was played («proof of play»).
- Approval before publishing.

## The panel's preview

In `preview` mode the player also listens to messages from the page that holds it, of the same origin only: `hkDraft`
(`{item, items, replaces, focus}`: an item being written, as this contract gives it, shown standing still where it
would go, `focus` being `main`, `full`, `today` or `week`; `null` to go back to the turns) and `hkTheme` (`{vars, mode}`:
colours and light or dark being chosen). It answers `hkPreviewReady` once it has its manifest. A screen ignores them.

