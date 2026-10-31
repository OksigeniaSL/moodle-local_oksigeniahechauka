// Paints the screen with the templates of the art direction (hechauka.css): header, the media zone, the «Today»
// column and the ticker. It builds the markup once and then only changes what changed, so a screen that runs for
// months does not pile up nodes.

import {pageAt} from './rotator.js';

const PAGE_SECONDS = 12;

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
        this.slide = null;
        this.sideKey = '';
        this.tickerText = null;
        this.minute = '';
        this.build();
    }

    build() {
        clear(this.root);
        this.frame = el('div', 'hk');
        const head = el('header', 'hk-cabecera');
        this.logo = el('img', 'hk-logo-claro');
        this.logo.alt = '';
        this.logoDark = el('img', 'hk-logo-oscuro');
        this.logoDark.alt = '';
        this.place = el('p', 'hk-lugar');
        const hour = el('div', 'hk-hora');
        const date = el('p', 'hk-fecha');
        this.day = el('b');
        this.date = el('span');
        date.appendChild(this.day);
        date.appendChild(document.createTextNode(' '));
        date.appendChild(this.date);
        this.clock = el('p', 'hk-reloj');
        hour.appendChild(date);
        hour.appendChild(this.clock);
        head.appendChild(this.logo);
        head.appendChild(this.logoDark);
        head.appendChild(this.place);
        head.appendChild(hour);

        const body = el('main', 'hk-cuerpo');
        this.main = el('section', 'hk-medio');
        this.sample = el('span', 'hk-muestra', this.s.sample || 'Sample data');
        this.side = el('aside', 'hk-hoy');
        body.appendChild(this.main);
        body.appendChild(this.side);

        this.ticker = el('footer', 'hk-cinta');
        this.tickerLabel = el('b');
        const track = el('div', 'hk-cinta-pista');
        this.tickerTrack = el('span', 'hk-cinta-texto');
        track.appendChild(this.tickerTrack);
        this.ticker.appendChild(this.tickerLabel);
        this.ticker.appendChild(track);

        this.frame.appendChild(head);
        this.frame.appendChild(body);
        this.frame.appendChild(this.ticker);
        this.dark = el('div', 'hk-apagada');
        this.root.appendChild(this.frame);
        this.root.appendChild(this.dark);
    }

    /** What does not change with the clock: layout, identity, labels. */
    configure(manifest) {
        const scr = manifest.screen || {};
        // The page knows its own shape better than the manifest: a screen turned on its side, a LED wall.
        const w = window.innerWidth || scr.width || 1920;
        const h = window.innerHeight || scr.height || 1080;
        this.frame.className = 'hk ' + (h > w ? 'hk-vertical' : 'hk-horizontal') +
            (manifest.template === 'full' ? ' hk-completa' : '');
        this.vertical = h > w;
        this.place.textContent = scr.name || '';
        this.place.style.display = scr.name ? '' : 'none';
        this.labels = manifest.labels || {};
        this.tickerLabel.textContent = this.labels.ticker || this.s.ticker || '';
        this.tickerLabel.style.display = this.tickerLabel.textContent ? '' : 'none';
        if (manifest.sample) {
            this.main.appendChild(this.sample);
        } else if (this.sample.parentNode) {
            this.sample.parentNode.removeChild(this.sample);
        }
        this.applyTheme(manifest.theme || {});
        this.sideKey = '';
    }

    applyTheme(theme) {
        const style = document.documentElement.style;
        const vars = theme.vars || {};
        Object.keys(vars).forEach(function (name) {
            if (name.indexOf('--hk-') === 0 && safeValue(vars[name])) {
                style.setProperty(name, vars[name]);
            }
        });
        const light = this.media.url(theme.logo);
        const dark = this.media.url(theme.logo_dark) || light;
        this.logo.style.display = light ? '' : 'none';
        this.frame.classList.toggle('hk-sin-logo', !light);
        if (light && this.logo.src !== light) {
            this.logo.src = light;
        }
        if (dark && this.logoDark.src !== dark) {
            this.logoDark.src = dark;
        }
        if (!dark) {
            this.logoDark.removeAttribute('src');
        }
        this.fonts(theme.fonts || []);
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

    setDark(dark) {
        const want = dark ? 'oscuro' : 'claro';
        if (document.documentElement.getAttribute('data-tema') !== want) {
            document.documentElement.setAttribute('data-tema', want);
        }
    }

    setPower(on) {
        this.dark.style.display = on ? 'none' : 'block';
        const v = this.slide && this.slide.video;
        if (v) {
            if (on && v.paused) {
                v.play().catch(function () {
                    return null;
                });
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
        clear(this.clock);
        this.clock.appendChild(document.createTextNode(two(d.getHours())));
        this.clock.appendChild(el('span', '', ':'));
        this.clock.appendChild(document.createTextNode(two(d.getMinutes())));
        const days = this.s.days;
        const months = this.s.months;
        if (days && days.length === 7 && months && months.length === 12) {
            this.day.textContent = days[d.getDay()];
            this.date.textContent = (this.s.date_format || '{d} {m}')
                .replace('{d}', d.getDate()).replace('{m}', months[d.getMonth()]);
        } else {
            const lang = document.documentElement.lang || 'en';
            const name = d.toLocaleDateString(lang, {weekday: 'long'});
            this.day.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            this.date.textContent = d.toLocaleDateString(lang, {day: 'numeric', month: 'long'});
        }
    }

    // --- The media zone ---------------------------------------------------------------------------------------------

    /** Shows an item in the media zone, cross-fading from the one before. */
    showMain(item) {
        if (!item) {
            this.dropSlide(this.slide);
            this.slide = null;
            this.main.classList.add('hk-medio-vacio');
            return;
        }
        this.main.classList.remove('hk-medio-vacio');
        if (this.slide && this.slide.item.id === item.id && this.slide.video) {
            // The same video again (it is alone in the zone): start over without a fade.
            this.slide.video.currentTime = 0;
            this.slide.video.play().catch(function () {
                return null;
            });
            return;
        }
        const old = this.slide;
        const slide = this.makeSlide(item);
        this.slide = slide;
        const self = this;
        let shown = false;
        function reveal() {
            if (shown || self.slide !== slide) {
                return;
            }
            shown = true;
            slide.node.classList.add('hk-visible');
            setTimeout(function () {
                self.dropSlide(old);
            }, 900);
        }
        if (slide.video) {
            slide.video.addEventListener('playing', reveal);
            slide.video.addEventListener('ended', function () {
                if (self.slide === slide) {
                    self.hooks.videoEnded(item);
                }
            });
            slide.video.addEventListener('error', function () {
                if (self.slide === slide) {
                    self.hooks.mediaFailed(item);
                }
            });
            slide.video.play().catch(function () {
                return null;
            });
        } else if (slide.img) {
            if (slide.img.complete && slide.img.naturalWidth) {
                reveal();
            } else {
                slide.img.onload = reveal;
                slide.img.onerror = function () {
                    if (self.slide === slide) {
                        self.hooks.mediaFailed(item);
                    }
                };
            }
        } else {
            reveal();
        }
        // Whatever happens, never stay on a black zone.
        setTimeout(reveal, 3000);
        if (this.sample.parentNode === this.main) {
            this.main.appendChild(this.sample);
        }
    }

    makeSlide(item) {
        const node = el('div', 'hk-diapo');
        const fit = item.fit || 'cover';
        const src = this.media.url(item.media);
        const slide = {item, node, img: null, video: null};
        if (fit === 'blur' || fit === 'contain') {
            const back = el('div', 'hk-diapo-fondo');
            let bg = null;
            if (item.type === 'video') {
                bg = this.media.url(item.backdrop);
                if (!bg) {
                    bg = this.media.url(item.poster);
                    back.classList.add('hk-difuminar');
                }
            } else {
                bg = src;
                back.classList.add('hk-difuminar');
            }
            if (fit === 'blur' && bg) {
                back.style.backgroundImage = 'url("' + bg + '")';
            }
            node.appendChild(back);
        }
        if (item.type === 'video') {
            const v = el('video');
            v.muted = true;
            v.setAttribute('muted', '');
            v.setAttribute('playsinline', '');
            v.autoplay = true;
            v.preload = 'auto';
            const poster = this.media.url(item.poster);
            if (poster) {
                v.poster = poster;
            }
            v.src = src;
            v.style.objectFit = fit === 'cover' ? 'cover' : 'contain';
            slide.video = v;
            node.appendChild(v);
        } else if (item.type === 'image') {
            const img = el('img');
            img.alt = '';
            img.src = src;
            img.style.objectFit = fit === 'cover' ? 'cover' : 'contain';
            if (fit === 'cover' && item.focus && item.focus.length === 2) {
                img.style.objectPosition = Math.round(item.focus[0] * 100) + '% ' + Math.round(item.focus[1] * 100) + '%';
            }
            slide.img = img;
            node.appendChild(img);
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
            node.appendChild(pie);
        }
        this.main.appendChild(node);
        return slide;
    }

    dropSlide(slide) {
        if (!slide) {
            return;
        }
        if (slide.video) {
            slide.video.pause();
            slide.video.removeAttribute('src');
            slide.video.load();
        }
        if (slide.node.parentNode) {
            slide.node.parentNode.removeChild(slide.node);
        }
    }

    // --- The «Today» column -----------------------------------------------------------------------------------------

    /**
     * @param {object[]} menus live menu items
     * @param {object[]} notices live notices
     * @param {object[]} events live events
     * @param {number} now milliseconds, to turn pages
     */
    showSide(menus, notices, events, now) {
        const perEvents = this.vertical ? 3 : 2;
        // Every menu of the day is a page of its own (Meals may offer several, and a closed day is one page).
        const menuPages = [];
        menus.forEach(function (item) {
            if (item.closed || !item.menus || !item.menus.length) {
                menuPages.push({item, menu: null, many: false});
            } else {
                item.menus.forEach(function (menu) {
                    menuPages.push({item, menu, many: item.menus.length > 1});
                });
            }
        });
        const menuPage = pageAt(menuPages.length, 1, now, PAGE_SECONDS);
        const evenEvents = Math.ceil(events.length / Math.ceil(events.length / perEvents)) || perEvents;
        const eventPage = pageAt(events.length, evenEvents, now, PAGE_SECONDS);
        const key = JSON.stringify([menus, notices, events]) + '|' + menuPage + '|' + eventPage + '|' +
            Math.floor(now / 1000 / PAGE_SECONDS);
        if (key === this.sideKey) {
            return;
        }
        const blocks = [];
        if (menuPages.length) {
            blocks.push(this.menuBlock(menuPages[menuPage]));
        }
        const eventBlock = events.length ?
            this.eventBlock(events.slice(eventPage * evenEvents, eventPage * evenEvents + evenEvents)) : null;
        const noticeBlock = notices.length ? this.noticeBlock() : null;
        if (this.vertical) {
            if (eventBlock) {
                blocks.push(eventBlock);
            }
            if (noticeBlock) {
                blocks.push(noticeBlock);
            }
        } else {
            if (noticeBlock) {
                blocks.push(noticeBlock);
            }
            if (eventBlock) {
                blocks.push(eventBlock);
            }
        }
        clear(this.side);
        blocks.forEach((b) => this.side.appendChild(b));
        this.frame.classList.toggle('hk-sin-hoy', !blocks.length);
        if (noticeBlock) {
            this.fillNotices(noticeBlock, notices, now);
        }
        this.sideKey = key;
    }

    block(cls, label, color) {
        const b = el('section', 'hk-bloque' + (cls ? ' ' + cls : ''));
        b.style.setProperty('--hk-color', 'var(--hk-' + color + ')');
        b.style.setProperty('--hk-color-oscuro', 'var(--hk-' + (color === 'acento-texto' ? 'acento' : color + '-oscuro') + ')');
        b.appendChild(el('h3', 'hk-etiqueta', label));
        return b;
    }

    menuBlock(page) {
        const item = page.item;
        const menu = page.menu;
        const label = item.label || this.labels.menu || this.s.menu || '';
        const b = this.block('', page.many && menu.name ? label + ' · ' + menu.name : label, 'marca-2');
        if (!menu) {
            b.appendChild(el('p', 'hk-nota', item.title || this.s.closed || ''));
            return b;
        }
        (menu.courses || []).forEach(function (c) {
            const p = el('p', 'hk-plato');
            p.appendChild(el('small', '', c.label || ''));
            p.appendChild(el('span', '', (c.dishes || []).join(', ')));
            b.appendChild(p);
        });
        if (item.note) {
            b.appendChild(el('p', 'hk-nota', item.note));
        }
        return b;
    }

    eventBlock(list) {
        const b = this.block('', this.labels.events || this.s.events || '', 'marca-3');
        list.forEach(function (ev) {
            const p = el('p', 'hk-evento');
            const n = ev.color >= 1 && ev.color <= 4 ? ev.color : 1;
            p.style.setProperty('--hk-ev', 'var(--hk-marca-' + n + ')');
            p.style.setProperty('--hk-sobre-ev', 'var(--hk-sobre-marca-' + n + ')');
            const t = el('time', '', ev.allday || !ev.start ? '·' : ev.start.slice(11, 16));
            const span = el('span', '', ev.title || '');
            if (ev.detail) {
                span.appendChild(el('small', '', ev.detail));
            }
            p.appendChild(t);
            p.appendChild(span);
            b.appendChild(p);
        });
        return b;
    }

    noticeBlock() {
        return this.block('hk-bloque-crece', this.labels.notices || this.s.notices || '', 'acento-texto');
    }

    // The notices that fit, a page at a time: they are measured once they are in the page.
    fillNotices(block, notices, now) {
        const make = function (n) {
            const d = el('div', 'hk-aviso' + (n.tone === 'important' ? ' hk-aviso-importante' : ''));
            d.appendChild(el('h3', '', n.title || ''));
            if (n.body) {
                d.appendChild(el('p', '', n.body));
            }
            return d;
        };
        const fit = this.noticesThatFit(block, notices.map(make));
        // Even pages: four notices where three fit go as two and two, never three and a lonely one.
        const per = Math.ceil(notices.length / Math.ceil(notices.length / fit));
        const page = pageAt(notices.length, per, now, PAGE_SECONDS);
        const nodes = notices.slice(page * per, page * per + per).map(make);
        while (block.childNodes.length > 1) {
            block.removeChild(block.lastChild);
        }
        nodes.forEach(function (n) {
            block.appendChild(n);
        });
    }

    noticesThatFit(block, nodes) {
        const limit = block.clientHeight;
        let count = 0;
        for (let i = 0; i < nodes.length; i++) {
            block.appendChild(nodes[i]);
            if (nodes[i].offsetTop + nodes[i].offsetHeight > limit && count > 0) {
                break;
            }
            count++;
        }
        return Math.max(1, count);
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
        if (this.slide) {
            out.push({zone: 'main', item: this.slide.item.id});
        }
        return out;
    }
}
