// «Síguenos en el canal», a slide of its own: the centre's messaging channel (Telegram today, another app tomorrow), so that
// whoever passes follows it from the screen. A poster in the centre's main colour: its words on one side, and on the other the
// channel's last message, a white card with the QR and the short address; a paper plane crosses slowly where nothing is read,
// leaving a trail of dots. No logo of any app: the app is named only in the words. Gaudí, 8 November 2026.
//
// The player builds it in makeLayer (buildChannel), fits it in adjustLayer (fitChannel) and gives it its life in startMoving
// (startChannel; leave() stops it through c.hkStop). Its entrance is movimiento.js's (PARTS.canal, and the way «mensaje»).
//
// Chromium 56: element.animate (Web Animations, Chrome 36) for the plane and its dots, transforms and opacity only, flexbox
// without gap. Without element.animate, or on a screen that keeps still, the plane rests on its way with its dots behind it.

import {even} from './balance.js';
import {fitWord, linesOf} from './lead.js';
import {onWhite} from './qr.js';

/** The plane's flight, in seconds: it waits for the entrance to end, crosses, and comes back while the slide stays. */
export const FLIGHT = {wait: 2.2, cross: 11, every: 20};

/** The space between two dots of the trail, in plane lengths, and how long a dot stays once the plane's tail has passed it. */
const DOT_EVERY = 0.42;
const DOT_STAYS = 2.6;

/** The least side of the QR, in rem: under it the card loses the channel's name first; the QR never goes smaller. */
const QR_LEAST = 32;

// The paper plane in three quarters: the far wing behind, a little in shadow; the keel under it, in its shadow; and the near wing
// in front, whole, with the crease of its fold. White in canal.css, so it belongs to any skin. The nose points right, at (100, 30).
const PLANE = '<svg viewBox="0 0 100 62" aria-hidden="true">' +
    '<path class="hk-canal-ala-lejos" d="M100 30 L16 0 L36 29 Z"/>' +
    '<path class="hk-canal-quilla" d="M100 30 L36 30 L26 60 Z"/>' +
    '<path class="hk-canal-ala" d="M100 30 L0 15 L36 30 L41 40 Z"/>' +
    '</svg>';

function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) {
        n.className = cls;
    }
    if (text !== undefined && text !== null) {
        n.textContent = text;
    }
    return n;
}

function rem() {
    return parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 10;
}

/**
 * A word of one or two letters goes with the next one (a no-break space after it), so that no line ends in «y», «en» or «tu»:
 * the Spanish typesetters' rule, and the same in other languages («on», «of», «a»). Pure.
 *
 * @param {string} text
 * @returns {string}
 */
export function bindShort(text) {
    let out = String(text || '');
    let was = null;
    while (was !== out) {
        was = out;
        out = out.replace(/(^|[\s\u00a0])([^\s\u00a0]{1,2}) (?=\S)/g, '$1$2\u00a0');
    }
    return out;
}

/**
 * How many follow the channel, as the screen says it: «312 personas ya lo siguen», with its singular, the number grouped as the
 * screen's language writes it. Nothing when the item does not say it (null, missing) or says none. Pure but for the grouping.
 *
 * @param {number|null|undefined} members
 * @param {object} s the screen's words: channel_members ({n}) and channel_members_one ({n})
 * @returns {string}
 */
export function membersWords(members, s) {
    const n = typeof members === 'number' ? Math.floor(members) : NaN;
    const w = s || {};
    const say = n === 1 ? w.channel_members_one : w.channel_members;
    if (!(n >= 1) || !say) {
        return '';
    }
    let figure = String(n);
    try {
        figure = n.toLocaleString(document.documentElement.lang || undefined);
    } catch (e) {
        // A language the browser does not know: the plain number.
    }
    return String(say).replace('{n}', figure);
}

/**
 * What the slide says, from the item (its title and its text come in the centre's language) and the screen's words (how many
 * follow it): the headline, its line, the channel's name and its followers. The network is only in the words; never its logo.
 *
 * @param {object} item {title, text, name, members}
 * @param {object} s the screen's words: channel_members, channel_members_one
 * @returns {{title: string, line: string, name: string, members: string}}
 */
export function channelWords(item, s) {
    const it = item || {};
    return {
        title: bindShort(String(it.title || '').trim()),
        line: bindShort(String(it.text || '').trim()),
        name: String(it.name || '').trim(),
        members: bindShort(membersWords(it.members, s)),
    };
}

/** Whether the slide can come: it needs its headline and the channel's address, which its QR says. */
export function channelShow(item) {
    return !!(item && typeof item.web === 'string' && /^https?:\/\/\S+$/i.test(item.web) && String(item.title || '').trim());
}

/**
 * Fills the layer with the channel's slide.
 *
 * @param {HTMLElement} c the layer
 * @param {object} item the manifest's: {id, type: 'channel', zone: 'extra', network, title, text, name, members, web, webqr}
 * @param {object} o {s: the screen's words, qr: function (url, image): node (render.js's qrBox: webqr if it came, else qrSvg)}
 */
export function buildChannel(c, item, o) {
    if (!channelShow(item)) {
        return;
    }
    const words = channelWords(item, o.s);
    const s = el('section', 'hk-canal');
    // The sky: where the plane flies, placed by fitChannel where nothing is read.
    const sky = el('div', 'hk-canal-cielo');
    sky.appendChild(el('div', 'hk-canal-estela'));
    const plane = el('div', 'hk-canal-avion');
    plane.innerHTML = PLANE;
    sky.appendChild(plane);
    s.appendChild(sky);
    const text = el('div', 'hk-canal-texto');
    text.appendChild(el('h2', 'hk-canal-titular', words.title));
    if (words.line) {
        text.appendChild(el('p', 'hk-canal-linea', words.line));
    }
    if (words.members) {
        text.appendChild(el('p', 'hk-canal-seguidores', words.members));
    }
    s.appendChild(text);
    // The channel's last message: who writes it, and the code. A message that arrives, so its tail is on the left.
    const side = el('div', 'hk-canal-lado');
    const card = el('div', 'hk-canal-tarjeta');
    if (words.name) {
        card.appendChild(el('p', 'hk-canal-nombre', words.name));
    }
    const qr = o.qr(item.web, item.webqr);
    if (qr && qr.nodeType === 1) {
        // A picture from the shortener brings its own white margin: the card gives it less of its own.
        if (qr.querySelector('img')) {
            qr.classList.add('hk-qr-imagen');
        }
        card.appendChild(qr);
    }
    side.appendChild(card);
    s.appendChild(side);
    c.appendChild(s);
}

// A line of the card in one line if it can: its letter a step smaller each time, down to «least» (a share of its own), and
// evened in as many lines as «lines» allows if even then it does not fit. Whether it fits.
function fitCardLine(n, least, lines) {
    if (!n) {
        return true;
    }
    n.style.fontSize = '';
    const size = parseFloat(window.getComputedStyle(n).fontSize);
    for (let k = 0; k <= 5; k++) {
        n.style.fontSize = k ? Math.round(size * (1 - (1 - least) * k / 5) * 10) / 10 + 'px' : '';
        if (linesOf(n) <= 1) {
            return true;
        }
    }
    even(n);
    return linesOf(n) <= lines;
}

// The card's lines at the QR's side: the name (up to three lines, or it goes) and the address (one line if it can).
function fitCardLines(s) {
    const card = s.querySelector('.hk-canal-tarjeta');
    s.classList.remove('hk-canal-sin-nombre');
    if (!fitCardLine(card.querySelector('.hk-canal-nombre'), 0.84, 3)) {
        s.classList.add('hk-canal-sin-nombre');
    }
    fitCardLine(card.querySelector('.hk-qr-web'), 0.78, 2);
}

// How much the card is over its column, in px (0 or less: it fits).
function cardOver(s) {
    const side = s.querySelector('.hk-canal-lado');
    const card = s.querySelector('.hk-canal-tarjeta');
    const pads = window.getComputedStyle(side);
    return card.offsetHeight - (side.clientHeight - parseFloat(pads.paddingTop) - parseFloat(pads.paddingBottom));
}

/**
 * Once in the page: the words and the card share the block. The QR keeps the sheet's side while the words can give way (how many
 * follow it, then the line, then the headline by steps); only then it gets smaller, never under QR_LEAST, and the channel's name goes
 * before it would. Then the sky is measured where nothing is read.
 *
 * @param {HTMLElement} c the layer
 * @param {boolean} horizontal
 */
export function fitChannel(c, horizontal) {
    const s = c.querySelector('.hk-canal');
    if (!s) {
        return;
    }
    const text = s.querySelector('.hk-canal-texto');
    const title = s.querySelector('.hk-canal-titular');
    const line = s.querySelector('.hk-canal-linea');
    const qrBox = s.querySelector('.hk-qr');
    const most = horizontal ? 3 : 4;
    // The name over the QR in the centre's colour, as deep as the white card needs (a dark theme's light colour too).
    s.style.setProperty('--hk-canal-tinta', onWhite(window.getComputedStyle(s).backgroundColor, 4.5, '#16191d'));
    s.style.removeProperty('--hk-canal-qr');
    title.style.fontSize = '';
    const wanted = qrBox ? qrBox.offsetWidth : 0;
    const least = Math.min(wanted, QR_LEAST * rem());
    // The QR as big as its column lets it, down to «floor»: narrower, the name and the address may take another line, so it is
    // measured again each time. Whether the card fits so. What the column leaves depends only on its height: kept by it.
    const sized = {};
    const sizeCard = function (floor) {
        const side = s.querySelector('.hk-canal-lado').clientHeight;
        const key = side + '/' + Math.round(floor);
        if (sized[key] !== undefined && sized[key] === false) {
            return false;
        }
        s.style.removeProperty('--hk-canal-qr');
        fitCardLines(s);
        let at = wanted;
        for (let k = 0; k < 6 && cardOver(s) > 0; k++) {
            at = Math.floor(at - cardOver(s));
            if (at < floor) {
                sized[key] = false;
                return false;
            }
            s.style.setProperty('--hk-canal-qr', at + 'px');
            fitCardLines(s);
        }
        sized[key] = cardOver(s) <= 0;
        return sized[key];
    };
    // The words stand at their column's foot: what does not fit sticks out at the top, where scrollHeight does not see it.
    const wordsFit = function () {
        const box = text.getBoundingClientRect();
        const e = shownEdges(text, '.hk-canal-texto > *');
        return linesOf(title) <= most && title.scrollWidth <= title.clientWidth + 1 &&
            (e.top === null || (e.top >= box.top - 1 && e.bottom <= box.bottom + 1));
    };
    const states = [[], ['hk-canal-sin-seguidores'], ['hk-canal-sin-seguidores', 'hk-canal-sin-linea']];
    const put = function (n, step) {
        s.classList.remove('hk-canal-sin-seguidores', 'hk-canal-sin-linea');
        states[n].forEach(function (cls) {
            s.classList.add(cls);
        });
        s.setAttribute('data-ajuste', String(step));
        even(title);
        if (line) {
            even(line);
        }
    };
    // The QR at least four fifths of the sheet's, first with the headline at its first two steps, then at any; only then the QR
    // down to its least. The words give way before the QR gets small, not before it gives up a little.
    const fair = Math.max(least, wanted * 0.8);
    const passes = [[1, fair], [3, fair], [3, least]];
    let done = false;
    for (let p = 0; p < passes.length && !done; p++) {
        for (let n = 0; n < states.length && !done; n++) {
            for (let step = 0; step <= passes[p][0] && !done; step++) {
                put(n, step);
                done = wordsFit() && sizeCard(passes[p][1]);
            }
        }
    }
    if (!done) {
        // A very long headline (another language, the centre's own words): smaller than the least rather than cut.
        const size = parseFloat(window.getComputedStyle(title).fontSize);
        for (let k = 1; k <= 8 && !wordsFit(); k++) {
            title.style.fontSize = Math.round(size * (1 - k * 0.05)) + 'px';
            even(title);
        }
        fitWord(title);
    }
    // Nothing fitted: the QR at its least, and without the name if even so the card does not fit.
    if (!done && !sizeCard(least)) {
        s.style.setProperty('--hk-canal-qr', Math.floor(least) + 'px');
        fitCardLines(s);
        s.classList.add('hk-canal-sin-nombre');
    }
    s.hkQr = qrBox ? qrBox.offsetWidth : 0;
    placeSky(s, horizontal);
    // Measured again after its life had started (the letters arrived): the plane flies the new sky.
    if (c.hkChannelRestart) {
        c.hkChannelRestart();
    }
}

// The top of the first and the bottom of the last of what is shown in a box (what the fitting hid does not count).
function shownEdges(box, selector) {
    const list = box.querySelectorAll(selector);
    let top = null;
    let bottom = null;
    for (let i = 0; i < list.length; i++) {
        if (list[i].offsetHeight > 0) {
            const r = list[i].getBoundingClientRect();
            top = top === null ? r.top : Math.min(top, r.top);
            bottom = bottom === null ? r.bottom : Math.max(bottom, r.bottom);
        }
    }
    return {top, bottom};
}

// The sky is the part of the block where nothing is read: on a wide screen, the corner above the words and left of the card (the
// plane comes in by the left edge and leaves by the top one); on a tall one, the band between the words and the card, edge to
// edge (it comes in by the left and leaves by the right). Too small a sky has no plane.
function placeSky(s, horizontal) {
    const sky = s.querySelector('.hk-canal-cielo');
    const plane = sky.querySelector('.hk-canal-avion');
    s.classList.remove('hk-canal-sin-cielo');
    const box = s.getBoundingClientRect();
    const words = shownEdges(s.querySelector('.hk-canal-texto'), '.hk-canal-texto > *');
    const card = s.querySelector('.hk-canal-tarjeta').getBoundingClientRect();
    const air = 3 * rem();
    let r;
    if (horizontal) {
        r = {top: 0, width: card.left - box.left - air * 1.4, height: (words.top || box.bottom) - box.top - air, exit: 'top'};
    } else {
        const from = (words.bottom || box.top) - box.top + air * 0.6;
        r = {top: from, width: box.width, height: card.top - box.top - from - air, exit: 'right'};
    }
    sky.style.top = Math.round(r.top) + 'px';
    sky.style.width = Math.max(0, Math.round(r.width)) + 'px';
    sky.style.height = Math.max(0, Math.round(r.height)) + 'px';
    const pw = plane.offsetWidth;
    const ph = plane.offsetHeight;
    const room = pw > 0 && r.width > pw * 4 && r.height > ph * 1.5;
    s.classList.toggle('hk-canal-sin-cielo', !room);
    s.hkSky = room ? {w: Math.round(r.width), h: Math.round(r.height), pw, ph, exit: r.exit} : null;
}

/**
 * The plane's path through its sky, as points at equal distances along it, each with the angle of its nose: a cubic curve that
 * comes in by the left edge, dips a little and climbs out by the top (wide) or crosses to the right edge in a soft wave (tall).
 * Pure: the sky is given.
 *
 * @param {object} sky {w, h, pw, ph, exit: 'top' or 'right'}
 * @param {number} n how many points
 * @returns {Array<{x: number, y: number, a: number, s: number}>} the plane's centre, its nose in degrees, its share of the way
 */
export function flightPath(sky, n) {
    const w = sky.w;
    const h = sky.h;
    const pw = sky.pw;
    const ph = sky.ph;
    // The whole plane in its sky while it is in sight: its centre at least about half its size from the long edges.
    const low = h - ph * 0.75;
    const high = ph * 0.75;
    const p = sky.exit === 'top' ? [
        [-pw * 0.7, low - (low - high) * 0.25],
        [w * 0.38, low],
        [w * 0.62, high + (low - high) * 0.35],
        [w * 0.86, -ph * 1.2],
    ] : [
        [-pw * 0.7, high + (low - high) * 0.62],
        [w * 0.34, high],
        [w * 0.62, low],
        [w + pw * 0.7, high + (low - high) * 0.3],
    ];
    const at = function (t) {
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const c = 3 * u * t * t;
        const d = t * t * t;
        return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
    };
    // Measured finely, then cut in equal lengths: the plane flies at one speed.
    const fine = [];
    const steps = 240;
    let total = 0;
    let prev = at(0);
    fine.push({t: 0, x: prev[0], y: prev[1], len: 0});
    for (let k = 1; k <= steps; k++) {
        const q = at(k / steps);
        total += Math.sqrt((q[0] - prev[0]) * (q[0] - prev[0]) + (q[1] - prev[1]) * (q[1] - prev[1]));
        fine.push({t: k / steps, x: q[0], y: q[1], len: total});
        prev = q;
    }
    const out = [];
    let j = 0;
    for (let i = 0; i < n; i++) {
        const want = total * i / (n - 1);
        while (j < steps - 1 && fine[j + 1].len < want) {
            j++;
        }
        const f0 = fine[j];
        const f1 = fine[j + 1];
        const k = Math.max(0, Math.min(1, (want - f0.len) / ((f1.len - f0.len) || 1)));
        // The nose follows the way, a little less steep than it: a plane that glides, not one that turns.
        const a0 = at(Math.max(0, f0.t - 0.02));
        const a1 = at(Math.min(1, f1.t + 0.02));
        const angle = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) * 180 / Math.PI * 0.8;
        out.push({x: f0.x + (f1.x - f0.x) * k, y: f0.y + (f1.y - f0.y) * k, a: Math.round(angle * 10) / 10, s: want / total});
    }
    return out;
}

/**
 * The trail: where a dot is left (every DOT_EVERY plane lengths, inside the sky, not by its edges) and at what share of the way.
 * Pure.
 *
 * @param {Array} path from flightPath
 * @param {object} sky {w, h, pw, ph}
 * @returns {Array<{x: number, y: number, s: number}>}
 */
export function trailOf(path, sky) {
    const dots = [];
    const gap = sky.pw * DOT_EVERY;
    let next = gap;
    let walked = 0;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1];
        const b = path[i];
        const len = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
        while (next <= walked + len) {
            const k = len ? (next - walked) / len : 0;
            const x = a.x + (b.x - a.x) * k;
            const y = a.y + (b.y - a.y) * k;
            if (x > sky.pw * 0.3 && y > sky.ph * 0.3 && x < sky.w - sky.pw * 0.3 && y < sky.h - sky.ph * 0.3) {
                dots.push({x: Math.round(x), y: Math.round(y), s: a.s + (b.s - a.s) * k});
            }
            next += gap;
        }
        walked += len;
    }
    return dots;
}

function moveTo(n, x, y, a) {
    const t = 'translate3d(' + Math.round(x * 10) / 10 + 'px,' + Math.round(y * 10) / 10 + 'px,0)' + (a ? ' rotate(' + a + 'deg)' : '');
    n.style.webkitTransform = t;
    n.style.transform = t;
    return t;
}

/**
 * The slide's life: the plane crosses its sky slowly once the entrance is over, leaving dots that fade behind it, and comes back
 * every FLIGHT.every seconds while the slide stays. On a still screen, or without Web Animations, the plane rests at two thirds
 * of its way with the dots it has left.
 *
 * @param {HTMLElement} c the layer, in the page and fitted
 * @param {object} o {still}
 * @returns {function} what stops it
 */
export function startChannel(c, o) {
    stopChannel(c);
    const s = c.querySelector('.hk-canal');
    const sky = s && s.hkSky;
    c.hkChannelRestart = function () {
        startChannel(c, o);
    };
    if (!sky) {
        return function () {
            stopChannel(c);
        };
    }
    const plane = s.querySelector('.hk-canal-avion');
    const trail = s.querySelector('.hk-canal-estela');
    while (trail.firstChild) {
        trail.removeChild(trail.firstChild);
    }
    const path = flightPath(sky, 48);
    const dots = trailOf(path, sky);
    const nodes = dots.map(function (d) {
        const i = el('i');
        moveTo(i, d.x, d.y, 0);
        trail.appendChild(i);
        return i;
    });
    const hw = sky.pw / 2;
    const hh = sky.ph / 2;
    if ((o && o.still) || !plane.animate) {
        const k = Math.round((path.length - 1) * 0.66);
        moveTo(plane, path[k].x - hw, path[k].y - hh, path[k].a);
        nodes.forEach(function (n, i) {
            n.style.opacity = dots[i].s < path[k].s - 0.05 ? '1' : '0';
        });
        s.classList.add('hk-canal-quieto');
        return function () {
            stopChannel(c);
        };
    }
    const every = FLIGHT.every;
    const share = FLIGHT.cross / every;
    const frames = path.map(function (p) {
        const t = 'translate3d(' + Math.round((p.x - hw) * 10) / 10 + 'px,' + Math.round((p.y - hh) * 10) / 10 + 'px,0) rotate(' + p.a +
            'deg)';
        return {offset: Math.round(p.s * share * 10000) / 10000, transform: t};
    });
    // Out of its sky until it comes back.
    frames.push({offset: 1, transform: frames[frames.length - 1].transform});
    const timing = {duration: every * 1000, delay: FLIGHT.wait * 1000, iterations: Infinity, easing: 'linear', fill: 'both'};
    const running = [plane.animate(frames, timing)];
    // Each dot shows as the plane's tail passes it, and fades a little after.
    let length = 0;
    for (let i = 1; i < path.length; i++) {
        length += Math.sqrt((path[i].x - path[i - 1].x) * (path[i].x - path[i - 1].x) + (path[i].y - path[i - 1].y) * (path[i].y - path[i - 1].y));
    }
    const tail = length > 0 ? sky.pw * 0.55 / length : 0;
    nodes.forEach(function (n, i) {
        const on = Math.min(0.97, (dots[i].s + tail) * share);
        const full = on + 0.3 / every;
        const off = full + DOT_STAYS / every;
        const gone = Math.min(0.999, off + 1.6 / every);
        running.push(n.animate([
            {offset: 0, opacity: 0},
            {offset: on, opacity: 0},
            {offset: full, opacity: 1},
            {offset: Math.min(off, gone - 0.001), opacity: 1},
            {offset: gone, opacity: 0},
            {offset: 1, opacity: 0},
        ], timing));
    });
    c.hkChannelRun = running;
    return function () {
        stopChannel(c);
    };
}

/** Stops the slide's life: render.js's leave() calls it through c.hkStop. */
export function stopChannel(c) {
    if (c && c.hkChannelRun) {
        c.hkChannelRun.forEach(function (a) {
            a.cancel();
        });
        c.hkChannelRun = null;
    }
}
