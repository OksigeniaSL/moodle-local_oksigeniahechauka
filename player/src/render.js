// Paints the screen with the templates and the compositions of the art direction (hechauka.css, composiciones.css,
// tiempo.css, proximos-dias.css): a header, a stage where each slide puts its composition in a layer of its own, the
// ticker, and a layer over everything for a picture at full screen. The frame is built once; layers come and go, so a
// screen that runs for months does not pile up nodes.

import {shapeOf} from './compose.js';
import {buildToday, fitToday, turnPages} from './today.js';

const CAPTION_MS = 2800;
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
        this.ticker = el('footer', 'hk-cinta');
        this.tickerLabel = el('b');
        const track = el('div', 'hk-cinta-pista');
        this.tickerTrack = el('span', 'hk-cinta-texto');
        track.appendChild(this.tickerTrack);
        this.ticker.appendChild(this.tickerLabel);
        this.ticker.appendChild(track);
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

    // --- The slides -------------------------------------------------------------------------------------------------

    /** A picture or a video with its caption. A video shows its caption over the still, then plays clean. */
    slide(item) {
        const d = el('div', 'hk-diapo');
        d.hkItem = item;
        const contain = item.fit === 'contain';
        const src = this.media.url(item.media);
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
    startVideo(d) {
        if (!d.hkVideo) {
            return;
        }
        d.hkTimer = setTimeout(function () {
            d.classList.add('hk-reproduciendo');
            d.hkVideo.hkStarted = true;
            quiet(d.hkVideo.play());
        }, CAPTION_MS);
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
        this.stopSlides(this.full);
        clear(this.full);
        this.headers = this.headers.filter(function (p) {
            return p.node.parentNode !== null;
        });
    }

    slot(item, comp) {
        const s = el('section', 'hk-medio' + (item.fit === 'contain' ? ' hk-medio-contener' : ''));
        const shape = shapeOf(item);
        if (shape && comp !== 'foto-hoy' && comp !== 'foto-sola') {
            s.setAttribute('data-forma', shape);
        }
        const d = this.slide(item);
        d.classList.add('hk-visible');
        s.appendChild(d);
        this.startVideo(d);
        return s;
    }

    // --- The compositions -------------------------------------------------------------------------------------------

    makeLayer(comp, items, today) {
        const c = el('div', 'hk-cuerpo hk-capa');
        c.setAttribute('data-composicion', comp);
        if (comp === 'dos-verticales') {
            const pair = el('div', 'hk-pareja');
            pair.setAttribute('data-forma', shapeOf(items[0]) || '2x3');
            pair.appendChild(this.slot(items[0], comp));
            pair.appendChild(this.slot(items[1], comp));
            c.appendChild(pair);
        } else if (comp !== 'solo-hoy') {
            c.appendChild(this.slot(items[0], comp));
        }
        if (comp !== 'foto-sola' && !this.noToday) {
            const aside = buildToday(today, this.labelsFull(), comp === 'solo-hoy', this.horizontal,
                this.weather ? this.sky : null);
            if (aside) {
                c.appendChild(aside);
            }
            c.hkToday = aside;
        }
        return c;
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
     * Shows a slide. The same composition with the same shapes: only the pictures change, with the slides' own fade,
     * so «Today» does not blink. Another one: a new layer comes in while the old one leaves.
     *
     * @param {{comp: string, items: object[]}} choice
     * @param {object} today the data of «Today»
     */
    show(choice, today) {
        const comp = choice.comp;
        const items = choice.items;
        const wasFull = this.frame.getAttribute('data-composicion') === 'foto-completa';
        if (comp === 'foto-completa') {
            this.fillFull(items[0]);
            this.frame.setAttribute('data-composicion', comp);
            this.comp = comp;
            return;
        }
        const shapes = items.map(shapeOf).join(',');
        const todayKey = JSON.stringify(today);
        if (this.layer && this.comp === comp && this.shapes === shapes && comp !== 'solo-hoy' && !wasFull) {
            const slots = this.layer.querySelectorAll('.hk-medio');
            for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];
                const old = slot.querySelector('.hk-diapo');
                const fresh = this.slide(items[i]);
                slot.appendChild(fresh);
                void slot.offsetWidth;
                fresh.classList.add('hk-visible');
                this.startVideo(fresh);
                const self = this;
                setTimeout(function () {
                    if (old && old.parentNode) {
                        self.stopSlide(old);
                        old.parentNode.removeChild(old);
                    }
                }, 900);
            }
            if (todayKey !== this.todayKey) {
                this.refreshToday(comp, today);
            }
            this.todayKey = todayKey;
            return;
        }
        const old = this.layer;
        const layer = this.makeLayer(comp, items, today);
        this.stage.appendChild(layer);
        layer.hkPaging = turnPages(fitToday(layer.hkToday));
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
                if (self.frame.getAttribute('data-composicion') !== 'foto-completa') {
                    self.clearFull();
                }
            }, PASS_MS + 200);
        }
        this.frame.setAttribute('data-composicion', comp);
        this.comp = comp;
        this.shapes = shapes;
        this.layer = layer;
        this.todayKey = todayKey;
    }

    leave(layer) {
        layer.classList.add('hk-fuera');
        clearInterval(layer.hkPaging);
        const self = this;
        setTimeout(function () {
            self.stopSlides(layer);
            if (layer.parentNode) {
                layer.parentNode.removeChild(layer);
            }
        }, PASS_MS);
    }

    // «Today» changed under the same composition (a notice published, the menu of the afternoon): only it is rebuilt.
    refreshToday(comp, today) {
        const layer = this.layer;
        if (!layer || this.noToday || comp === 'foto-sola') {
            return;
        }
        clearInterval(layer.hkPaging);
        if (layer.hkToday && layer.hkToday.parentNode) {
            layer.hkToday.parentNode.removeChild(layer.hkToday);
        }
        const aside = buildToday(today, this.labelsFull(), comp === 'solo-hoy', this.horizontal,
            this.weather ? this.sky : null);
        if (aside) {
            layer.appendChild(aside);
        }
        layer.hkToday = aside;
        layer.hkPaging = turnPages(fitToday(aside));
    }

    // --- The ticker -------------------------------------------------------------------------------------------------

    showTicker(texts) {
        const text = texts.join('\u0000');
        if (text === this.tickerText) {
            return;
        }
        this.tickerText = text;
        this.frame.classList.toggle('hk-sin-cinta', !texts.length);
        clear(this.tickerTrack);
        texts.forEach((t, i) => {
            if (i > 0) {
                this.tickerTrack.appendChild(el('i'));
            }
            this.tickerTrack.appendChild(document.createTextNode(t));
        });
        // About 140 px a second on a screen of 1080: read without chasing it.
        const short = Math.min(window.innerWidth, window.innerHeight) || 1080;
        const speed = 140 * short / 1080;
        const seconds = Math.max(8, this.tickerTrack.offsetWidth / speed);
        this.tickerTrack.style.webkitAnimationDuration = seconds + 's';
        this.tickerTrack.style.animationDuration = seconds + 's';
    }

    /** What is on the screen now, for the heartbeat. */
    showing() {
        const out = [];
        const scope = this.comp === 'foto-completa' ? this.full : this.layer;
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
