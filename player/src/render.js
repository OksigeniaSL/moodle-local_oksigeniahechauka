// Paints the screen with the templates and the compositions of the art direction (hechauka.css, composiciones.css,
// tiempo.css, proximos-dias.css): a header, a stage where each slide puts its composition in a layer of its own, the
// ticker, and a layer over everything for a picture at full screen. The frame is built once; layers come and go, so a
// screen that runs for months does not pile up nodes.

import {ratio, shapeOf} from './compose.js';
import {buildWeatherThird} from './today.js';
import {MARK, buildLead, buildRest, fitAlso, fitHeadline, fitWord, leadOfTurn, leadsOf, linesOf, paginateRest, showRestPage, turnFixed, weekHeadline, wordsCramped} from './lead.js';
import {buildBirthdays, fitBirthdays, startBirthdays} from './cumple.js';
import {buildDeadlines, fitDeadlines} from './plazos.js';
import {buildIdle} from './reposo.js';
import {buildTable, fitTable} from './tabla.js';
import {buildBooks, fitBooks} from './biblioteca.js';
import {buildMoments, fitMoments} from './celebra.js';
import {buildChannel, fitChannel, startChannel, stopChannel} from './canal.js';
import {qrSvg, shortWeb} from './qr.js';
import {even} from './balance.js';
import {buildAgenda, startAgenda} from './agendaview.js';
import {buildCarousel, buildWall, buildWallBand, startCarousel, startWall, wallCount} from './photos.js';
import {buildWeek, fitWeek} from './weekview.js';
import {motion} from './movimiento.js';
import {noLoneShortWord} from './retoques.js';
import {buildPlaceCard, buildZones, fitZones, startZones} from './zonas.js';
import {hasPlace, placeLine, placeState, placeWords} from './sitio.js';
import {buildStrip, fitStrip as fitBirthdayStrip, startStrip, stripKey} from './franja.js';
import {centreAfter, centreDue, centreState} from './lema.js';
import {wallOf} from './rules.js';

// The share of a wide zone a picture must leave free to have its words on a block beside it.
const BESIDE_LEAST = 0.3;
const PHRASE_WAITS_MS = 25000;
const CAPTION_MS = 2800;

/** The compositions that are made anew each time, never only their pictures changed. */
const NEW_EACH = {'solo-hoy': true, semana: true, titular: true, agenda: true, muro: true, 'fotos-tercio': true, cumple: true, biblioteca: true, celebra: true, canal: true, plazos: true,
    tabla: true, zonas: true};

/** The width over the height of each slot shape, to measure a portrait slot when the body is lower than the sheet expects. */
const SHAPES = {'9x16': 9 / 16, '2x3': 2 / 3, '3x4': 3 / 4, '1x1': 1};

/** The languages that write a weekday in lower case in the middle of a sentence: the rest keep it as the site writes it. */
const CAPITAL_DAYS = {en: true, de: true};

/** The compositions over the whole screen, in their own layer. */
const FULL = {'foto-completa': true, 'escaparate': true, 'reposo': true};
const PASS_MS = 1000;

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) {
        e.className = cls;
    }
    if (text !== undefined && text !== null) {
        e.textContent = text;
    }
    return e;
}

function clear(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

function two(n) {
    return (n < 10 ? '0' : '') + n;
}

/** Only colours, lengths and font names: what a client's sheet of variables holds. */
function safeValue(v) {
    return typeof v === 'string' && v.length < 200 && !/[;{}<>]|url\(|expression/i.test(v);
}

function quiet(promise) {
    if (promise && promise.catch) {
        promise.catch(function () {
            return null;
        });
    }
}

const DROP = '<svg viewBox="0 0 16 21" aria-hidden="true"><path d="M8 0C9.5 3.6 16 9.6 16 13a8 8 0 0 1-16 0C0 9.6 ' +
    '6.5 3.6 8 0z"/></svg>';

export class Screen {
    /**
     * @param {HTMLElement} root
     * @param {object} strings texts of the site (labels, day and month names)
     * @param {object} media the media store
     * @param {object} hooks {videoEnded(item), mediaFailed(item)}
     */
    constructor(root, strings, media, hooks) {
        this.root = root;
        this.s = strings || {};
        this.media = media;
        this.hooks = hooks;
        this.sky = window.HK_TIEMPO || null;
        this.layer = null;
        this.comp = null;
        this.shapes = '';
        this.todayKey = '';
        this.headers = [];
        this.weather = null;
        this.tickerText = null;
        this.minute = '';
        this.lastDate = null;
        this.sound = false;
        this.build();
    }

    build() {
        clear(this.root);
        this.frame = el('div', 'hk hk-horizontal');
        this.frame.appendChild(this.header());
        this.stage = el('main', 'hk-escena');
        this.ticker = el('footer', 'hk-cinta hk-cinta-frases');
        this.tickerLabel = el('b');
        this.tickerTrack = el('div', 'hk-cinta-pista');
        this.tickerCount = el('p', 'hk-cinta-cuenta');
        this.ticker.appendChild(this.tickerLabel);
        this.ticker.appendChild(this.tickerTrack);
        this.ticker.appendChild(this.tickerCount);
        // The important notice where there is no third (importantBand): its label and its line, in place of those above.
        this.bandLabel = el('b', 'hk-cinta-rotulo');
        this.bandLine = el('p', 'hk-cinta-aviso');
        this.ticker.insertBefore(this.bandLabel, this.tickerTrack);
        this.ticker.appendChild(this.bandLine);
        // The centre's own sentence takes the place of the label with the centre's logo, or its initial (showTicker).
        this.tickerSeal = el('span', 'hk-cinta-sello');
        this.ticker.insertBefore(this.tickerSeal, this.tickerTrack);
        // Whose birthday it is today, above the ticker all day (showBirthdayStrip).
        this.birthdayStrip = el('section', 'hk-cumple-franja');
        this.full = el('div', 'hk-completa hk-sobre-foto');
        this.credit = el('p', 'hk-credito-tiempo');
        this.sample = el('span', 'hk-muestra', this.s.sample || 'Sample data');
        this.frame.appendChild(this.stage);
        this.frame.appendChild(this.birthdayStrip);
        this.frame.appendChild(this.ticker);
        this.frame.appendChild(this.full);
        this.dark = el('div', 'hk-apagada');
        this.root.appendChild(this.frame);
        this.root.appendChild(this.dark);
    }

    // A header: the logos, the place, the weather and the clock. The full-screen layer has one of its own.
    header() {
        const h = el('header', 'hk-cabecera');
        const logo = el('img', 'hk-logo-claro');
        logo.alt = '';
        const logoDark = el('img', 'hk-logo-oscuro');
        logoDark.alt = '';
        // A logo takes its width when it arrives: then the date may no longer fit in one line.
        logo.addEventListener('load', () => this.fitHeaders());
        logoDark.addEventListener('load', () => this.fitHeaders());
        const place = el('p', 'hk-lugar');
        // The place of the screen, open or closed now (paintPlace): beside the clock, the first to go when there is no room.
        const sitio = el('div', 'hk-sitio');
        sitio.appendChild(el('i', 'hk-sitio-punto'));
        const sitioWords = el('p');
        sitioWords.appendChild(el('b'));
        sitioWords.appendChild(el('span'));
        sitio.appendChild(sitioWords);
        const weather = el('div', 'hk-tiempo');
        const hour = el('div', 'hk-hora');
        const date = el('p', 'hk-fecha');
        const day = el('b');
        const rest = el('span');
        date.appendChild(day);
        date.appendChild(document.createTextNode(' '));
        date.appendChild(rest);
        const clock = el('p', 'hk-reloj');
        hour.appendChild(date);
        hour.appendChild(clock);
        h.appendChild(logo);
        h.appendChild(logoDark);
        h.appendChild(place);
        h.appendChild(sitio);
        h.appendChild(weather);
        h.appendChild(hour);
        const parts = {node: h, logo, logoDark, place, sitio, weather, day, rest, clock};
        this.headers.push(parts);
        if (this.identity) {
            this.paintHeader(parts);
        }
        return h;
    }

    /** A screen that keeps still: nothing crosses it. */
    keepsStill() {
        return this.frame.classList.contains('hk-quieto') ||
            !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    /** Where the ticker starts, when it is in sight: something to walk on. */
    tickerTop() {
        if (FULL[this.frame.getAttribute('data-composicion')]) {
            return null;
        }
        // Over the birthday strip when it is there: it is the edge that is in sight.
        const strip = this.birthdayStrip.getBoundingClientRect();
        if (strip.height > 0 && strip.top < window.innerHeight) {
            return strip.top;
        }
        const box = this.ticker.getBoundingClientRect();
        return box.height > 0 && box.top < window.innerHeight ? box.top : null;
    }

    /** What does not change with each slide: shape, identity, labels, weather. */
    configure(manifest) {
        const scr = manifest.screen || {};
        // The page knows its own shape better than the manifest: a screen turned on its side, a LED wall.
        const w = window.innerWidth || scr.width || 1920;
        const h = window.innerHeight || scr.height || 1080;
        this.horizontal = w >= h;
        this.frame.classList.toggle('hk-horizontal', this.horizontal);
        this.frame.classList.toggle('hk-vertical', !this.horizontal);
        this.frame.classList.toggle('hk-quieto', !!scr.still);
        this.glass = !!scr.glass;
        // From where it is read, and behind glass: every size of the art direction's 0.7.0 comes from these.
        this.distance = [3, 5, 8].indexOf(scr.distance) !== -1 ? scr.distance : 3;
        this.frame.setAttribute('data-distancia', String(this.distance));
        if (scr.glass) {
            this.frame.setAttribute('data-cristal', '');
        } else {
            this.frame.removeAttribute('data-cristal');
        }
        this.noToday = manifest.template === 'full';
        this.sound = !!scr.sound;
        this.labels = manifest.labels || {};
        this.tickerLabel.textContent = this.labels.ticker || this.s.ticker || '';
        this.tickerLabel.style.display = this.tickerLabel.textContent ? '' : 'none';
        if (manifest.sample) {
            this.frame.appendChild(this.sample);
        } else if (this.sample.parentNode) {
            this.sample.parentNode.removeChild(this.sample);
        }
        // The name of the screen is for the panel: whoever passes knows where they are. The centre's stands in for a logo.
        this.identity = {name: (manifest.centre && manifest.centre.name) || ''};
        // Where the screen is (a library, a canteen): open or closed now, in the header and in the two zones.
        this.place = hasPlace(scr.place) ? scr.place : null;
        this.placeWords = placeWords(this.labels, this.s, this.place);
        this.placeKey = '';
        this.applyTheme(manifest.theme || {});
        this.setWeather(manifest.weather || null);
        this.todayKey = '';
    }

    applyTheme(theme) {
        const style = document.documentElement.style;
        // The skin the centre chose (pieles.css); with none, the sheet's first. Its own colours, in vars, go over it.
        if (/^[a-z0-9-]+$/.test(theme.skin || '')) {
            document.documentElement.setAttribute('data-piel', theme.skin);
        } else {
            document.documentElement.removeAttribute('data-piel');
        }
        // The background of the list it chose (fondos.css), with its pair for the dark theme.
        if (/^[a-z0-9-]+$/.test(theme.ground || '')) {
            document.documentElement.setAttribute('data-fondo', theme.ground);
        } else {
            document.documentElement.removeAttribute('data-fondo');
        }
        const vars = theme.vars || {};
        // What was set before and no longer is goes back to the skin.
        (this.themeVars || []).forEach(function (name) {
            if (vars[name] === undefined) {
                style.removeProperty(name);
            }
        });
        this.themeVars = Object.keys(vars).filter(function (name) {
            return name.indexOf('--hk-') === 0 && safeValue(vars[name]);
        });
        this.themeVars.forEach(function (name) {
            style.setProperty(name, vars[name]);
        });
        this.applyModes(theme.modes);
        this.identity = this.identity || {name: ''};
        this.identity.light = this.media.url(theme.logo);
        this.identity.dark = this.media.url(theme.logo_dark) || this.identity.light;
        this.frame.classList.toggle('hk-sin-logo', !this.identity.light);
        this.headers.forEach((p) => this.paintHeader(p));
        this.paintSeal();
        this.fonts(theme.fonts || []);
        this.loadLetters();
    }

    // What is worked out and not the same on the light theme as on the dark (a background from the main colour, the second colour
    // as text): in a sheet after the skins', since a variable on the page would hold on both.
    applyModes(modes) {
        if (!this.modesSheet) {
            this.modesSheet = document.createElement('style');
            document.head.appendChild(this.modesSheet);
        }
        const rule = function (selector, vars) {
            const lines = Object.keys(vars || {}).filter(function (name) {
                return /^--hk-[a-z0-9-]+$/.test(name) && safeValue(vars[name]);
            }).map(function (name) {
                return name + ':' + vars[name];
            });
            return lines.length ? selector + '{' + lines.join(';') + '}' : '';
        };
        const m = modes || {};
        this.modesSheet.textContent = rule(':root[data-tema="claro"]', m.light) + rule(':root[data-tema="oscuro"]', m.dark);
    }

    // The letters of the skin, asked for at once: until they arrive everything is measured in the fallback letter, and a sentence
    // that fitted there would end up in two lines at the size of one. When they are here, what was measured is measured again.
    loadLetters() {
        if (!document.fonts || !document.fonts.load) {
            return;
        }
        const family = getComputedStyle(document.documentElement).getPropertyValue('--hk-letra-titulos').split(',')[0].trim();
        if (!family || family === this.lettersFamily) {
            return;
        }
        this.lettersFamily = family;
        const self = this;
        Promise.all(['600', '700', '800'].map(function (w) {
            return document.fonts.load(w + ' 40px ' + family);
        })).then(function () {
            if (self.lettersFamily !== family) {
                return;
            }
            self.remeasureFixed();
            if (self.layer) {
                self.fitStrip(self.layer);
                self.adjustLayer(self.layer);
            }
        }).catch(function () {
            return null;
        });
    }

    paintHeader(p) {
        const id = this.identity;
        // Without a logo, the centre's name as a mark: its full stop in the accent, like the clock's colon.
        const name = id.light ? '' : id.name;
        p.place.textContent = name;
        p.place.style.display = name ? '' : 'none';
        if (name) {
            p.place.appendChild(el('i', '', '.'));
            p.place.setAttribute('data-largo', name.length > 22 ? '2' : (name.length > 13 ? '1' : '0'));
        }
        p.logo.style.display = id.light ? '' : 'none';
        if (id.light && p.logo.src !== id.light) {
            p.logo.src = id.light;
        }
        if (id.dark && p.logoDark.src !== id.dark) {
            p.logoDark.src = id.dark;
        }
        if (!id.dark) {
            p.logoDark.removeAttribute('src');
        }
        this.paintWeather(p);
        if (this.lastDate) {
            this.paintClock(p, this.lastDate);
            this.paintPlace(p, this.lastDate);
        }
    }

    /** The names the place's words need: the weekdays, how they go in a sentence, a date. */
    placeNames() {
        const s = this.s;
        const lang = (document.documentElement.lang || 'es').slice(0, 2);
        return {days: s.days || [], lower: !CAPITAL_DAYS[lang], date: function (ymd) {
            const d = new Date(ymd + 'T12:00:00Z');
            const month = (s.months || [])[d.getUTCMonth()] || '';
            return (s.date_format || '{d} {m}').replace('{d}', d.getUTCDate()).replace('{m}', month);
        }};
    }

    /**
     * The place of the screen in its header: a lit dot and «Biblioteca · Abierta» over «hasta las 17:00», or a hollow one and
     * when it opens; from 5 m without the name. A chip of two lines, as narrow as it can be: the clock needs the room. Nothing
     * without a place.
     *
     * @param {object} p a header's parts
     * @param {Date} d the screen's clock
     * @returns {boolean} whether what it says changed
     */
    paintPlace(p, d) {
        if (!p.sitio) {
            return false;
        }
        const line = this.place ? placeLine(placeState(this.place, wallOf(d)), this.placeWords, this.placeNames()) : null;
        const key = line ? (this.place.name || '') + '|' + line.state + '|' + line.more : '';
        if (p.sitioKey === key) {
            return false;
        }
        p.sitioKey = key;
        p.node.classList.toggle('hk-con-sitio', !!line);
        if (!line) {
            return true;
        }
        p.sitio.setAttribute('data-estado', line.state === this.placeWords.place_open ? 'abierto' : 'cerrado');
        const words = p.sitio.querySelector('p');
        // From 5 m the chip says only the state, so that it stays beside the clock (the coordinator, 12 November 2026).
        const named = this.place.name && this.distance !== 5;
        words.firstChild.textContent = named ? this.place.name + ' · ' + line.state : line.state;
        words.lastChild.textContent = line.more;
        words.lastChild.style.display = line.more ? '' : 'none';
        return true;
    }

    // The client's fonts, from the media cache, so they work without a network too.
    fonts(list) {
        let css = '';
        const media = this.media;
        list.forEach(function (f) {
            const url = media.url(f.media);
            if (url && /^[\w \-]+$/.test(f.family || '')) {
                css += '@font-face{font-family:"' + f.family + '";src:url("' + url + '");font-weight:' +
                    (parseInt(f.weight, 10) || 400) + ';font-display:block}';
            }
        });
        if (!this.fontStyle) {
            this.fontStyle = el('style');
            document.head.appendChild(this.fontStyle);
        }
        if (this.fontStyle.textContent !== css) {
            this.fontStyle.textContent = css;
        }
    }

    // --- The weather ------------------------------------------------------------------------------------------------

    setWeather(w) {
        this.weather = w && w.now && w.today && this.sky ? w : null;
        this.headers.forEach((p) => this.paintWeather(p));
        this.tickIdle();
        this.credit.textContent = this.weather ? (this.weather.credit || 'MET Norway') : '';
        if (this.weather && !this.credit.parentNode) {
            this.frame.appendChild(this.credit);
        } else if (!this.weather && this.credit.parentNode) {
            this.credit.parentNode.removeChild(this.credit);
        }
    }

    paintWeather(p) {
        const w = this.weather;
        clear(p.weather);
        p.node.classList.toggle('hk-con-tiempo', !!w);
        if (!w) {
            p.weather.style.display = 'none';
            return;
        }
        p.weather.style.display = '';
        const icon = el('span', 'hk-tiempo-icono');
        icon.innerHTML = this.sky.svg(w.now.symbol);
        p.weather.appendChild(icon);
        p.weather.appendChild(el('span', 'hk-tiempo-grados', w.now.temp + '°'));
        const range = el('span', 'hk-tiempo-extremos');
        range.appendChild(el('b', '', w.today.max + '°'));
        range.appendChild(document.createTextNode(w.today.min + '°'));
        p.weather.appendChild(range);
        if (w.today.rain >= 30) {
            const r = el('span', 'hk-tiempo-lluvia');
            r.innerHTML = DROP;
            r.appendChild(document.createTextNode(w.today.rain + ' %'));
            p.weather.appendChild(r);
        }
    }

    // --- Theme, power and clock -------------------------------------------------------------------------------------

    setDark(dark) {
        const want = dark ? 'oscuro' : 'claro';
        if (document.documentElement.getAttribute('data-tema') !== want) {
            document.documentElement.setAttribute('data-tema', want);
        }
    }

    setPower(on) {
        this.dark.style.display = on ? 'none' : 'block';
        const videos = this.frame.querySelectorAll('video');
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            if (on && v.paused && v.hkStarted) {
                quiet(v.play());
            } else if (!on && !v.paused) {
                v.pause();
            }
        }
    }

    setClock(d) {
        const key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes();
        if (key === this.minute) {
            return;
        }
        this.minute = key;
        const first = !this.lastDate;
        this.lastDate = d;
        this.headers.forEach((p) => this.paintClock(p, d));
        let placeMoved = false;
        this.headers.forEach((p) => {
            placeMoved = this.paintPlace(p, d) || placeMoved;
        });
        if (placeMoved && !first) {
            this.fitHeaders();
        }
        if (first) {
            // The headers were measured with no clock in them, and the body with what they left it.
            this.fitHeaders();
            this.fitIdle();
            if (this.layer) {
                this.adjustLayer(this.layer);
            }
        } else {
            this.tickIdle();
        }
        if (this.urgentClock) {
            this.urgentClock.textContent = two(d.getHours()) + ':' + two(d.getMinutes());
        }
    }

    paintClock(p, d) {
        clear(p.clock);
        p.clock.appendChild(document.createTextNode(two(d.getHours())));
        p.clock.appendChild(el('span', '', ':'));
        p.clock.appendChild(document.createTextNode(two(d.getMinutes())));
        const days = this.s.days;
        const months = this.s.months;
        if (days && days.length === 7 && months && months.length === 12) {
            p.day.textContent = days[d.getDay()];
            p.rest.textContent = (this.s.date_format || '{d} {m}')
                .replace('{d}', d.getDate()).replace('{m}', months[d.getMonth()]);
        } else {
            const lang = document.documentElement.lang || 'en';
            const name = d.toLocaleDateString(lang, {weekday: 'long'});
            p.day.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            p.rest.textContent = d.toLocaleDateString(lang, {day: 'numeric', month: 'long'});
        }
    }

    /**
     * The clock is never cut. It depends on the centre's letter, on the screen's and on the day («Miércoles 30 de
     * septiembre»), so it is measured: when the header does not fit, it gives way by steps: the place's chip leaves (the
     * weather's highest, lowest and rain make room for it first), the date in two lines, the clock and the degrees a bit
     * smaller, and at last the weather leaves the header.
     */
    fitHeaders() {
        // The place's chip is the first to go: the clock, the date and the weather are what a header is for. Before it goes, the
        // weather keeps only the degrees of now to leave it room (only while the chip is there).
        const steps = ['hk-cab-tiempo-justo', 'hk-cab-sin-sitio', 'hk-fecha-larga', 'hk-cab-justa', 'hk-cab-sin-tiempo',
            'hk-cab-sin-nombre'];
        this.headers.forEach(function (p) {
            steps.forEach(function (c) {
                p.node.classList.remove(c);
            });
            const hour = p.node.querySelector('.hk-hora');
            if (!hour) {
                return;
            }
            const fits = function () {
                const box = p.node.getBoundingClientRect();
                return box.width === 0 || hour.getBoundingClientRect().right <= Math.min(box.right, window.innerWidth) + 1;
            };
            for (let i = 0; i < steps.length && !fits(); i++) {
                p.node.classList.add(steps[i]);
            }
        });
    }

    // --- The slides -------------------------------------------------------------------------------------------------

    /**
     * A picture or a video with its caption. A video shows its caption over the still, then plays clean.
     *
     * @param {object} item
     * @param {function} [failed] what to do when its file does not play (by default, the player's mediaFailed)
     */
    slide(item, failed) {
        const d = el('div', 'hk-diapo');
        const self0 = this;
        const fail = failed || function () {
            self0.hooks.mediaFailed(item);
        };
        d.hkItem = item;
        const contain = item.fit === 'contain' || item.fit === 'blur';
        const src = this.media.url(item.media);
        if (item.fit === 'blur') {
            // Whole, over a blurred copy of itself: the still for a video (never a second video), the picture itself.
            const back = el('div', 'hk-diapo-fondo');
            let bg = item.type === 'video' ? this.media.url(item.backdrop) : null;
            if (!bg) {
                bg = item.type === 'video' ? this.media.url(item.poster) : src;
                back.classList.add('hk-difuminar');
            }
            if (bg) {
                back.style.backgroundImage = 'url("' + bg + '")';
            }
            d.appendChild(back);
        }
        if (item.type === 'video') {
            const v = el('video');
            v.muted = !this.sound;
            if (!this.sound) {
                v.setAttribute('muted', '');
            }
            v.setAttribute('playsinline', '');
            v.preload = 'auto';
            const poster = this.media.url(item.poster);
            if (poster) {
                v.poster = poster;
            }
            v.src = src;
            v.style.objectFit = contain ? 'contain' : 'cover';
            const self = this;
            v.addEventListener('ended', function () {
                self.hooks.videoEnded(item);
            });
            v.addEventListener('error', fail);
            d.appendChild(v);
            d.hkVideo = v;
        } else {
            const img = el('img');
            img.alt = '';
            img.onerror = fail;
            img.src = src;
            img.style.objectFit = contain ? 'contain' : 'cover';
            if (!contain && item.focus && item.focus.length === 2) {
                img.style.objectPosition = Math.round(item.focus[0] * 100) + '% ' + Math.round(item.focus[1] * 100) + '%';
            }
            d.appendChild(img);
        }
        const cap = item.caption;
        if (cap && (cap.title || cap.text)) {
            const pie = el('div', 'hk-pie');
            if (cap.title) {
                pie.appendChild(el('h2', '', cap.title));
            }
            if (cap.text) {
                pie.appendChild(el('p', '', cap.text));
            }
            d.appendChild(pie);
        }
        return d;
    }

    // A video waits a moment with its caption over the still, then plays and the caption goes.
    startVideo(d, comp) {
        if (!d.hkVideo) {
            return;
        }
        const band = comp === 'apaisado' || comp === 'tiempo-tercio';
        d.hkTimer = setTimeout(function () {
            d.classList.add('hk-reproduciendo');
            d.hkVideo.hkStarted = true;
            quiet(d.hkVideo.play());
        }, band ? 300 : CAPTION_MS);
    }

    stopSlide(slide) {
        clearTimeout(slide.hkTimer);
        if (slide.hkVideo) {
            slide.hkVideo.pause();
            slide.hkVideo.removeAttribute('src');
            slide.hkVideo.load();
        }
    }

    stopSlides(node) {
        const slides = node.querySelectorAll('.hk-diapo');
        for (let i = 0; i < slides.length; i++) {
            this.stopSlide(slides[i]);
        }
    }

    // Empties the full-screen layer; its header stops getting the clock.
    clearFull() {
        if (this.posterStop) {
            this.posterStop();
            this.posterStop = null;
        }
        this.full.removeAttribute('data-muro');
        this.full.removeAttribute('data-con-qr');
        this.stopSlides(this.full);
        clear(this.full);
        this.idle = null;
        const root = this.root;
        this.headers = this.headers.filter(function (p) {
            return root.contains(p.node);
        });
    }

    slot(item, comp, failed) {
        const s = el('section', 'hk-medio' + (item.fit === 'contain' || item.fit === 'blur' ? ' hk-medio-contener' : ''));
        const shape = shapeOf(item);
        if (shape && comp !== 'foto-hoy' && comp !== 'foto-sola') {
            s.setAttribute('data-forma', shape);
        }
        s.hkRatio = ratio(item);
        const d = this.slide(item, failed);
        d.classList.add('hk-visible');
        s.appendChild(d);
        this.startVideo(d, comp);
        return s;
    }

    // --- The compositions -------------------------------------------------------------------------------------------

    makeLayer(comp, items, today, week, extra) {
        this.led = null;
        const c = el('div', 'hk-cuerpo hk-capa');
        c.setAttribute('data-composicion', comp);
        const self0 = this;
        const mediaOf = function (ref) {
            return self0.media.url(ref);
        };
        if (comp === 'cumple') {
            // The day before the weekend says its own heading for all of them; each person's moment, theirs.
            const own = (extra && extra.item && extra.item.label) || '';
            buildBirthdays(c, extra && extra.item, (extra && extra.page) || 0, {distance: this.distance || 3, horizontal: this.horizontal,
                glass: !!this.glass, one: this.s.birthdays_one || '', many: own || this.s.birthdays_many || '', media: mediaOf,
                still: this.keepsStill(), cheers: this.s.birthdays_cheers || ''});
            return c;
        }
        if (comp === 'tabla') {
            buildTable(c, extra && extra.item, (extra && extra.page) || 0);
            return c;
        }
        if (comp === 'plazos') {
            const now = this.lastDate || new Date();
            buildDeadlines(c, extra && extra.item, (extra && extra.page) || 0, {distance: this.distance || 3, horizontal: this.horizontal,
                glass: !!this.glass, today: now.getFullYear() + '-' + two(now.getMonth() + 1) + '-' + two(now.getDate()), s: this.s});
            return c;
        }
        if (comp === 'biblioteca') {
            buildBooks(c, extra && extra.item, (extra && extra.page) || 0, {distance: this.distance || 3, horizontal: this.horizontal,
                media: mediaOf, qr: function (url, image) {
                    return self0.qrBox(url, false, image);
                }});
            return c;
        }
        if (comp === 'celebra') {
            buildMoments(c, extra && extra.item, (extra && extra.page) || 0, {distance: this.distance || 3,
                horizontal: this.horizontal, media: mediaOf});
            return c;
        }
        if (comp === 'canal') {
            // The centre's channel: its words, and its QR on a white card, the picture of the site's shortener or drawn here.
            buildChannel(c, extra && extra.item, {s: this.s, qr: function (url, image) {
                return self0.qrBox(url, false, image);
            }});
            return c;
        }
        if (comp === 'semana') {
            const l = this.labelsFull();
            // What comes next and matters, in a strip in the centre's colour; the five days under it.
            const said = weekHeadline(today, this.s.days);
            if (said) {
                const strip = el('div', 'hk-semana-titular');
                strip.appendChild(el('small', '', this.s.thisweek || ''));
                strip.appendChild(el('b', '', said));
                c.appendChild(strip);
            }
            if (said && week.things < 4) {
                c.setAttribute('data-poca', '');
            }
            c.hkWeek = buildWeek(week, {today: l.today, tomorrow: l.tomorrow, none: this.s.week_none || '',
                more: this.s.week_more || '+{n}'});
            c.appendChild(c.hkWeek);
            return c;
        }
        if (comp === 'zonas') {
            this.buildZonesLayer(c, items, extra || {});
            return c;
        }
        if (comp === 'tiempo-tercio') {
            // From 8 m the weather comes alone, and the picture keeps its turn.
            if (items[0]) {
                c.appendChild(this.slot(items[0], comp));
            }
            if (this.weather && this.sky) {
                c.appendChild(buildWeatherThird(this.weather, this.labelsFull(), this.sky, this.s.days || []));
            }
            return c;
        }
        // One thing big: what leads (a different one each time) and the rest in a third, never from 8 m.
        const far = this.distance === 8;
        const l = this.labelsLead();
        const self = this;
        const withRest = function (lead) {
            if (far || self.noToday) {
                return;
            }
            const r = buildRest(today, lead, l, self.turn || 0);
            if (r) {
                c.appendChild(r);
                c.hkRest = r;
            }
        };
        const nextLead = function () {
            const all = leadsOf(today, today.noon);
            if (!all.length || self.noToday) {
                return null;
            }
            self.leadTurn = (self.leadTurn || 0) + 1;
            const led = leadOfTurn(all, self.leadTurn);
            self.led = led.type === 'menu' ? 'menu' : ((led.notice || led.event || {}).id || null);
            return led;
        };
        if (comp === 'titular') {
            c.appendChild(this.typographic(extra || {type: 'frase', text: ''}, today));
            return c;
        }
        if (comp === 'agenda') {
            buildAgenda(c, extra.data, this.agendaWords());
            return c;
        }
        if (comp === 'muro') {
            c.appendChild(buildWall(wallCount(extra.albumData, this.distance)));
            c.appendChild(buildWallBand(extra.albumData));
            c.hkAlbum = extra.albumData;
            return c;
        }
        if (comp === 'fotos-tercio') {
            const p = nextLead();
            if (p) {
                c.appendChild(buildLead(p, today, l));
            } else {
                withRest(null);
            }
            c.appendChild(buildCarousel(extra.albumData));
            return c;
        }
        if (comp === 'dos-verticales' || comp === 'tres-verticales') {
            const pair = el('div', 'hk-pareja');
            const shape = shapeOf(items[0]) || '2x3';
            pair.setAttribute('data-forma', shape);
            items.forEach(function (it) {
                pair.appendChild(self.slot(it, comp));
            });
            c.appendChild(pair);
            // Three tall ones leave room beside them; three of a phone's shape fill the body whole, and lose nothing.
            if (comp === 'dos-verticales' || shape === '9x16') {
                withRest(null);
            }
            return c;
        }
        if (comp === 'solo-hoy') {
            const p = nextLead();
            if (p) {
                c.appendChild(buildLead(p, today, l));
            }
            withRest(p);
            return c;
        }
        c.appendChild(this.slot(items[0], comp));
        if (comp === 'vertical-hoy') {
            this.sideTurn = (this.sideTurn || 0) + 1;
            c.setAttribute('data-lado', this.sideTurn % 2 ? 'izquierda' : 'derecha');
            const p = nextLead();
            if (p) {
                c.appendChild(buildLead(p, today, l));
            }
        } else if (comp === 'foto-hoy' || comp === 'apaisado') {
            withRest(null);
        }
        return c;
    }

    /**
     * The two zones (zonas.js): the wide one with its picture or video, or the place's card; the column with the portrait
     * pictures, the weather and the coming days. What fails goes, and what stays grows: a wide picture that does not load
     * leaves the place's card in its stead, or the whole body to the column.
     *
     * @param {HTMLElement} c the layer
     * @param {object[]} items the wide picture first (when extra.wide), then the column's portraits
     * @param {object} extra {wide, weather, agenda, place, days: the coming days, today left out}
     */
    buildZonesLayer(c, items, extra) {
        const self = this;
        const wideItem = extra.wide ? items[0] : null;
        const photos = extra.wide ? items.slice(1) : items.slice();
        const card = function () {
            if (!self.place) {
                return null;
            }
            const n = buildPlaceCard(self.place, wallOf(self.lastDate || new Date()), self.placeWords, self.placeNames());
            n.classList.add('hk-zonas-ancha');
            return n;
        };
        const empty = function () {
            const nothing = !c.querySelector('.hk-zonas-col') && !c.querySelector('.hk-zonas-ancha');
            if (nothing && self.layer === c && self.hooks.emptied) {
                self.hooks.emptied();
            }
        };
        let wide = null;
        if (wideItem) {
            wide = this.slot(wideItem, 'zonas', function () {
                if (wide && wide.parentNode) {
                    self.stopSlides(wide);
                    const instead = card();
                    if (instead) {
                        wide.parentNode.replaceChild(instead, wide);
                        fitZones(c);
                    } else {
                        wide.parentNode.removeChild(wide);
                    }
                }
                // Out of the page first: the player notes it and goes on with this slide.
                self.hooks.mediaFailed(wideItem);
                empty();
            });
            // A video goes round while the column turns: its end is not the slide's.
            const v = wide.querySelector('video');
            if (v) {
                v.loop = true;
            }
        } else if (extra.place) {
            wide = card();
        }
        const l = this.labels || {};
        buildZones(c, {
            wide,
            photos,
            weather: extra.weather && this.weather && this.sky ? buildWeatherThird(this.weather, this.labelsFull(), this.sky,
                this.s.days || []) : null,
            agenda: extra.agenda ? extra.days || [] : null,
            media: function (ref) {
                return self.media.url(ref);
            },
            words: {
                weather: l.zones_weather || this.s.zones_weather || 'El tiempo',
                upcoming: l.upcoming || this.s.upcoming || 'Próximos días',
                holiday: this.s.week_holiday || '',
                lower: this.placeNames().lower,
            },
            photoFailed: function (it) {
                self.hooks.mediaFailed(it);
            },
            failed: empty,
        });
    }

    /** The words of what leads and the rest. */
    labelsLead() {
        const l = this.labels || {};
        const s = this.s;
        return {
            important: s.important || '',
            notice: s.notice || '',
            events: l.events || s.events || '',
            countdown: s.countdown || '',
            daysfor: s.daysfor || '',
            also: s.also || '',
            allergens: s.allergens || '',
            notices: l.notices || s.notices || '',
            upcoming: l.upcoming || s.upcoming || '',
        };
    }

    /** The words of the agenda. */
    agendaWords() {
        const s = this.s;
        return {months: s.months, letters: s.letters, date_format: s.date_format, agenda_in: s.agenda_in,
            agenda_nomore: s.agenda_nomore, agenda_quiet_title: s.agenda_quiet_title,
            agenda_quiet: s.agenda_quiet};
    }

    /** What moves by itself in a layer, once in the page and with its letters: it says how long the slide lasts. */
    startMoving(c) {
        const comp = c.getAttribute('data-composicion');
        if (comp === 'agenda') {
            c.hkSeconds = startAgenda(c, {distance: this.distance, glass: !!this.glass,
                still: this.keepsStill()});
        } else if (comp === 'fotos-tercio') {
            const self = this;
            c.hkSeconds = startCarousel(c, function () {
                self.turn++;
                showRestPage(c.hkRest, self.turn, true);
            }, linesOf);
        } else if (comp === 'muro') {
            c.hkSeconds = startWall(c, c.hkAlbum, false);
        } else if (comp === 'zonas') {
            // The column's carousel: as long as its items take, about 45 s.
            const self = this;
            c.hkSeconds = startZones(c, {still: this.keepsStill(), moved: function () {
                self.movedAt = Date.now();
            }});
        } else if (comp === 'cumple') {
            // Each person their moment: as long as the people of the day take (Gaudí, 7 November 2026).
            c.hkSeconds = startBirthdays(c, {still: this.keepsStill()});
        } else if (comp === 'canal') {
            // The paper plane crosses where nothing is read; leave() stops it.
            startChannel(c, {still: this.keepsStill()});
            c.hkStop = function () {
                stopChannel(c);
            };
        }
        // The parts of the slide in the order they are read, and its life while it stands (Gaudí, 8 November 2026): only the
        // compositions movimiento.js knows; the others keep their pass.
        if (!c.hkMotion) {
            c.hkMotion = motion(c, comp, {still: this.keepsStill(), seconds: c.hkFor || 0});
        }
    }

    /** A sentence or the countdown over the whole body, in the centre's colour (the art direction's «titular»). */
    typographic(x, today) {
        const s = el('section', 'hk-tipografica');
        s.setAttribute('data-tipo', x.type === 'cuenta' ? 'cuenta' : 'frase');
        const l = this.labelsLead();
        const c = today && today.countdown;
        if (x.type === 'cuenta' && c) {
            // The number is the slide: a board of flaps as tall as the block, «Faltan» over it, and the words beside it
            // (Gaudí, 8 November 2026), so that from afar the figure is read before the name.
            const board = el('div', 'hk-tipografica-marcador');
            board.appendChild(el('p', 'hk-tipografica-etiqueta', l.countdown));
            const flaps = el('div', 'hk-paletas hk-tipografica-paletas');
            String(c.days).split('').forEach(function (d) {
                flaps.appendChild(el('b', 'hk-paleta', d));
            });
            board.appendChild(flaps);
            s.appendChild(board);
            const side = el('div', 'hk-tipografica-lado');
            side.appendChild(el('p', 'hk-tipografica-dias', l.daysfor));
            side.appendChild(el('h2', 'hk-tipografica-texto', c.title));
            const foot = [c.day, c.group].filter(Boolean).join(' · ');
            if (foot) {
                side.appendChild(el('p', 'hk-tipografica-pie', foot));
            }
            s.appendChild(side);
        } else if (x.centre) {
            // The centre's own sentence: its logo for the dark (the block is in its colour), or its name, over it.
            s.classList.add('hk-tipografica-centro');
            const label = el('p', 'hk-tipografica-etiqueta');
            const id = this.identity || {};
            if (id.dark && id.dark !== id.light) {
                const im = el('img', 'hk-tipografica-logo');
                im.alt = '';
                im.src = id.dark;
                label.appendChild(im);
            } else {
                label.textContent = id.name || this.tickerLabel.textContent;
            }
            s.appendChild(label);
            s.appendChild(el('h2', 'hk-tipografica-texto', x.text || ''));
        } else {
            s.appendChild(el('p', 'hk-tipografica-etiqueta', this.tickerLabel.textContent));
            s.appendChild(el('h2', 'hk-tipografica-texto', x.text || ''));
        }
        return s;
    }

    /**
     * The important notice where there is no third: it takes the ticker, in its colour, without moving; the sentences come
     * back when the third or the lead shows it. Null to give the ticker back.
     *
     * @param {object|null} n the notice {title, body}
     */
    importantBand(n) {
        const key = n ? n.title + '|' + (n.body || '') : '';
        if (key === (this.bandKey || '')) {
            return;
        }
        this.bandKey = key;
        this.ticker.classList.toggle('hk-cinta-importante', !!n);
        this.frame.classList.toggle('hk-con-importante', !!n);
        clear(this.bandLine);
        if (!n) {
            this.liftFull();
            return;
        }
        this.bandLabel.innerHTML = MARK;
        this.bandLabel.appendChild(el('span', '', this.s.important || ''));
        this.bandLine.appendChild(document.createTextNode(n.title));
        const line = this.bandLine;
        const band = this.ticker;
        // It does not wrap, so only its width can overflow. Its height says nothing: a tight line leaves the letter's own
        // box sticking out of it, on any notice, and the band would go to two lines with one to say.
        const over = function () {
            return line.scrollWidth > line.clientWidth + 1;
        };
        // Its second line, if it fits; then, the title in two lines. It stays still, so it never comes in pieces.
        line.classList.remove('hk-solo-titulo');
        band.removeAttribute('data-lineas');
        if (n.body) {
            line.appendChild(el('span', '', n.body));
            const inside = line.querySelector('span');
            if (over() || inside.scrollWidth > inside.clientWidth + 1) {
                line.classList.add('hk-solo-titulo');
            }
        }
        if (over()) {
            // The band grows with its title: it says it whole, or it would not be there to be read.
            line.classList.add('hk-solo-titulo');
            band.setAttribute('data-lineas', '2');
        }
        this.liftFull();
    }

    /**
     * A whole picture of another shape has its words on a block beside it, when it leaves them room and the longest word
     * fits: they do not cover it, so nothing to shorten. Otherwise it stays centred, and its words go over it as on any other.
     *
     * @param {HTMLElement} m the picture's slot
     * @param {HTMLElement} pie its caption
     * @param {HTMLElement} h2 its headline
     * @returns {boolean} whether they went beside it
     */
    wordsBeside(m, pie, h2) {
        const pic = m.querySelector('.hk-diapo > img, .hk-diapo > video');
        const width = m.clientHeight * m.hkRatio;
        if (!pic || m.clientWidth - width < m.clientWidth * BESIDE_LEAST) {
            return false;
        }
        // Its width comes from the manifest and not from the file, which may still be on its way: the block is measured now.
        pic.style.width = Math.round(width) + 'px';
        m.setAttribute('data-al-lado', '');
        pie.setAttribute('data-ajuste', '0');
        even(h2);
        if (h2.scrollWidth <= h2.clientWidth + 1) {
            return true;
        }
        pic.style.width = '';
        m.removeAttribute('data-al-lado');
        return false;
    }

    /** The headline of each picture's caption, by steps and evened; in a band, one line or the smaller step. */
    fitCaptions(c, comp) {
        const vertical = !this.horizontal;
        const media = c.querySelectorAll('.hk-medio');
        for (let i = 0; i < media.length; i++) {
            const m = media[i];
            const pies = m.querySelectorAll('.hk-pie');
            const pie = pies[pies.length - 1];
            const h2 = pie && pie.querySelector('h2');
            if (pie && (comp === 'dos-verticales' || comp === 'tres-verticales' || comp === 'vertical-hoy')) {
                // The captions of a portrait slot are small: from afar, or when long, without their second line, or none
                // at all, rather than covering the picture. Also one portrait beside «Today», which from 8 m is narrow.
                pie.classList.remove('hk-pie-corto');
                pie.style.display = '';
                // A word wider than its picture would be cut at the edge: rather no caption (Jujol, 12 November 2026).
                const cut = function () {
                    return !!h2 && h2.scrollWidth > h2.clientWidth + 1;
                };
                if (pie.offsetHeight > m.clientHeight * 0.6 || cut()) {
                    pie.classList.add('hk-pie-corto');
                    if (pie.offsetHeight > m.clientHeight * 0.6 || cut()) {
                        pie.style.display = 'none';
                    }
                }
                continue;
            }
            if (!h2 || comp === 'vertical-hoy') {
                continue;
            }
            if (!vertical && m.classList.contains('hk-medio-contener') && (comp === 'foto-hoy' || comp === 'foto-sola') &&
                    this.wordsBeside(m, pie, h2)) {
                continue;
            }
            if (comp === 'apaisado' || comp === 'tiempo-tercio') {
                pie.setAttribute('data-ajuste', '0');
                if (linesOf(h2) > 1) {
                    pie.setAttribute('data-ajuste', '1');
                }
                even(h2);
                continue;
            }
            pie.hkShort = 'hk-pie-corto';
            fitHeadline(pie, h2, (comp === 'foto-hoy' && !vertical) || comp === 'zonas' ? 2 : 3, function () {
                return pie.offsetHeight > m.clientHeight * 0.62;
            });
            even(h2);
        }
    }

    /** The week's strip: its line at its size, or a step smaller when it takes two. */
    fitStrip(c) {
        const strip = c.querySelector('.hk-semana-titular');
        if (strip) {
            strip.setAttribute('data-ajuste', '0');
            if (linesOf(strip.querySelector('b')) > 1) {
                strip.setAttribute('data-ajuste', '1');
            }
        }
    }

    /** Once the layer is in the page: the headlines by steps and evened, the rest in its pages. */
    adjustLayer(c) {
        const vertical = !this.horizontal;
        const comp = c.getAttribute('data-composicion');
        const lead = c.querySelector('.hk-lider');
        if (lead) {
            const t = lead.querySelector('.hk-lider-titular');
            lead.hkShort = 'hk-lider-corto';
            // Measured on what holds the words: a bubble's tail hangs out of the lead on purpose.
            const words = lead.querySelector('.hk-lider-cuerpo') || lead;
            fitAlso(lead);
            const fit = function () {
                fitHeadline(lead, t, comp === 'vertical-hoy' && vertical ? 2 : 3, function () {
                    return words.scrollHeight > words.clientHeight + 1 || t.scrollWidth > t.clientWidth + 1;
                });
            };
            fit();
            // The icon gives way before the words: what it says, the title says better.
            const stamp = lead.querySelector('.hk-lider-sello');
            if (stamp && stamp.offsetWidth && wordsCramped(lead, t)) {
                lead.classList.remove('hk-lider-corto');
                lead.classList.add('hk-lider-sin-sello');
                fit();
            }
            even(t);
            // Never a short word alone in a line: from afar «Teatro / en / inglés» reads «en» as a word of its own.
            noLoneShortWord(lead);
            const second = lead.querySelector('.hk-lider-entrada');
            if (second) {
                even(second);
            }
            // The board's height depends on the screen and on what shares the body: the figure never taller than its flap.
            const flaps = lead.querySelectorAll('.hk-paleta');
            for (let i = 0; i < flaps.length; i++) {
                flaps[i].style.fontSize = '';
                const most = flaps[i].clientHeight * 1.02;
                if (most > 0 && parseFloat(getComputedStyle(flaps[i]).fontSize) > most) {
                    flaps[i].style.fontSize = Math.floor(most) + 'px';
                }
            }
        }
        this.fitShapes(c, comp);
        this.fitCaptions(c, comp);
        fitZones(c);
        fitBirthdays(c);
        fitBooks(c, this.horizontal);
        fitMoments(c, this.horizontal);
        fitChannel(c, this.horizontal);
        fitDeadlines(c);
        fitTable(c);
        const shelfTitle = c.querySelector('.hk-biblio-titulo');
        if (shelfTitle) {
            even(shelfTitle);
        }
        const type = c.querySelector('.hk-tipografica-texto');
        if (type) {
            const box = c.querySelector('.hk-tipografica');
            type.hkSteps = 4;
            fitHeadline(type, type, vertical ? 7 : 4, function () {
                return box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1;
            });
            even(type);
        }
        paginateRest(c.hkRest, this.turn || 0);
    }

    /**
     * A portrait slot beside «Today» keeps its shape: its width from its height, as the body is laid out now. The sheet's
     * widths (composiciones.css) come from the body of 0.6 and are only where it starts; the body is lower at every
     * distance since 0.7, and lower still with the birthday strip above the ticker, so a width of the sheet cut the photo.
     *
     * @param {HTMLElement} c the layer
     * @param {string} comp
     */
    fitShapes(c, comp) {
        if (comp !== 'vertical-hoy' && comp !== 'dos-verticales') {
            return;
        }
        const on = this.horizontal;
        const slots = c.querySelectorAll('.hk-medio[data-forma]');
        for (let i = 0; i < slots.length; i++) {
            const m = slots[i];
            m.style.width = '';
            const shape = SHAPES[m.getAttribute('data-forma')];
            if (on && shape && m.clientHeight) {
                // Two portraits are never wider than a pair of 2:3 (composiciones.css).
                const most = comp === 'dos-verticales' ? Math.min(shape, 2 / 3) : shape;
                m.style.width = Math.round(m.clientHeight * most) + 'px';
            }
        }
    }

    labelsFull() {
        const l = this.labels || {};
        const s = this.s;
        return {
            notices: l.notices || s.notices || '',
            events: l.events || s.events || '',
            upcoming: l.upcoming || s.upcoming || '',
            today: l.today || s.today || '',
            tomorrow: l.tomorrow || s.tomorrow || '',
            days: l.days || s.days_word || '',
        };
    }

    // The picture at full screen: its slide, a veil, a header of its own, its caption and the weather's credit.
    /**
     * The screen with nothing to show: it stays as it is from turn to turn, or it would blink. The code to add the first thing comes
     * and goes with extra.qr.
     *
     * @param {object} [extra] {qr: url or null, qrimage: the picture of its QR, from the site's shortener, or null}
     */
    fillIdle(extra) {
        const qr = (extra && extra.qr) || '';
        if (this.idle && this.idle.qr === qr) {
            return;
        }
        this.clearFull();
        const head = this.header();
        const box = qr ? this.qrBox(qr, false, extra.qrimage) : null;
        // Each of the centre's two colours, as they end up: a theme, a skin or its own.
        const full = this.full;
        const colour = function (name) {
            const probe = el('i');
            probe.style.color = 'var(' + name + ')';
            full.appendChild(probe);
            const c = getComputedStyle(probe).color;
            full.removeChild(probe);
            return c;
        };
        this.idle = buildIdle(this.full, head, {
            qr: box && box.nodeType === 1 ? box : null,
            qrLabel: this.s.idle_qr || '',
            credit: this.weather ? this.credit.textContent : '',
            still: this.keepsStill(),
            primary: colour('--hk-primario'),
            accent: colour('--hk-acento'),
        });
        this.idle.qr = qr;
        this.fitIdle();
    }

    /**
     * Measured with what is on it: the first time the screen may not have a clock yet, and then the name would have more room than it has.
     */
    fitIdle() {
        if (!this.idle) {
            return;
        }
        const node = this.idle.node;
        const place = node.querySelector('.hk-lugar');
        const ground = node.querySelector('.hk-reposo-tierra');
        const head = ground.querySelector('.hk-cabecera');
        const pads = getComputedStyle(ground);
        const clock = node.querySelector('.hk-reloj');
        // On a vertical screen the clock takes the width of the ground, whatever the centre's letter: it is what that half is for.
        clock.style.fontSize = '';
        if (!this.horizontal && clock.textContent) {
            const room = ground.clientWidth - parseFloat(pads.paddingLeft) - parseFloat(pads.paddingRight);
            clock.style.display = 'inline-block';
            const size = parseFloat(getComputedStyle(clock).fontSize);
            const wanted = size * room / clock.offsetWidth;
            clock.style.display = '';
            clock.style.fontSize = Math.floor(Math.min(wanted * .98, size * 1.5)) + 'px';
        }
        if (place && place.style.display !== 'none') {
            const room = ground.clientHeight - parseFloat(pads.paddingBottom);
            place.hkSteps = 3;
            fitHeadline(place, place, this.horizontal ? 2 : 3, function () {
                return place.scrollWidth > place.clientWidth + 1 || head.offsetHeight > room;
            });
        }
        this.tickIdle();
    }

    tickIdle() {
        if (this.idle && this.lastDate) {
            this.idle.tick(this.lastDate, this.weather ? this.weather.now.symbol : '');
        }
    }

    fillFull(item) {
        this.clearFull();
        const d = this.slide(item);
        const pie = d.querySelector('.hk-pie');
        if (pie) {
            d.removeChild(pie);
        }
        d.classList.add('hk-visible');
        this.full.appendChild(d);
        this.full.appendChild(el('div', 'hk-completa-velo'));
        this.full.appendChild(this.header());
        // Its web, as on the showcase: the QR on its white card on the right, and the caption beside it.
        const qr = item.web ? this.qrBox(item.web, false, item.webqr) : null;
        if (qr && qr.nodeType === 1) {
            this.full.setAttribute('data-con-qr', '');
            this.full.appendChild(qr);
        }
        if (pie) {
            this.full.appendChild(pie);
            const h2 = pie.querySelector('h2');
            if (h2) {
                const full = this.full;
                pie.hkShort = 'hk-pie-corto';
                fitHeadline(pie, h2, 3, function () {
                    // What the words take: on a vertical screen with a QR, the room kept under them for it does not count.
                    const kept = qr && qr.nodeType === 1 ? parseFloat(getComputedStyle(pie).paddingBottom) || 0 : 0;
                    return pie.offsetHeight - kept > full.clientHeight * 0.6;
                });
                even(h2);
            }
        }
        if (this.weather) {
            this.full.appendChild(el('p', 'hk-credito-tiempo', this.credit.textContent));
        }
        if (d.hkVideo) {
            d.hkTimer = setTimeout(function () {
                if (pie) {
                    pie.style.opacity = '0';
                }
                d.hkVideo.hkStarted = true;
                quiet(d.hkVideo.play());
            }, CAPTION_MS + 400);
        }
    }

    /**
     * A web's QR on its white card, with the address written short and, if the site says it, what to do.
     *
     * @param {string} url
     * @param {boolean} wrap its words in one box beside it (the poster's)
     * @param {object} [image] the picture of its QR, when the site's link shortener draws them (nur.click): kept by the
     *     screen as any picture, shown as one (nothing in it runs); without it, or until it is here, the code drawn here
     * @returns {HTMLElement}
     */
    qrBox(url, wrap, image) {
        const box = el('div', 'hk-qr');
        const src = image ? this.media.url(image) : null;
        if (src) {
            const img = el('img');
            img.alt = '';
            img.src = src;
            box.appendChild(img);
        } else {
            try {
                // nur.click's drawing, in black, drawn here: what every decoder reads as well as the plain code (art
                // direction, 8 November 2026).
                box.innerHTML = qrSvg(url);
            } catch (e) {
                // An address too long for a code: the slide goes on without it.
                return document.createDocumentFragment();
            }
        }
        const words = wrap ? el('div', 'hk-qr-textos') : box;
        // The short address may break after «/» or «.», never in the middle of a word.
        const web = el('p', 'hk-qr-web');
        shortWeb(url).split(/([/.])/).forEach(function (part) {
            if (part) {
                web.appendChild(document.createTextNode(part));
            }
            if (part === '/' || part === '.') {
                web.appendChild(el('wbr'));
            }
        });
        words.appendChild(web);
        if (this.s.scan) {
            words.appendChild(el('p', 'hk-qr-llamada', this.s.scan));
        }
        if (wrap) {
            box.appendChild(words);
        }
        return box;
    }

    /**
     * The wall of a showcase (the art direction's «mostrarMuroEscaparate»): the mosaic over the whole screen and under it
     * a poster in the centre's colour, its headline big and its QR if the album has a web. Over the previous slide as a
     * photo comes over another.
     *
     * @param {object} album
     * @returns {number} the seconds of the slide
     */
    fillPoster(album) {
        const full = this.full;
        if (this.posterStop) {
            this.posterStop();
        }
        const olds = Array.prototype.slice.call(full.childNodes);
        const canvas = el('div', 'hk-muro-lienzo hk-entrando');
        const logos = el('div', 'hk-muro-logo');
        const id = this.identity || {};
        [['hk-logo-claro', id.light], ['hk-logo-oscuro', id.dark]].forEach(function (l) {
            if (l[1]) {
                const im = el('img', l[0]);
                im.src = l[1];
                im.alt = '';
                logos.appendChild(im);
            }
        });
        canvas.appendChild(logos);
        canvas.appendChild(buildWall(wallCount(album, this.distance)));
        const bill = el('div', 'hk-muro-cartel');
        const text = el('div', 'hk-muro-cartel-texto');
        const h2 = el('h2', '', album.headline || album.name);
        text.appendChild(h2);
        if (album.subtitle) {
            text.appendChild(el('p', '', album.subtitle));
        }
        bill.appendChild(text);
        if (album.web) {
            bill.appendChild(this.qrBox(album.web, true, album.webqr));
        }
        canvas.appendChild(bill);
        full.appendChild(canvas);
        const veil = full.querySelector('.hk-completa-velo');
        if (!veil) {
            full.appendChild(el('div', 'hk-completa-velo'));
            full.appendChild(this.header());
        } else {
            full.appendChild(veil);
            const head = full.querySelector('.hk-cabecera');
            if (head) {
                full.appendChild(head);
            }
        }
        full.setAttribute('data-muro', '');
        bill.hkSteps = 2;
        fitHeadline(bill, h2, this.horizontal ? 2 : 3, function () {
            return h2.scrollWidth > h2.clientWidth + 1;
        });
        fitWord(h2);
        even(h2);
        const seconds = startWall(canvas, album, true);
        this.posterStop = canvas.hkStop;
        void full.offsetWidth;
        requestAnimationFrame(function () {
            canvas.classList.remove('hk-entrando');
            olds.forEach(function (n) {
                if (n.classList && !n.classList.contains('hk-completa-velo') && !n.classList.contains('hk-cabecera')) {
                    n.classList.add('hk-saliendo');
                }
            });
        });
        const self = this;
        setTimeout(function () {
            olds.forEach(function (n) {
                if (n.classList && n.classList.contains('hk-saliendo') && n.parentNode) {
                    if (n.classList.contains('hk-diapo')) {
                        self.stopSlide(n);
                    }
                    n.parentNode.removeChild(n);
                }
            });
        }, 2200);
        return seconds;
    }

    /**
     * A showcase slide (the art direction's «mostrarEscaparate»): the picture or video over the whole screen, its
     * headline big and its web with a QR. From one to the next the layer is not emptied: the new picture, headline and
     * QR come in over the old ones (.hk-entrando, then the old ones .hk-saliendo) and the old ones leave when covered;
     * the veil and the header stay on top. The picture takes .hk-visible on the next frame, so it dissolves in and
     * starts its slow move. A video's headline stays. Without any picture, the header alone.
     *
     * @param {object|undefined} item
     */
    fillShowcase(item) {
        const full = this.full;
        // Back from a wall: one photo over it, as any other.
        if (this.posterStop) {
            this.posterStop();
            this.posterStop = null;
        }
        full.removeAttribute('data-muro');
        full.removeAttribute('data-sin-pie');
        full.removeAttribute('data-con-qr');
        if (!item) {
            this.clearFull();
            full.appendChild(el('div', 'hk-completa-velo'));
            full.appendChild(this.header());
            return;
        }
        const olds = Array.prototype.slice.call(full.childNodes);
        const fresh = [];
        const put = function (n) {
            n.classList.add('hk-entrando');
            full.appendChild(n);
            fresh.push(n);
        };
        const d = this.slide(item);
        const inner = d.querySelector('.hk-pie');
        if (inner) {
            d.removeChild(inner);
        }
        put(d);
        const img = d.querySelector('img');
        if (img) {
            img.style.webkitTransitionDuration = '17s';
            img.style.transitionDuration = '17s';
        }
        const veil = full.querySelector('.hk-completa-velo');
        if (!veil) {
            full.appendChild(el('div', 'hk-completa-velo'));
            full.appendChild(this.header());
        } else {
            full.appendChild(veil);
            const head = full.querySelector('.hk-cabecera');
            if (head) {
                full.appendChild(head);
            }
        }
        const cap = item.caption || {};
        let pie = null;
        if (cap.title || cap.text) {
            pie = el('div', 'hk-pie hk-pie-escaparate');
            if (cap.title) {
                pie.appendChild(el('h2', '', cap.title));
            }
            if (cap.text) {
                pie.appendChild(el('p', '', cap.text));
            }
            put(pie);
        } else {
            full.setAttribute('data-sin-pie', '1');
        }
        if (item.web) {
            put(this.qrBox(item.web, false, item.webqr));
        }
        const h2 = pie && pie.querySelector('h2');
        if (h2) {
            pie.hkSteps = 2;
            fitHeadline(pie, h2, this.horizontal ? 2 : 3, function () {
                return h2.scrollWidth > h2.clientWidth + 1;
            });
            fitWord(h2);
            even(h2);
        }
        void full.offsetWidth;
        requestAnimationFrame(function () {
            fresh.forEach(function (n) {
                n.classList.remove('hk-entrando');
            });
            d.classList.add('hk-visible');
            olds.forEach(function (n) {
                if (!n.classList.contains('hk-completa-velo') && !n.classList.contains('hk-cabecera')) {
                    n.classList.add('hk-saliendo');
                }
            });
        });
        if (d.hkVideo) {
            d.hkTimer = setTimeout(function () {
                d.hkVideo.hkStarted = true;
                quiet(d.hkVideo.play());
            }, 400);
        }
        const self = this;
        setTimeout(function () {
            olds.forEach(function (n) {
                if (n.classList.contains('hk-saliendo') && n.parentNode) {
                    if (n.classList.contains('hk-diapo')) {
                        self.stopSlide(n);
                    }
                    n.parentNode.removeChild(n);
                }
            });
        }, 2200);
    }

    /**
     * Shows a slide. The same composition with the same shapes: only the pictures change, with the slides' own fade,
     * so «Today» does not blink. Another one: a new layer comes in while the old one leaves.
     *
     * @param {{comp: string, items: object[]}} choice
     * @param {object} today the data of «Today»
     * @param {object|null} week the week, from weekOf()
     */
    show(choice, today, week) {
        const comp = choice.comp;
        const items = choice.items;
        // One clock: the sentence of the ticker changes with the slide, in the same movement.
        if (this.tickerTurns()) {
            clearTimeout(this.phraseTimer);
            this.nextPhrase();
        }
        // The birthday strip steps aside for the big birthday slide and for what covers the whole screen, before anything is
        // measured: the body is as high as what is left.
        const poster0 = comp === 'muro' && choice.extra && choice.extra.poster;
        this.frame.classList.toggle('hk-sin-franja', comp === 'cumple' || comp === 'reposo' || comp === 'escaparate' || !!poster0);
        if (this.stripKey && !this.stripFitted) {
            this.stripFitted = fitBirthdayStrip(this.birthdayStrip, {vertical: !this.horizontal});
        }
        this.pendingBand = today && today.notices ? today.notices.filter(function (n) {
            return n.tone === 'important';
        })[0] || null : null;
        // Each slide turns the page of the rest and the important notice in the fixed place.
        this.turn = (this.turn || 0) + 1;
        this.movedAt = Date.now();
        const wasFull = !!FULL[this.frame.getAttribute('data-composicion')];
        const poster = comp === 'muro' && choice.extra && choice.extra.poster;
        if (FULL[comp] || poster) {
            // Under the full screen the layer stays, still: its videos stop.
            if (this.layer) {
                this.stopSlides(this.layer);
            }
            // Set first: the headline and the header are measured with the layer in its place.
            const shown = poster ? 'escaparate' : comp;
            this.frame.setAttribute('data-composicion', shown);
            this.comp = shown;
            let seconds;
            if (poster) {
                seconds = this.fillPoster(choice.extra.albumData);
            } else if (comp === 'escaparate') {
                this.fillShowcase(items[0]);
            } else if (comp === 'reposo') {
                this.fillIdle(choice.extra);
            } else {
                this.fillFull(items[0]);
            }
            this.fitHeaders();
            this.importantBand(comp === 'foto-completa' ? this.pendingBand : null);
            this.liftFull();
            return seconds;
        }
        this.fitHeaders();
        const shapes = items.map(shapeOf).join(',');
        const todayKey = JSON.stringify(today);
        if (this.layer && this.comp === comp && this.shapes === shapes && !NEW_EACH[comp] && !wasFull &&
                todayKey === this.todayKey) {
            const slots = this.layer.querySelectorAll('.hk-medio');
            for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];
                const olds = slot.querySelectorAll('.hk-diapo');
                const fresh = this.slide(items[i]);
                slot.appendChild(fresh);
                void slot.offsetWidth;
                fresh.classList.add('hk-visible');
                this.startVideo(fresh, comp);
                const self = this;
                // Every slide that was there goes, also one still fading in from a slide just before.
                for (let k = 0; k < olds.length; k++) {
                    this.stopSlide(olds[k]);
                }
                setTimeout(function () {
                    for (let k = 0; k < olds.length; k++) {
                        if (olds[k].parentNode) {
                            olds[k].parentNode.removeChild(olds[k]);
                        }
                    }
                }, 900);
            }
            this.fitCaptions(this.layer, comp);
            showRestPage(this.layer.hkRest, this.turn, true);
            turnFixed(this.layer.hkRest, this.turn, this.labelsLead());
            return;
        }
        const old = this.layer;
        const layer = this.makeLayer(comp, items, today, week, choice.extra);
        // How long it stays: the bar of the time left fills in it.
        layer.hkFor = choice.seconds;
        this.stage.appendChild(layer);
        // Where neither the third nor the lead shows the important notice, the ticker does.
        const lead = layer.querySelector('.hk-lider-importante');
        this.importantBand(layer.querySelector('.hk-resto') || lead ? null : this.pendingBand);
        this.refreshPhrases();
        this.fitStrip(layer);
        if (layer.hkWeek) {
            fitWeek(layer.hkWeek, this.horizontal);
        }
        this.adjustLayer(layer);
        // What moves, measured with its letters.
        const fontsComing = document.fonts && document.fonts.status === 'loading';
        if (!fontsComing) {
            this.startMoving(layer);
        }
        // Measured while the screens' letters were still arriving: once they are here (wider, as a rule), «Today» and
        // the week are measured again, so no title ends up in three lines.
        if (document.fonts && document.fonts.status === 'loading') {
            const self = this;
            document.fonts.ready.then(function () {
                self.remeasureFixed();
                if (self.layer === layer) {
                    self.fitStrip(layer);
                    if (layer.hkWeek) {
                        fitWeek(layer.hkWeek, self.horizontal);
                    }
                    self.adjustLayer(layer);
                    self.startMoving(layer);
                }
            });
        }
        void layer.offsetWidth;
        requestAnimationFrame(function () {
            layer.classList.add('hk-dentro');
        });
        if (old) {
            this.leave(old);
        }
        if (wasFull) {
            const self = this;
            setTimeout(function () {
                if (!FULL[self.frame.getAttribute('data-composicion')]) {
                    self.clearFull();
                }
            }, PASS_MS + 200);
        }
        this.frame.setAttribute('data-composicion', comp);
        this.comp = comp;
        this.shapes = shapes;
        this.layer = layer;
        this.todayKey = todayKey;
        return layer.hkSeconds;
    }

    leave(layer) {
        if (layer.hkMotion) {
            layer.hkMotion();
        }
        layer.classList.add('hk-fuera');
        if (layer.hkStop) {
            layer.hkStop();
        }
        const self = this;
        setTimeout(function () {
            self.stopSlides(layer);
            if (layer.parentNode) {
                layer.parentNode.removeChild(layer);
            }
        }, PASS_MS);
    }

    // --- The ticker -------------------------------------------------------------------------------------------------

    /**
     * The urgent notice over the whole screen, or null to take it off. Red with white, the same in both themes, its
     * edges striped, the clock in a corner; nothing moves, and what was under it stops (the art direction's
     * urgente.css).
     *
     * @param {object|null} item
     */
    showUrgent(item) {
        const key = item ? item.id + '\u0000' + (item.title || '') + '\u0000' + (item.body || '') : '';
        if (key === this.urgentKey) {
            return;
        }
        this.urgentKey = key;
        if (this.urgent && this.urgent.parentNode) {
            this.urgent.parentNode.removeChild(this.urgent);
        }
        this.urgent = null;
        this.frame.classList.toggle('hk-con-urgente', !!item);
        if (!item) {
            return;
        }
        const layer = el('div', 'hk-urgente');
        layer.setAttribute('role', 'alert');
        layer.appendChild(el('p', 'hk-urgente-etiqueta', this.s.urgent || ''));
        layer.appendChild(el('h1', '', item.title || ''));
        if (item.body) {
            layer.appendChild(el('p', 'hk-urgente-texto', item.body));
        }
        this.urgentClock = el('p', 'hk-urgente-hora', this.lastDate ? two(this.lastDate.getHours()) + ':' +
            two(this.lastDate.getMinutes()) : '');
        layer.appendChild(this.urgentClock);
        this.frame.appendChild(layer);
        this.urgent = layer;
        // It grows with the distance; a long one steps down before it overflows, and its title is evened. Its words are
        // centred, so they overflow at both ends: measured from the label at the top to the last line at the bottom.
        const title = layer.querySelector('h1');
        const first = layer.firstChild;
        const last = this.urgentClock.previousSibling;
        fitHeadline(layer, title, this.horizontal ? 4 : 6, function () {
            const box = layer.getBoundingClientRect();
            const cs = getComputedStyle(layer);
            return first.getBoundingClientRect().top < box.top + parseFloat(cs.paddingTop) - 1 ||
                last.getBoundingClientRect().bottom > box.bottom - parseFloat(cs.paddingBottom) + 1;
        });
        even(title);
        const videos = this.stage ? this.stage.querySelectorAll('video') : [];
        for (let i = 0; i < videos.length; i++) {
            videos[i].pause();
        }
    }

    /**
     * The ticker, one sentence at a time (the art direction's «cinta.css»): each in one line at --hk-t-lista; if not,
     * in two at --hk-t-min; if not even so, cut at a comma or a colon near the middle into two that come one after the
     * other. A sentence stays 6 s, or 2 s and 0.35 s a word, up to 12 s; a counter says which. The centre's own sentence
     * (centre.phrase) is one more, said whole and set apart, every few of them (lema.js); alone when there are no others.
     *
     * @param {string[]} texts
     * @param {string} [phrase] the centre's own sentence
     */
    showTicker(texts, phrase) {
        const centre = phrase || '';
        const text = texts.join('\u0000') + '\u0001' + centre;
        if (text === this.tickerText) {
            return;
        }
        this.tickerText = text;
        this.frame.classList.toggle('hk-sin-cinta', !texts.length && !centre);
        clearTimeout(this.phraseTimer);
        clear(this.tickerTrack);
        clear(this.tickerCount);
        this.ticker.classList.remove('hk-cinta-centro');
        this.phraseNode = null;
        this.phraseAt = 0;
        this.centreText = centre;
        this.centreCount = centreState();
        this.phrases = texts.length ? this.preparePhrases(texts) : [];
        this.centreLine = centre ? this.measureCentre(centre) : null;
        this.tickerTexts = texts;
        if (this.phrases.length || this.centreLine) {
            this.nextPhrase();
        }
    }

    /** Whether the ticker changes its sentence with each slide: more than one to say. */
    tickerTurns() {
        const n = (this.phrases || []).length;
        return n > 1 || (n === 1 && !!this.centreLine);
    }

    /**
     * The centre's sentence measured in the ticker, with the seal in place of the label: one line at --hk-t-lista, or two at
     * --hk-t-min. Never cut: null when it does not fit even so, and then it is not said in the ticker (the panel keeps it short
     * enough: LEEME); from 8 m it is a headline of its own.
     *
     * @param {string} text
     * @returns {{text: string, lines: number, centre: true}|null}
     */
    measureCentre(text) {
        const track = this.tickerTrack;
        if (!track.offsetWidth) {
            this.phrasesStale = true;
            return null;
        }
        this.phrasesStale = false;
        const had = this.ticker.classList.contains('hk-cinta-centro');
        this.ticker.classList.add('hk-cinta-centro');
        const p = el('p', 'hk-frase hk-frase-centro');
        p.appendChild(el('span', '', text));
        p.style.visibility = 'hidden';
        track.appendChild(p);
        const span = p.firstChild;
        let r = null;
        if (linesOf(span) <= 1 && span.offsetWidth <= p.clientWidth + 1) {
            r = {text, lines: 1, centre: true};
        } else {
            p.setAttribute('data-lineas', '2');
            if (linesOf(span) <= 2 && span.offsetHeight <= p.clientHeight + 1) {
                r = {text, lines: 2, centre: true};
            }
        }
        track.removeChild(p);
        if (!had) {
            this.ticker.classList.remove('hk-cinta-centro');
        }
        return r;
    }

    /** The seal of the centre's sentence: the logo of each theme on its card, or the centre's initial. */
    paintSeal() {
        const seal = this.tickerSeal;
        if (!seal) {
            return;
        }
        const id = this.identity || {};
        const key = (id.light || '') + '|' + (id.dark || '') + '|' + (id.name || '');
        if (key === this.sealKey) {
            return;
        }
        this.sealKey = key;
        clear(seal);
        seal.removeAttribute('data-inicial');
        if (id.light) {
            [['hk-logo-claro', id.light], ['hk-logo-oscuro', id.dark || id.light]].forEach(function (l) {
                const im = el('img', l[0]);
                im.alt = '';
                im.src = l[1];
                seal.appendChild(im);
            });
        } else if (id.name) {
            seal.setAttribute('data-inicial', '');
            seal.appendChild(el('span', '', id.name.trim().charAt(0).toUpperCase()));
        }
        // Without either, the label of the ticker stays in its place.
        this.ticker.classList.toggle('hk-cinta-sin-sello', !seal.firstChild);
        if (this.centreText) {
            this.phrasesStale = true;
            this.refreshPhrases();
        }
    }

    preparePhrases(texts) {
        const track = this.tickerTrack;
        // Under a full-screen slide the ticker has no size: nothing can be measured until it is back (nextPhrase).
        this.phrasesStale = !track.offsetWidth;
        const out = [];
        // Measured with the counter in place.
        this.tickerCount.textContent = '88/88';
        const node = function (t) {
            const p = el('p', 'hk-frase');
            p.appendChild(el('span', '', t));
            return p;
        };
        const tryOne = function (t, cuts) {
            const p = node(t);
            p.style.visibility = 'hidden';
            track.appendChild(p);
            const span = p.firstChild;
            let r = null;
            if (linesOf(span) <= 1) {
                r = {text: t, lines: 1};
            } else {
                p.setAttribute('data-lineas', '2');
                if (linesOf(span) <= 2 && span.offsetHeight <= p.clientHeight) {
                    r = {text: t, lines: 2};
                }
            }
            track.removeChild(p);
            if (r) {
                out.push(r);
                return;
            }
            const half = t.length / 2;
            let best = -1;
            let skip = 2;
            t.replace(/[,:;]\s/g, function (x, i) {
                if (best === -1 || Math.abs(i - half) < Math.abs(best - half)) {
                    best = i;
                }
                return x;
            });
            if (best === -1) {
                skip = 1;
                t.replace(/\s/g, function (x, i) {
                    if (best === -1 || Math.abs(i - half) < Math.abs(best - half)) {
                        best = i;
                    }
                    return x;
                });
            }
            if (best > 0 && cuts < 2) {
                tryOne(t.slice(0, best) + '…', cuts + 1);
                tryOne('…' + t.slice(best + skip), cuts + 1);
            } else {
                out.push({text: t, lines: 2});
            }
        };
        texts.forEach(function (t) {
            tryOne(t, 0);
        });
        clear(this.tickerCount);
        this.phrasesStale = !track.offsetWidth;
        return out;
    }

    /** The letters have arrived, wider as a rule: what stays on the screen is measured again with them. */
    remeasureFixed() {
        this.fitHeaders();
        this.fitIdle();
        if (this.ticker.classList.contains('hk-cinta-importante')) {
            this.bandKey = null;
            this.importantBand(this.pendingBand);
        }
        if ((this.tickerTexts && this.tickerTexts.length) || this.centreText) {
            this.phrasesStale = true;
            this.refreshPhrases();
        }
        if (this.stripKey) {
            this.stripFitted = fitBirthdayStrip(this.birthdayStrip, {vertical: !this.horizontal});
            this.liftFull();
        }
    }

    /**
     * The ticker has its size back (under the important notice or a full-screen slide it has none): the sentences measured
     * without it are measured again, and the one on show goes at once, or it would stay cut until the next one comes.
     */
    refreshPhrases() {
        if (!this.phrasesStale || !this.tickerTrack.offsetWidth || ((!this.tickerTexts || !this.tickerTexts.length) &&
                !this.centreText)) {
            return;
        }
        clearTimeout(this.phraseTimer);
        if (this.phraseNode && this.phraseNode.parentNode) {
            this.phraseNode.parentNode.removeChild(this.phraseNode);
        }
        this.phraseNode = null;
        this.phraseAt = 0;
        this.nextPhrase();
    }

    nextPhrase() {
        if (this.phrasesStale && this.tickerTrack.offsetWidth) {
            const texts = this.tickerTexts || [];
            this.phrases = texts.length ? this.preparePhrases(texts) : [];
            this.centreLine = this.centreText ? this.measureCentre(this.centreText) : null;
        }
        const list = this.phrases || [];
        const centre = this.centreLine;
        let f = null;
        let i = -1;
        if (centre && centreDue(this.centreCount || centreState(), list.length, Date.now())) {
            f = centre;
        } else if (list.length) {
            i = this.phraseAt % list.length;
            f = list[i];
            this.phraseAt++;
        }
        if (!f) {
            return;
        }
        this.centreCount = centreAfter(this.centreCount || centreState(), f === centre, Date.now());
        const self = this;
        const track = this.tickerTrack;
        const old = this.phraseNode;
        const turns = this.tickerTurns();
        if (old && old.hkPhrase === f) {
            // The same one again (one sentence, and the centre's not due yet): it stays as it is.
            if (turns) {
                this.phraseTimer = setTimeout(function () {
                    self.nextPhrase();
                }, PHRASE_WAITS_MS);
            }
            return;
        }
        if (old) {
            old.classList.remove('hk-frase-dentro');
            old.classList.add('hk-frase-fuera');
            setTimeout(function () {
                if (old.parentNode) {
                    old.parentNode.removeChild(old);
                }
            }, 600);
        }
        const fresh = el('p', 'hk-frase' + (f.centre ? ' hk-frase-centro' : ''));
        fresh.hkPhrase = f;
        fresh.appendChild(el('span', '', f.text));
        if (f.lines === 2) {
            fresh.setAttribute('data-lineas', '2');
        }
        const count = this.tickerCount;
        const ticker = this.ticker;
        setTimeout(function () {
            // The ticker may have changed in the meantime, and this phrase with it.
            if (self.phraseNode !== fresh) {
                return;
            }
            // The centre's seal and the counter change while nothing is written: the old one has gone.
            ticker.classList.toggle('hk-cinta-centro', !!f.centre);
            clear(count);
            if (!f.centre && list.length > 1) {
                count.appendChild(el('b', '', String(i + 1)));
                count.appendChild(document.createTextNode('/' + list.length));
            }
            track.appendChild(fresh);
            void fresh.offsetWidth;
            requestAnimationFrame(function () {
                fresh.classList.add('hk-frase-dentro');
            });
        }, old ? 700 : 0);
        this.phraseNode = fresh;
        if (turns) {
            // Usually the next slide changes it; this is for the long ones.
            this.phraseTimer = setTimeout(function () {
                self.nextPhrase();
            }, PHRASE_WAITS_MS);
        }
    }

    /**
     * Whose birthday it is today, in a strip above the ticker all day (franja.js), over every composition but the big
     * birthday slide and what covers the whole screen; null takes it away. The body is measured again with what it leaves.
     *
     * @param {object|null} item today's birthdays, {people: [...]}
     */
    showBirthdayStrip(item) {
        const self = this;
        const url = function (ref) {
            return self.media.url(ref);
        };
        const key = stripKey(item, url);
        if (key === (this.stripKey || '')) {
            return;
        }
        this.stripKey = key;
        if (this.stripStop) {
            this.stripStop();
            this.stripStop = null;
        }
        this.frame.classList.toggle('hk-con-franja', !!key);
        if (key) {
            buildStrip(this.birthdayStrip, item, {one: this.s.birthdays_one || '', media: url});
            this.stripFitted = fitBirthdayStrip(this.birthdayStrip, {vertical: !this.horizontal});
            // Its next person never in the same moment as a slide comes in or the column of the two zones changes.
            this.stripStop = startStrip(this.birthdayStrip, {still: this.keepsStill(), busy: function () {
                return Date.now() - (self.movedAt || 0) < 2000;
            }});
        } else {
            clear(this.birthdayStrip);
            this.stripFitted = false;
        }
        this.liftFull();
        if (this.layer && !FULL[this.comp]) {
            this.adjustLayer(this.layer);
        }
    }

    /** What sits at the bottom over a full-screen picture (the strip, the important band): its caption and QR go over it. */
    liftFull() {
        const f = this.frame;
        const shown = f.classList.contains('hk-con-franja') && !f.classList.contains('hk-sin-franja');
        const strip = shown ? this.birthdayStrip.offsetHeight : 0;
        const band = f.classList.contains('hk-con-importante') ? this.ticker.offsetHeight : 0;
        f.style.setProperty('--hk-pie-abajo', (strip + band) + 'px');
    }

    /** What the screen is for now, on the frame: a showcase hides the ticker (nothing in detail). */
    setUse(use) {
        if (this.frame.getAttribute('data-uso') !== use) {
            this.frame.setAttribute('data-uso', use);
        }
    }

    /**
     * What a slide brings in large, for the count of what came out.
     *
     * @param {object} choice the slide
     * @returns {string[]}
     */
    shownIds(choice) {
        const out = choice.items.map(function (it) {
            return it.id;
        });
        const extra = choice.extra || {};
        if (extra.item && extra.item.id) {
            out.push(extra.item.id);
        }
        if (extra.album) {
            out.push(extra.album);
        }
        if (choice.comp === 'agenda') {
            out.push('agenda');
        }
        if (!FULL[choice.comp] && this.led) {
            out.push(this.led);
        }
        return out.filter(function (id, i) {
            return id && out.indexOf(id) === i;
        });
    }

    /** What is on the screen now, for the heartbeat. */
    showing() {
        const out = [];
        const scope = FULL[this.comp] ? this.full : this.layer;
        if (scope) {
            const slides = scope.querySelectorAll('.hk-diapo');
            for (let i = 0; i < slides.length; i++) {
                if (slides[i].hkItem) {
                    out.push({zone: 'main', item: slides[i].hkItem.id});
                }
            }
        }
        if (this.comp) {
            out.push({zone: 'composition', item: this.comp});
        }
        return out;
    }
}
