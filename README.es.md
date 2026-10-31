# Pantallas informativas para Moodle (Oksigenia Hechauka)

[![Licencia: GPLv3](https://img.shields.io/badge/licencia-GPLv3+-blue.svg)](LICENSE)
![Moodle](https://img.shields.io/badge/Moodle-4.5%E2%80%935.3-orange)
![Estado](https://img.shields.io/badge/estado-pre--alfa-red)
[![Patrocinio](https://img.shields.io/badge/patrocinio-Oksigenia-00d4ff)](https://oksigenia.com/en/open-source#sponsor)

**Oksigenia Hechauka** lleva las pantallas informativas de un colegio o de una universidad desde su Moodle™: avisos,
fotos, vídeos, los eventos del día y el menú del comedor, cada pantalla con su programación. Lo que Moodle ya sabe
llega solo a las pantallas, y cada una se ve a distancia tal como está. *Hechauka* es «mostrar» en guaraní.

[Read in English](README.md)

## Estado

**Pre-alfa.** Una pantalla abre una dirección y enseña un código; alguien le pone nombre en Moodle y empieza. El
panel lleva las pantallas, los contenidos y su programación, y enseña la vista previa de cada pantalla cualquier día
y a cualquier hora. El menú de Oksigenia Meals, los eventos del calendario y las noticias del sitio llegan solos a
las pantallas. No es para sitios en producción.

## Cómo funciona

- **El plugin** guarda las pantallas, sus grupos y sus contenidos, con fechas, días de la semana, horas y «cada N
  semanas». Cada pantalla tiene su horario de encendido; si deja de responder dentro de él, quien lleva las pantallas
  recibe un aviso de Moodle. Con `ffmpeg` en el servidor (basta una versión estática), cada vídeo que se sube se
  prepara para todas las pantallas: H.264, 1080p y 30 fps como mucho, de uno en uno.
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
ejemplo. Más en [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

GNU GPL v3 o posterior. Ver [LICENSE](LICENSE).

© 2026 Oksigenia SL — dev@oksigenia.cc

Moodle y sus logotipos son marcas comerciales o registradas de Moodle Pty Ltd o de sus filiales. Oksigenia no está
vinculada a Moodle HQ ni es Moodle Certified Partner.
