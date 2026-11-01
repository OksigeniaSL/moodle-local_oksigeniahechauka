# DESIGN.md · Oksigenia Hechauka, the panel

The panel is where a school runs its information screens from Moodle: what each screen shows now, what goes on them
(photos and videos, notices, events, ticker lines, calendar feeds), when and where, the screens themselves and who
publishes on each group of them. This file is the panel's design: read it before touching any page of the panel. The
screens' own design (the player and its compositions) lives with the player.

Scope: Moodle 4.5 to 5.3, theme Boost and themes based on it, light and dark mode (Moodle 5.3), desktop and phone.

## 1. Principles

1. **What is on the screens comes first.** The first thing seen is each screen and what it shows now, and whether one
   needs someone. Settings come after, and only for whoever can change them.
2. **One main action per page.** On the home page, «Añadir». In a form, «Publicar». The main action says what happens
   («Publicar en 6 pantallas») and stays in sight while the form is in sight.
3. **The preview is always at hand.** Every screen card is its own picture; every form has the screen beside it,
   updated as the person types; any screen opens in a full preview in one click.
4. **Said as people say it.** «Hasta el viernes 6», not «2026-11-06 23:59». Dates in words, the end of a thing
   always visible, nothing technical on view (no versions, no addresses, no ids, no «manifest»).
5. **Defaults that publish.** A notice, a photo or a ticker line can be published without touching «Cuándo» or
   «Dónde»: the defaults are sensible and end by themselves (nothing stays forever by accident).
6. **Each person sees what is theirs.** A teacher sees their own content and their own groups; the office sees
   everything; management looks; the person who runs the screens gets the screens. Nothing locked is shown greyed out:
   it is not shown.
7. **The panel wears the site's theme.** Colours, fonts and radii come from the theme. No product branding and no
   school identity in the panel; the school's colours and logo belong on the screens.
8. **Fast journeys.** A notice until Friday in 3 steps, the urgent notice in 2 (and off in 1), a photo with its
   caption in 3, a new screen from a phone in 3.

## 2. Atmosphere and identity

The panel's own look comes from what it handles: screens. Each screen is drawn as a small television hanging on a
wall: a black bezel with a status light on its lower edge, and inside it the screen's picture. Content is drawn with
the pieces the screens use (the notice with its amber stripe, the event with its time chip, the ticker band), so the
list already looks like what will appear. Time is said in words and shown on a two-week strip.

It should feel like a calm control room: quiet surfaces, the screens as the only images, colour only where it means
something (a state, a category of the centre, the urgent red).

## 3. Who sees what

Four capabilities, in system context. The panel is its own page (`/local/oksigeniahechauka/index.php`), reached from
a «Pantallas» link in the primary navigation and in the user menu, never through the site administration.

| Profile (capability) | Home | Can do |
|---|---|---|
| Looks (`view`), e.g. management | Every screen and everything that is on them, read-only | Preview |
| Publishes (`publish`), e.g. a teacher | «Lo tuyo» (their own content) first, then «Dónde sale» (the screens of their groups) | Add and edit their own; targets: only their groups and the screens in them |
| Publishes everywhere (`publishall`), e.g. the office | The screens, then everything that is on them, «De todos» or «Lo mío» | Add and edit anyone's; target any screen; the urgent notice |
| Runs the screens (`managescreens`), e.g. the IT coordinator | As the office, plus tabs «Pantallas y grupos» and «Tu centro» | Add, reload, configure and remove screens; groups and who publishes in each; the school's place, colours and logo; gets the screen-down alerts |

What stays in Moodle's site administration: the technical settings (the path of the video converter, the sources
that are switched on or off). The page «Tu centro» writes the same settings as the administration for the place,
the colours and the logo, so the person who runs the screens does not need to be an administrator.

## 4. Layout

### Pages and dialogs

| Page | What | Main action |
|---|---|---|
| Home («Lo que sale») | Health line · the wall of screens · the content in three groups | «Añadir» (and «Aviso urgente» beside it, outlined) |
| Add or edit | Type switch · the fields · «Cuándo» · «Dónde» · the preview beside | «Publicar en N pantallas» |
| A screen's sheet | The preview (or the real capture) on the left, sticky · settings cards on the right | «Guardar cambios», in a save bar that appears with the first change |
| Screens and groups | The list of screens · a card per group with its screens and its publishers | «Añadir una pantalla» |
| Tu centro | The place for the weather · the colours · the logo · the screen beside | «Guardar» |
| New screen (phone, `claim.php`) | Screen found · new or replacing · name and groups | «Empezar» |
| Dialog: urgent notice | Kind · text · where · until when · the urgent screen beside | «Ponerlo ya en las N pantallas» |
| Dialog: preview of a screen | The screen large · now or another moment · previous/next slide · what is on it now | (none; it only shows) |
| Dialog: add a screen (desktop) | The address to open on the TV · the code field | «Seguir» |

### Grid and widths

- Moodle's standard page, full width (no `limitedwidth`). Inside, `.hkp` is a size container
  (`container: hkp / inline-size`), so every layout follows the width the panel really has, with the drawers open or
  closed.
- The wall: `repeat(auto-fill, minmax(min(100%, 15rem), 1fr))`, gap 1rem. Four to five screens a row on a laptop,
  two on a phone.
- Content rows: thumb · title and meta · «Cuándo» · «Dónde» · actions (`6rem 1.5fr 1fr .9fr auto`). Under 70rem the
  when and where go under the title.
- Forms with preview (add, Tu centro): `minmax(0, 1fr) minmax(22rem, .95fr)`, the preview sticky under the navbar.
  Under 60rem: one column, the preview after the first fieldset (so it is seen while typing).
- Breakpoints (container): 70rem (rows stack), 60rem (one column), 46rem (dialogs' two columns stack), 36rem (phone).
- Spacing scale: .25 · .5 · .75 · 1 · 1.25 · 1.5 · 2 rem. Sections 2rem apart; cards 1rem; inside a card .75–1rem.
- Text fills its box: never a `max-width` in `ch` or `px` on paragraphs, hints or card text.
- Checked at 1280 × 800, at 1100 × 540 (a Chromebook with zoom: the main action and the first screens in view), in an
  800 px frame and at 390 px.

## 5. Colour tokens

All under `.hkp`. Moodle 5.x runs Bootstrap 5 (`--bs-*`); Moodle 4.5 runs Bootstrap 4.6, whose variables have no prefix
(`--primary`, `--success`…) and no surface variables; the last value is Boost's. Moodle 5.3 dark mode sets
`<html data-bs-theme="dark">` and re-points `--bs-white` to the raised surface, which is what cards use.

| Token | Role | From the theme | Boost light | Boost dark (5.3) |
|---|---|---|---|---|
| `--hkp-ink` | Text | `--bs-body-color` | `#1d2125` | `#dee2e6` |
| `--hkp-muted` | Secondary text | `--bs-secondary-color` | `rgba(29,33,37,.75)` | `rgba(222,226,230,.75)` |
| `--hkp-page` | Page | `--bs-body-bg` | `#f8f9fa` | `#1d2125` |
| `--hkp-card` | Cards, dialogs | `--bs-white` → `--white` | `#fff` | `#343a40` |
| `--hkp-sunk` | Recessed areas | `--bs-tertiary-bg` | `#f8f9fa` | `#292e33` |
| `--hkp-line` | Dividers, card borders | `--bs-border-color` | `#dee2e6` | `#495057` |
| `--hkp-edge` | Chips, toggles (3:1) | mix of ink 58% and card | ≈ `#7b7d80` | ≈ `#9a9fa4` |
| `--hkp-accent` | Fills: chosen, main | `--bs-primary` → `--primary` | `#0f6cbf` | `#0f6cbf` |
| `--hkp-accent-ink` | Text on accent tints | accent 82% + black / link 72% + white | ≈ `#0c599d` | ≈ `#93bde3` |
| `--hkp-accent-edge` | Borders of chosen things | accent / `--bs-link-color` | `#0f6cbf` | `#6fa7d9` |
| `--hkp-ok`, `-ink`, `-dot` | Running | `--bs-success`, `--bs-success-text-emphasis` | `#357a32` | `#86af84` |
| `--hkp-warn`, `-ink`, `-dot` | Needs a look | `--bs-warning`, `--bs-warning-text-emphasis` | `#f0ad4e`, `#60451f` | `#f6ce95` |
| `--hkp-bad`, `-ink`, `-dot` | No signal, danger | `--bs-danger`, `--bs-danger-text-emphasis` | `#ca3120` | `#df8379` |
| `--hkp-*-tint`, `--hkp-*-line` | Soft fills and their borders | `color-mix()` of each colour into the card, 9% / 40% (dark 16% / 55%) | | |
| `--hkp-wall` | The wall behind the screens | ink 5% into the page (dark: black 22%) | | |

Colours that are not the theme's, on purpose:

| Token | Value | Why |
|---|---|---|
| `--hkp-bezel` | `#121417` (dark `#0b0c0e`) | A screen is a black object in both modes |
| `--hkp-led-on` / `-off` / `-down` / `-warn` | `#3ddc6f` / `#6c737b` / `#ff5a47` / `#ffb21f` | Lights on a black bezel |
| `--hkp-urgent` | `#9f1d16`, white text (7.8:1) | The urgent notice is the screens' red, the same on the screen and in the panel |
| `--hkp-stage-1…6` | The colours of the centre's own categories, up to six, set in «Tu centro» (none by default; the palette for new ones `#1f5f8b`, `#2f8a55`, `#c9842a`, `#b23a48`, `#6b4fa0`, `#1b8a8f`; dark `#6aa6d6`, `#6cc79a`, `#f0b452`, `#f08a96`) | Set in «Tu centro»; output by PHP as inline variables on `.hkp`. They mark (a stripe, a dot, a tint), never carry text: any colour can be chosen |

Never Bootstrap's fixed utilities (`bg-warning text-dark`, `bg-light`): they do not follow the mode.

## 6. Type

The theme's font and scale; no font of our own.

| Level | Size | Weight |
|---|---|---|
| Page title (h1) | 2rem (1.6rem under 36rem) | 700 |
| Section (h2) | 1.3rem | 700 |
| Card title, legend | 1.05–1.1rem | 700 |
| Group title («En pantalla ahora») | 1rem | 700 |
| Body | 1rem / 1.5 | 400–600 |
| Meta, hints | .875rem | 400–600 |
| Counts, chips' numbers, smallest | .8125rem; never under .75rem (12 px) | 600–700 |

Numbers (times, dates, counts, coordinates) with `font-variant-numeric: tabular-nums`. Titles with
`text-wrap: balance`.

## 7. Components

Reuse Moodle's own: buttons (`btn btn-primary`, `btn-outline-secondary`, `btn-danger`, `btn-outline-danger`,
`btn-link`, `btn-icon`), fields (`form-control`, `form-select`), switches (`form-switch`), modals (`core/modal`),
the people search (`core/form-autocomplete` with a user selector), notifications (`core/toast`). What follows is ours.

### Screen card (`.hkp-screen`)

- A wall slot (16:9, `--hkp-wall`) with the bezel inside (`.hkp-bezel`, `.is-v` for a vertical screen, which keeps
  the row even), the picture, and the LED on the bezel's lower edge.
- The picture: the real capture when the device sends one, otherwise the preview rendered by the player
  (`preview.php?frame=1`), refreshed every few minutes. Off by schedule: the last picture dimmed with a pill
  «Apagada». No signal: the last picture without colour and a pill «Última imagen, 10:11».
- Body: the name (a link to the sheet, for whoever runs the screens; the whole card is the link's target), the state
  badge, and «Ahora: <what it shows>» on one line with an ellipsis.
- Actions, small outlined buttons with icon and word: «Vista previa» (everyone), «Recargar» (runs the screens;
  shows «Recargando…» until the screen answers). On a phone, icons only, with their labels for screen readers.
- The last card of the wall, for whoever runs the screens: «Añadir una pantalla», dashed, with the QR drawing.
- States: rest; hover (border `--hkp-edge`, lifts 2 px); focus (the theme's ring); down (border `--hkp-bad-line`).

### State badge (`.hkp-state` with `data-state`)

| State | Dot | Word | Meta |
|---|---|---|---|
| `on` | full circle, `--hkp-ok-dot` | «En marcha» | «señal hace 1 min» |
| `off` | hollow ring | «Apagada por horario» | «se enciende el jueves a las 16:00» |
| `down` | full, crossed, pings twice | «Sin señal» | «desde las 10:12» |
| `warn` | diamond, `--hkp-warn-dot` | «Reloj desviado» (or the warning) | «va 6 min tarde» |
| `new` | dashed ring | «Sin estrenar» | «esperando la primera señal» |

Shape and word say the state; colour only adds to it. The LED on the bezel repeats it.

### Health line (`.hkp-health`)

- All well: one quiet line, «Las 6 pantallas, bien · última señal hace 1 min».
- Something needs someone: a danger-tinted box, «Comedor no da señal desde las 10:12.» first, in bold, then any
  warning, then «Las demás, en marcha.», and «Ver qué le pasa» for whoever can act. For whoever cannot, the sentence
  ends «Ya lo sabe <nombre>, que lleva las pantallas.»
- Urgent notice on: the red banner (`.hkp-urgent-on`), «Aviso urgente en 5 pantallas desde las 10:46», the text in
  large, and «Quitarlo de las pantallas» in white: one click to take it off.

### Content row (`.hkp-item`)

- Thumb (`.hkp-thumb`, 16:9, 6rem): the photo; a video with its length; a vertical photo whole on dark; a notice as
  a small notice block (amber stripe, two bars, the first bar amber when important); an event as its day with the
  category's colour on top; a ticker line as the band; a calendar feed as a month of coloured days. Drawn, never
  written small.
- Title (bold), then meta: type with icon, «Importante», detail, author as «De Marta Gil» (only when it can be someone
  else's).
- «Cuándo»: the phrase in bold («Hasta el viernes 6», «Del 2/11 al 15/11», «Siempre»), and under it the hours or
  days («L M X J V · 10:30–11:30») or how long is left («quedan 3 días», «acaba hoy», in the warning colour when it is
  four days or less).
- «Dónde»: «Todas las pantallas», a group («Infantil», «2 pantallas» under it) or the screens by name.
- Actions: «Editar» and «⋯» (Duplicar, Quitar de las pantallas, Borrar with confirmation). In «Ya no sale», «Poner
  otra vez». Only on what the person may edit.
- Three groups, in this order: «En pantalla ahora» (with a red on-air dot), «Más adelante», and «Ya no sale» folded
  (`<details>`), never mixed. Filters by type as chips with their counts; «De todos / Lo mío» for the office.
- Photos and videos can be reordered by dragging and with «Subir / Bajar» in «⋯» (the keyboard way).

### Chips (`.hkp-chip`)

- Toggles (`<button aria-pressed>`) and choices (a radio inside a `<label>`); 2.5rem high (2.25rem `.is-small`),
  fully round.
- Chosen: accent tint, accent border, accent ink, bold, and a tick drawn before the word: never colour alone.
- A count inside in `<small>` («Infantil 2»).

### «Cuándo» (the when editor)

1. **Shortcuts** as radio chips: «Solo hoy», «Hasta el viernes», «Dos semanas», «Siempre», «Otras fechas». For an
   event: «Hasta que pase», «Solo ese día», «Desde ya, sin fin», «Otras fechas». A calendar feed has no «Cuándo»: it
   brings its own dates.
2. **The sentence**, live (`aria-live="polite"`), in a soft accent box: «Sale desde hoy hasta el viernes 6 de
   noviembre, todo el día.»; «Sale del martes 3 al jueves 12 de noviembre, solo los lunes y miércoles, de 08:00 a
   10:30.»; «Sale desde hoy y no caduca.»
3. **The strip**: this week and the next, a cell per day with its letter and number; days it shows on are filled with
   the accent, today ringed, weekends lighter; «…y sigue, hasta que lo quites.» when it has no end.
4. **«Otras fechas»** opens «Desde» and «Hasta» (empty: no end). One pair of dates covers the plugin's modes: same
   day twice is «Un solo día»; only «Desde» is «Desde una fecha»; only «Hasta» is «Hasta una fecha».
5. **«Solo algunos días u horas»** (folded): day toggles L M X J V S D (round buttons, `aria-pressed`, the day's full
   name as label), «Solo a ciertas horas» (switch, then «de 08:00 a 10:30» and «Otra franja»), «Repetir» (Todas las
   semanas, Cada 2…4 semanas).

Defaults: notice «Hasta el viernes» (the next Friday; on a Friday, «Solo hoy»), photo or video «Dos semanas», ticker
line «Hasta el viernes», event «Hasta que pase».

In lists the same rule in short: «Del 2/11 al 30/11 · L X · 08:00–10:30».

### «Dónde»

Toggle chips: «Todas las pantallas 6» (exclusive), each group with its count, «Elegir pantallas…» (opens the screens
as chips, each with a small horizontal or vertical TV icon). Under them, live: «Sale en 4 pantallas: Entrada,
Biblioteca, Secretaría y Comedor.» A teacher sees only their groups, already chosen, and never «Todas».

### Preview pane (`.hkp-preview`)

- «Así se verá», the moment («Ahora · lunes 2, 10:45»), chips with the screens the content goes to (choose which one
  to look at), and the screen in its bezel on the wall, horizontal or vertical as that screen is.
- The frame is the player itself (`preview.php?frame=1`), at the screen's real size scaled to the box, with the
  draft sent by `postMessage` as the person types: nothing is saved to preview.
- A switch of moments under it: for a notice «Con foto / «Hoy» en grande», for a photo «Con «Hoy» / A toda pantalla».
- One line that explains what will happen there: «En Entrada sale en la columna «Hoy», con 1 aviso más: se turnan si
  no caben.» «Importante: va el primero, en color, y no se turna con los demás.» «Foto vertical: sale en un hueco de
  su forma, con «Hoy» al lado.»
- «Abrir en grande» opens the preview dialog: «Ahora» or «Otro momento» (day and hour), «‹» and «Siguiente ›» through
  the slides with «Diapositiva 2 de 5: «Hoy» en grande», and «Lo que sale aquí ahora».

### The urgent notice

- A dialog with a red header and striped edge (the screens' urgent look): «Sale enseguida, a pantalla completa, y se
  queda hasta que lo quites.»
- «¿Qué pasa?»: «Simulacro», «Lluvia fuerte», «Salida anticipada», «Otra cosa»; each fills the text and the line
  under it, ready to change. «Dónde»: «Todas las pantallas» chosen. «Hasta cuándo»: «Hasta que lo quite» (default),
  «Una hora», «Hasta el final del día».
- The urgent screen beside it, live.
- One button, `btn-danger btn-lg`: «Ponerlo ya en las 6 pantallas». Then the red banner on the home page with
  «Quitarlo de las pantallas».
- On the screens: the whole screen red, «AVISO URGENTE», the text very large, the line under it, the clock; striped
  top and bottom edges; nothing moves.

### A screen's sheet

- Left, sticky: «Vista previa / Lo que enseña de verdad», the screen in its bezel, and its facts as a short list
  («Señal: hace 1 min», «Reloj: en hora», «Pantalla: 1920 × 1080, horizontal», «Dada de alta: el 20 de octubre»).
- Right, one card per topic: «Nombre y grupos»; «Horario de encendido» (switch «Siempre encendida», day toggles,
  «de 07:30 a 18:30», a week of bars on a 0–24 scale, and the sentence «Encendida de lunes a viernes, de 07:30 a
  18:30. Fuera de ese horario se queda en negro y no avisa si deja de responder.»); «Si deja de responder» (switch
  «Avisarme»); «Sonido» (switch «Con sonido» and why it is off by default); «Claro u oscuro» (chips «Como el sitio»,
  «Claro», «Oscuro», «Oscuro por la noche»); «Cambiar el aparato»; «Quitar la pantalla» (danger card,
  `btn-outline-danger`, confirmation that says what is kept).
- The save bar appears, sticky at the bottom, with the first change: «Hay cambios sin guardar.» «Guardar cambios»,
  «Deshacer». Leaving with changes asks first.

### Screens and groups

- Screens as compact rows: a small bezel, name and state, its groups as chips, «Ficha».
- A card per group: «Sus pantallas» (chips, «+ Añadir»), «Quién publica aquí» (people with initials, role, «×» to
  take them off, with the name in its label), and a search field «Añadir a alguien del centro» (combobox: results
  with initials, the typed part underlined, «Ya publica aquí» disabled).
- A dashed card «Todas las pantallas»: who publishes everywhere and «Lo decide el administrador del sitio.»
- «Grupo nuevo»: a name and «Crear».

### «Tu centro»

- **Where the school is**, for the weather. A search field with «Buscar»; the places found as a list («San Cristóbal
  de La Laguna» / «Santa Cruz de Tenerife, Canarias»), the typed part underlined, and at the end «¿No sale? Prueba con
  el nombre del municipio, o escribe «latitud, longitud».»
- On choosing, a confirmation card: a small locator map, the place name, its province and region, the coordinates
  («28,4853° N · 16,3201° O»), «Ver en el mapa» (a new tab, announced) and «Cambiar»; under them the weather there now,
  drawn as the screens' header draws it (the same icon set and colours, the temperature large, today's highest and
  lowest), and «Si ves tu pueblo y su tiempo, está bien.»
- The locator is drawn by the plugin: a public-domain land outline (Natural Earth, 1:50m) cropped about 640 km
  around the point, a grid of degrees, the point with a ring and a 100 km bar. No map service is loaded.
- **The colours**: one tile per colour (principal, segundo) with a colour input, its use, its value
  and the text that will go on it, chosen alone («letra blanca» or «letra oscura», whichever reaches 4.5:1).
- **The categories**: what each centre calls its parts (the stages of a school, the faculties of a university, the
  areas of an academy), up to six, none by default: a row each with its colour, its name and the words that mark it in
  a title or in «for whom», «×» to take it out, «+ Añadir una categoría», and «Traer las categorías de cursos de
  Moodle» (each linked to its course category, whose calendar events then show in its colour). Nothing in the product
  is one school's: Hechauka is installed by universities, academies and schools alike.
- **The logo**: one for light screens and one for dark ones, each on its own background, with «Cambiar».
- Beside, the screen live with these colours, this logo and this weather, in «Claro» or «Oscuro».
- Under «Guardar»: «Lo técnico, como la preparación de los vídeos, sigue en la administración del sitio.»

### A new screen, from the phone (`claim.php`)

Three steps: the TV shows a code and a QR; the phone scans it and opens this page; one button.
- «Paso 2 de 3 · Ponle nombre» (plain text, no numbered circles).
- «Pantalla encontrada»: a small bezel with the code, «Código KM7 Q4X · 1920 × 1080, horizontal». The shape comes
  from the screen; there is no «Diseño» to choose.
- «¿Es nueva o sustituye a otra?» as two large radio cards. Replacing: the screens as cards, a screen without signal
  first («¿Es esta? Lleva un rato sin señal.»).
- «Nombre» (unique: «Que diga dónde está. No puede repetirse.»), «Grupos» as chips with «+ Grupo nuevo».
- «Empezar» (`btn-lg`, full width). Then «Pasillo de Primaria ya está en marcha», its first picture, what it shows,
  «Listo» and «Ponerle horario de encendido».
- On a desktop, «Añadir una pantalla» opens a dialog with the short address for the TV («aula.ejemplo.es/pantalla»,
  with «Copiar») and the code field.

### Empty states

A drawing, a sentence that says what already works, and the next step. First day: «Tus pantallas ya enseñan el
menú, la agenda y el tiempo. Llegan solos. Cuando quieras, añade un aviso o una foto: sale enseguida, con lo
demás.» A teacher with nothing yet: «Todavía no has puesto nada. Lo que añadas sale en las pantallas de Infantil,
junto al menú y la agenda del centro.» Never an empty box.

## 8. Depth

Flat, like Moodle: 1 px borders (`--hkp-line`), radius `calc(var(--bs-border-radius-lg) * 1.4)` for cards (so a
square theme stays square), the theme's radius for fields. One soft shadow on screen cards, the preview pane and
group cards, none in dark mode (borders carry it). Dialogs and the open search list float with a stronger shadow. The
bezel has its own small shadow on the wall.

## 9. Motion

Little and with meaning: a screen card lifts 2 px on hover; the «no signal» dot pings twice when the page opens and
stops; chips and toggles change colour in .15 s; folded parts turn their arrow. Only `transform` and `opacity`. With
`prefers-reduced-motion` (or the pause of an accessibility plugin), nothing moves.

## 10. Accessibility

- AA everywhere, checked in light and dark: text 4.5:1 (3:1 large), the borders of chips and toggles and the state
  dots 3:1 against what is behind them. Text on a tint uses the darker (light mode) or lighter (dark mode) ink.
- Nothing by colour alone: states have a shape and a word; chosen chips have a tick; categories have a name.
- Keyboard: everything reachable in order; chips and toggles are real buttons or radios; the add-screen card is a
  button (`Enter` and `Space`); the people and place searches are comboboxes (`aria-expanded`, `aria-controls`,
  arrows, `Enter`, `Escape`); dialogs trap focus and close with `Escape`; dragging has its menu alternative.
- Focus: the theme's ring, always visible, never hidden by the sticky bars.
- Live regions: the «Cuándo» sentence, the «Dónde» summary, «Recargando…», the slide label, the place card.
- Icon-only buttons have labels that say which thing («Más acciones para «Fotos de grupo»», «Quitar a Pablo Romero
  de Infantil»).
- Pictures of screens are `role="img"` with «Lo que enseña Biblioteca»; thumbnails of drawn pieces are hidden from
  screen readers (the row already says it).
- Targets 44 px on touch; nothing floats over what is tapped.

## 11. Copy (in Spanish)

- **Tú**, short, plain. Verbs for actions: «Añadir», «Publicar en 6 pantallas», «Ponerlo ya», «Quitarlo»,
  «Recargar», «Ver qué le pasa», «Poner otra vez». No «Enviar», no «Aceptar».
- **Generic masculine**, never split forms (no «profesor/a», no «@»). «Ustedes», never «vosotros». No emojis. Latin
  quotes «».
- **No jargon**: «pantalla», not «dispositivo» or «reproductor»; «grupo de pantallas», not «canal»; «código», not
  «token»; «Lo que enseña de verdad», not «captura del cliente»; «se recarga», not «refresh». No versions, addresses
  or ids on view.
- **Time said as people say it**: «Hasta el viernes 6», «Hoy, hasta las 11:30», «quedan 3 días», «desde las 10:12»,
  «hace 1 min». Days in lower case; 24-hour clock with two digits («08:00»). Short form in lists: «Del 2/11 al 15/11».
- **The calendar's short names stay as they come** («4º Pri C», «3º ESO»): they are understood and leave room for
  the title.
- **Say the effect**: «Importante: va el primero, en color, y no se turna con los demás.» «Con sonido: sus vídeos
  suenan.» «Fuera de ese horario se queda en negro y no avisa si deja de responder.»
- **Errors that say how to fix it**: «Una hora como 08:30.» «Elige al menos un día.» «No encuentro ese lugar. Prueba
  con el nombre del municipio, o escribe «latitud, longitud».»
- Headings without a final full stop. Example data is labelled «Datos de ejemplo».

Words of the panel:

| Use | Not |
|---|---|
| Pantallas (the page and the link) | Pantallas informativas (outside the plugin's name), cartelería |
| Lo que sale · En pantalla ahora · Más adelante · Ya no sale | Contenidos activos, programados, caducados |
| Aviso · Foto o vídeo · Evento · Línea de la cinta · Agenda | Item, slide, ticker, feed, iCal (only in the help) |
| Cuándo · Dónde | Programación, destino |
| Lleva las pantallas · Publica | Gestor, editor |
| Ficha (of a screen) | Configuración, editar dispositivo |
| Aviso urgente | Alerta de emergencia |

## 12. Do and don't

**Do**
- Start from what is on the screens; keep the preview one click away from everything.
- Use the theme's variables through the `--hkp-*` tokens, and Moodle's own buttons, fields, switches and dialogs.
- Draw content with the screens' own pieces; draw time on the strip.
- Keep the main action in sight (sticky form foot, sticky save bar).
- Show only what the person can do.

**Don't**
- Live inside the site administration (breadcrumbs, admin tabs, «Purgar todas las cachés»).
- Grey tables of rows with long dates («sábado, 31 de octubre de 2026, 10:30»); forms in a single endless column with
  every option open («Fechas: Entre dos fechas / Desde / Hasta / Días: Solo estos días / Horas…»).
- Cards that show a version or an address instead of a picture («0.1.0», `http://localhost…/player/`).
- Ask for a «Diseño» when adding a screen: the composition is the player's job.
- Fixed Bootstrap colour utilities; text on the category colours; colour as the only signal.
- Product or school branding in the panel; a `max-width` in `ch` or `px` on running text.
- Load a third-party map or font in the panel.

## 13. Phone and touch

- Everything works at 390 px: the publisher's journeys and adding a screen are thought for the phone first.
- The wall goes to two columns, the «Ahora» line hides, the card actions keep their icons (44 px).
- Rows: thumb and title, then when and where; the actions keep «⋯».
- Forms: one column, the preview after the first fieldset, the buttons in a sticky bar at the bottom (with the safe
  area).
- Dialogs fill the width; their two columns stack.
- `touch-action: manipulation` on chips; the navbar's primary links go into Moodle's drawer.

## 14. For whoever builds it

- Styles: the panel's `styles.css` is the reference mock-up's `panel.css`; all of it under `.hkp`, with `hkp-`
  classes. The screens keep `hk-`.
- Templates: one Mustache template per piece (screen card, state, content row, chips, the when editor, the preview
  pane), and the views as compositions of them; small AMD modules for the when editor (sentence and strip), the
  preview (`postMessage` to the frame), the chips and the searches.
- The category colours go out as inline variables on `.hkp` from the settings.
- The when sentence is built with Moodle's strings, one string per pattern (not by concatenating words), so other
  languages can order it their way.
- Por verificar before building:
  - **The place search.** Today the plugin looks the place up once, on save, in Nominatim (OpenStreetMap). Its usage
    policy does not allow search-as-you-type, so either search on «Buscar» (as drawn) and show the matches, or use a
    service meant for type-ahead (for example Photon); the source is por verificar, and in any case the browser never
    calls it: the server does, with a short cache.
  - **The locator's outline**: Natural Earth (public domain), simplified and shipped with the plugin, or drawn once on
    the server per place; size and simplification por verificar.
  - **The entry points**: the «Pantallas» link in the primary navigation and in the user menu (hooks that exist in
    Moodle 4.5 por verificar).
  - **«Lo que enseña de verdad»** needs the device's captures; until then, the preview only.
