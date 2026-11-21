# Pantallas informativas para Moodle (Oksigenia Hechauka)

[![Licencia: GPLv3](https://img.shields.io/badge/licencia-GPLv3+-blue.svg)](LICENSE)
![Moodle](https://img.shields.io/badge/Moodle-4.5%E2%80%936.0-orange)
![Estado](https://img.shields.io/badge/estado-alfa-orange)
[![Patrocinio](https://img.shields.io/badge/patrocinio-Oksigenia-00d4ff)](https://oksigenia.com/en/open-source#sponsor)

**Oksigenia Hechauka** lleva las pantallas informativas de cualquier centro desde su Moodle™ (un colegio, una
universidad, una academia, un ayuntamiento, una empresa): avisos, fotos, vídeos, los eventos del día y el menú del
comedor, cada pantalla con su programación. Lo que Moodle ya sabe llega solo a las pantallas, y cada una se ve a
distancia tal como está. *Hechauka* es «mostrar» en guaraní.

[Read in English](README.md)

## Estado

**Alfa**, en uso desde noviembre de 2026 con pantallas de todos los tipos de abajo (dos Raspberry Pi y dos pantallas
profesionales Samsung, una de ellas táctil). Una pantalla abre una dirección y enseña un código; alguien le pone nombre
desde el móvil y empieza. El panel («Pantallas», en la barra principal) enseña cada pantalla tal como está y lo que sale
en ella; al añadir algo, la pantalla va al lado del formulario y cambia mientras se escribe; un aviso urgente cubre
todas las pantallas en dos clics.

## Instalación

1. El plugin va en `local/oksigeniahechauka` y se actualiza el sitio, como cualquier plugin. Moodle 4.5 a 6.0.
2. «Pantallas», en la barra principal: la primera vez es «Empezar», cinco pasos en una página (qué centro es, su
   aspecto, lo que llega solo, dónde está y su primera pantalla).
3. En el servidor, si se quiere: `ffmpeg` (basta una versión estática; se busca solo o se pone en los ajustes), para que
   cada vídeo que se sube quede listo para todas las pantallas.

## Las pantallas

Una sola dirección, la del reproductor (`https://TU-MOODLE/local/oksigeniahechauka/player/`), que dan «Empezar» y
«Añadir una pantalla», con una corta si el sitio tiene acortador:

- **Una tele o un ordenador pequeño con navegador**: esa dirección a pantalla completa (modo quiosco).
- **Una pantalla profesional Samsung** (Tizen 4 a 6.5): la misma dirección en su URL Launcher («Install Web App»). El
  plugin sirve junto al reproductor la app firmada que pide. Más en [device/README.md](device/README.md).
- **Una Raspberry Pi**: «Una Raspberry Pi para la pantalla», en el panel, da la imagen de la tarjeta y un fichero con la
  dirección del sitio; el aparato se pone al día solo desde el sitio, con la firma de Oksigenia.

Cada una enseña un código; quien lleva las pantallas le pone nombre desde su móvil con el QR.

## Lo que pide fuera del sitio

Nada hasta que el centro lo enciende o da lo que hace falta:

- **La foto del día** (encendida de serie, se puede apagar): una lista y sus imágenes de un servidor de Oksigenia,
  `recursos.oksigenia.com`, una vez por hora. No se envía nada del sitio.
- **El tiempo**: el lugar del centro se busca una vez con Nominatim, de OpenStreetMap; la previsión llega de MET Norway
  cada hora. Solo si el centro tiene lugar.
- **Instagram**: la Graph API de Meta, una vez por hora, solo con una clave del centro.
- **Cifra** (los cumpleaños de los alumnos): solo si el sitio tiene una conexión OAuth 2 con ella.
- **Un acortador de enlaces**: solo si el sitio lo tiene (la pieza común `shortener`), para los códigos QR.

## Cómo funciona

- **El plugin** guarda las pantallas, sus grupos y sus contenidos, con fechas, días de la semana, horas y «cada N
  semanas». Cada pantalla tiene su horario de encendido; si deja de responder dentro de él, quien lleva las pantallas
  recibe un aviso de Moodle. Lo que llega solo a las pantallas: el menú de Oksigenia Meals, los eventos del calendario
  del sitio, las noticias del sitio, el tiempo (MET Norway, con la ubicación del centro) y cualquier agenda iCal que se
  añada como contenido. Con `ffmpeg` en el servidor (basta una versión estática), cada vídeo que se sube se
  prepara para todas las pantallas: H.264, 1080p y 30 fps como mucho, de uno en uno.
- **Quien lleva el panel** no tiene que ser administrador: cuatro capacidades (ver, publicar en sus grupos, publicar
  en todas, llevar las pantallas) y tres roles creados al instalar: «Publica en las pantallas», «Publica en todas las
  pantallas» y «Lleva las pantallas». Quien lleva las pantallas elige desde el panel quién publica en cada grupo y quién
  publica en todas; el administrador elige allí mismo quién lleva las pantallas, sin pasar por la administración de
  roles de Moodle.
- **Cada pantalla dice para qué es** (informativa, escaparate o mixta, y otro uso a ciertas horas) y desde dónde se lee
  (3, 5 u 8 m, y si está tras un cristal): de ahí salen sus composiciones y el tamaño de su letra. En cada diapositiva
  manda una cosa; lo demás cede a un tercio o, de lejos, llega de una en una. Hay agenda que sube con el mes al lado, y
  álbumes de fotos que salen en un tercio o en un mosaico.
- **Sorpresas**, si el centro quiere: de vez en cuando, un personaje en 3D cruza la pantalla, se para, mira a quien pasa, hace
  un gesto y se va corriendo. O, en las fechas que ponga el centro, nieva, y llueve cuando llueve de verdad.
- **El reproductor** es una sola página web que abre cada pantalla: un ordenador pequeño con un navegador en modo
  quiosco, una tele inteligente con un navegador de quiosco o una pantalla profesional que carga una página web.
  Guarda en el aparato lo que necesita y sigue sin red.
- **El contrato** entre la pantalla y el servidor está en [docs/contract.md](docs/contract.md). El reproductor solo
  conoce el contrato, así que el mismo reproductor puede funcionar con otro servidor.
- **En la app de Moodle** no hay nada que abrir: el panel es una página para el ordenador, y una pantalla se da de alta
  desde el navegador del móvil con su código QR. Los avisos de las pantallas llegan a la app como cualquier aviso de
  Moodle.

## Desarrollo

Código, comentarios y mensajes de commit en inglés; los textos, en los paquetes de idioma (`lang/en`, `lang/es`). El
reproductor vive en `player/`: sus fuentes en `player/src`, compiladas con esbuild para los navegadores antiguos de
las pantallas profesionales (`npm run build`), y sus pruebas corren en Node (`npm test`). El paquete compilado va en
el repositorio, así que quien instala el plugin no compila nada. `player/demo/` enseña el reproductor con datos de
ejemplo. El panel sigue [DESIGN.md](DESIGN.md): plantillas Mustache en `templates/`, `styles.css` hecho con la hoja del
propio diseño más `panel/extra.css`, y dos guiones sencillos en `panel/` (añadir contenido y «Tu centro»). Más en
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

GNU GPL v3 o posterior. Ver [LICENSE](LICENSE).

© 2026 Oksigenia SL — dev@oksigenia.cc

Moodle y sus logotipos son marcas comerciales o registradas de Moodle Pty Ltd o de sus filiales. Oksigenia no está
vinculada a Moodle HQ ni es Moodle Certified Partner.
