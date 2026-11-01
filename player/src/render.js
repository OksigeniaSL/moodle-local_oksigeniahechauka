// Paints the screen with the templates and the compositions of the art direction (hechauka.css, composiciones.css,
// tiempo.css, proximos-dias.css): a header, a stage where each slide puts its composition in a layer of its own, the
// ticker, and a layer over everything for a picture at full screen. The frame is built once; layers come and go, so a
// screen that runs for months does not pile up nodes.

import {shapeOf} from './compose.js';
import {buildWeatherThird} from './today.js';
import {buildLead, buildRest, fitHeadline, fitWord, leadsOf, linesOf, paginateRest, showRestPage, turnFixed, weekHeadline} from './lead.js';
import {qrPath, shortWeb} from './qr.js';
import {even} from './balance.js';
import {buildAgenda, startAgenda} from './agendaview.js';
import {buildCarousel, buildWall, buildWallBand, startCarousel, startWall, wallCount} from './photos.js';
import {buildWeek, fitWeek} from './weekview.js';

const CAPTION_MS = 2800;

/** The compositions that are made anew each time, never only their pictures changed. */
const NEW_EACH = {'solo-hoy': true, semana: true, titular: true, agenda: true, muro: true, 'fotos-tercio': true};

/** The compositions over the whole screen, in their own layer. */
const FULL = {'foto-completa': true, 'escaparate': true};
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
        this.full = el('div', 'hk-completa hk-sobre-foto');
        this.credit = el('p', 'hk-credito-tiempo');
        this.sample = el('span', 'hk-muestra', this.s.sample || 'Sample data');
        this.frame.appendChild(this.stage);
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
        h.appendChild(weather);
        h.appendChild(hour);
        const parts = {node: h, logo, logoDark, place, weather, day, rest, clock};
        this.headers.push(parts);
        if (this.identity) {
            this.paintHeader(parts);
        }
        return h;
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
        this.identity = {name: scr.name || ''};
        this.applyTheme(manifest.theme || {});
        this.setWeather(manifest.weather || null);
        this.todayKey = '';
    }

    applyTheme(theme) {
        const style = document.documentElement.style;
        const vars = theme.vars || {};
        Object.keys(vars).forEach(function (name) {
            if (name.indexOf('--hk-') === 0 && safeValue(vars[name])) {
                style.setProperty(name, vars[name]);
            }
        });
        this.identity = this.identity || {name: ''};
        this.identity.light = this.media.url(theme.logo);
        this.identity.dark = this.media.url(theme.logo_dark) || this.identity.light;
        this.frame.classList.toggle('hk-sin-logo', !this.identity.light);
        this.headers.forEach((p) => this.paintHeader(p));
        this.fonts(theme.fonts || []);
    }

    paintHeader(p) {
        const id = this.identity;
        p.place.textContent = id.name;
        p.place.style.display = id.name ? '' : 'none';
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
        }
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
        this.lastDate = d;
        this.headers.forEach((p) => this.paintClock(p, d));
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
     * septiembre»), so it is measured: when the header does not fit, it gives way by steps: the date in two lines, the
     * clock and the degrees a bit smaller, and at last the weather leaves the header.
     */
    fitHeaders() {
        const steps = ['hk-fecha-larga', 'hk-cab-justa', 'hk-cab-sin-tiempo'];
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
                return box.width === 0 || hour.getBoundingClientRect().right <= box.right + 1;
            };
            for (let i = 0; i < steps.length && !fits(); i++) {
                p.node.classList.add(steps[i]);
            }
        });
    }

    // --- The slides -------------------------------------------------------------------------------------------------

    /** A picture or a video with its caption. A video shows its caption over the still, then plays clean. */
    slide(item) {
        const d = el('div', 'hk-diapo');
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
            v.addEventListener('error', function () {
                self.hooks.mediaFailed(item);
            });
            d.appendChild(v);
            d.hkVideo = v;
        } else {
            const img = el('img');
            img.alt = '';
            const self = this;
            img.onerror = function () {
                self.hooks.mediaFailed(item);
            };
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
        this.stopSlides(this.full);
        clear(this.full);
        this.headers = this.headers.filter(function (p) {
            return p.node.parentNode !== null;
        });
    }

    slot(item, comp) {
        const s = el('section', 'hk-medio' + (item.fit === 'contain' || item.fit === 'blur' ? ' hk-medio-contener' : ''));
        const shape = shapeOf(item);
        if (shape && comp !== 'foto-hoy' && comp !== 'foto-sola') {
            s.setAttribute('data-forma', shape);
        }
        const d = this.slide(item);
        d.classList.add('hk-visible');
        s.appendChild(d);
        this.startVideo(d, comp);
        return s;
    }

    // --- The compositions -------------------------------------------------------------------------------------------

    makeLayer(comp, items, today, week, extra) {
        const c = el('div', 'hk-cuerpo hk-capa');
        c.setAttribute('data-composicion', comp);
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
            c.hkWeek = buildWeek(week, {today: l.today, tomorrow: l.tomorrow, none: this.s.week_none || '',
                more: this.s.week_more || '+{n}'});
            c.appendChild(c.hkWeek);
            return c;
        }
        if (comp === 'tiempo-tercio') {
            c.appendChild(this.slot(items[0], comp));
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
            return all[(self.leadTurn - 1) % all.length];
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
        if (comp === 'dos-verticales') {
            const pair = el('div', 'hk-pareja');
            pair.setAttribute('data-forma', shapeOf(items[0]) || '2x3');
            pair.appendChild(this.slot(items[0], comp));
            pair.appendChild(this.slot(items[1], comp));
            c.appendChild(pair);
            withRest(null);
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
            const p = nextLead();
            if (p) {
                c.appendChild(buildLead(p, today, l));
            }
        } else if (comp === 'foto-hoy' || comp === 'apaisado') {
            withRest(null);
        }
        return c;
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
            notices: l.notices || s.notices || '',
            upcoming: l.upcoming || s.upcoming || '',
        };
    }

    /** The words of the agenda. */
    agendaWords() {
        const s = this.s;
        return {months: s.months, letters: s.letters, date_format: s.date_format, agenda_in: s.agenda_in,
            agenda_more: s.agenda_more, agenda_nomore: s.agenda_nomore, agenda_quiet_title: s.agenda_quiet_title,
            agenda_quiet: s.agenda_quiet};
    }

    /** What moves by itself in a layer, once in the page and with its letters: it says how long the slide lasts. */
    startMoving(c) {
        const comp = c.getAttribute('data-composicion');
        if (comp === 'agenda') {
            c.hkSeconds = startAgenda(c, {distance: this.distance, glass: !!this.glass,
                still: this.frame.classList.contains('hk-quieto') ||
                    !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)});
        } else if (comp === 'fotos-tercio') {
            const self = this;
            c.hkSeconds = startCarousel(c, function () {
                self.turn++;
                showRestPage(c.hkRest, self.turn, true);
            }, linesOf);
        } else if (comp === 'muro') {
            c.hkSeconds = startWall(c, c.hkAlbum, false);
        }
    }

    /** A sentence or the countdown over the whole body, in the centre's colour (the art direction's «titular»). */
    typographic(x, today) {
        const s = el('section', 'hk-tipografica');
        s.setAttribute('data-tipo', x.type === 'cuenta' ? 'cuenta' : 'frase');
        const l = this.labelsLead();
        const c = today && today.countdown;
        if (x.type === 'cuenta' && c) {
            s.appendChild(el('p', 'hk-tipografica-etiqueta', l.countdown));
            const n = el('p', 'hk-tipografica-cuenta');
            n.appendChild(el('b', '', String(c.days)));
            n.appendChild(el('span', '', l.daysfor));
            s.appendChild(n);
            s.appendChild(el('h2', 'hk-tipografica-texto', c.title));
            const foot = [c.day, c.group].filter(Boolean).join(' · ');
            if (foot) {
                s.appendChild(el('p', 'hk-tipografica-pie', foot));
            }
        } else {
            s.appendChild(el('p', 'hk-tipografica-etiqueta', this.tickerLabel.textContent));
            s.appendChild(el('h2', 'hk-tipografica-texto', x.text || ''));
        }
        return s;
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
            if (pie && comp === 'dos-verticales') {
                // The pair's captions are small: from afar, or when long, without their second line, or none at all,
                // rather than covering the picture.
                pie.classList.remove('hk-pie-corto');
                pie.style.display = '';
                if (pie.offsetHeight > m.clientHeight * 0.6) {
                    pie.classList.add('hk-pie-corto');
                    if (pie.offsetHeight > m.clientHeight * 0.6) {
                        pie.style.display = 'none';
                    }
                }
                continue;
            }
            if (!h2 || comp === 'vertical-hoy') {
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
            fitHeadline(pie, h2, comp === 'foto-hoy' && !vertical ? 2 : 3, function () {
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
            fitHeadline(lead, t, comp === 'vertical-hoy' && vertical ? 2 : 3, function () {
                return lead.scrollHeight > lead.clientHeight + 1 || lead.scrollWidth > lead.clientWidth + 1;
            });
            even(t);
        }
        this.fitCaptions(c, comp);
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
        if (pie) {
            this.full.appendChild(pie);
            const h2 = pie.querySelector('h2');
            if (h2) {
                const full = this.full;
                pie.hkShort = 'hk-pie-corto';
                fitHeadline(pie, h2, 3, function () {
                    return pie.offsetHeight > full.clientHeight * 0.6;
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
     * @returns {HTMLElement}
     */
    qrBox(url, wrap) {
        const box = el('div', 'hk-qr');
        const q = qrPath(url);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 ' + q.size + ' ' + q.size);
        svg.setAttribute('shape-rendering', 'crispEdges');
        svg.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', q.d);
        svg.appendChild(path);
        box.appendChild(svg);
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
            bill.appendChild(this.qrBox(album.web, true));
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
            put(this.qrBox(item.web, false));
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
        // Each slide turns the page of the rest and the important notice in the fixed place.
        this.turn = (this.turn || 0) + 1;
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
            } else {
                this.fillFull(items[0]);
            }
            this.fitHeaders();
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
        this.stage.appendChild(layer);
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
        const videos = this.stage ? this.stage.querySelectorAll('video') : [];
        for (let i = 0; i < videos.length; i++) {
            videos[i].pause();
        }
    }

    /**
     * The ticker, one sentence at a time (the art direction's «cinta.css»): each in one line at --hk-t-lista; if not,
     * in two at --hk-t-min; if not even so, cut at a comma or a colon near the middle into two that come one after the
     * other. A sentence stays 6 s, or 2 s and 0.35 s a word, up to 12 s; a counter says which.
     *
     * @param {string[]} texts
     */
    showTicker(texts) {
        const text = texts.join('\u0000');
        if (text === this.tickerText) {
            return;
        }
        this.tickerText = text;
        this.frame.classList.toggle('hk-sin-cinta', !texts.length);
        clearTimeout(this.phraseTimer);
        clear(this.tickerTrack);
        clear(this.tickerCount);
        this.phraseNode = null;
        this.phraseAt = 0;
        this.phrases = texts.length ? this.preparePhrases(texts) : [];
        if (this.phrases.length) {
            this.nextPhrase();
        }
    }

    preparePhrases(texts) {
        const track = this.tickerTrack;
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
        return out;
    }

    nextPhrase() {
        const list = this.phrases || [];
        if (!list.length) {
            return;
        }
        const i = this.phraseAt % list.length;
        const f = list[i];
        const track = this.tickerTrack;
        const old = this.phraseNode;
        if (old) {
            old.classList.remove('hk-frase-dentro');
            old.classList.add('hk-frase-fuera');
            setTimeout(function () {
                if (old.parentNode) {
                    old.parentNode.removeChild(old);
                }
            }, 600);
        }
        const fresh = el('p', 'hk-frase');
        fresh.appendChild(el('span', '', f.text));
        if (f.lines === 2) {
            fresh.setAttribute('data-lineas', '2');
        }
        setTimeout(function () {
            track.appendChild(fresh);
            void fresh.offsetWidth;
            requestAnimationFrame(function () {
                fresh.classList.add('hk-frase-dentro');
            });
        }, old ? 700 : 0);
        this.phraseNode = fresh;
        clear(this.tickerCount);
        if (list.length > 1) {
            this.tickerCount.appendChild(el('b', '', String(i + 1)));
            this.tickerCount.appendChild(document.createTextNode('/' + list.length));
        }
        this.phraseAt++;
        if (list.length > 1) {
            const words = f.text.split(/\s+/).length;
            const wait = Math.min(12, Math.max(6, 2 + 0.35 * words));
            const self = this;
            this.phraseTimer = setTimeout(function () {
                self.nextPhrase();
            }, wait * 1000);
        }
    }

    /** What the screen is for now, on the frame: a showcase hides the ticker (nothing in detail). */
    setUse(use) {
        if (this.frame.getAttribute('data-uso') !== use) {
            this.frame.setAttribute('data-uso', use);
        }
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
