// «Síguenos en el canal», a slide of its own: the centre's messaging channel (Telegram today, another app tomorrow), so that
// whoever passes follows it from the screen. A poster in the centre's main colour: its words on one side, and on the other the
// channel's last message, a white card with the QR and the short address; a paper plane crosses slowly where nothing is read,
// leaving a trail of dots. No logo of any app: the app is named only in the words.
//
// Every network of the centre since «Nuestras redes» (14 November 2026): Instagram, TikTok, YouTube… one a turn in the
// same place (compose.js). With several, the card's sender line carries the network's glyph in the card's ink before the account
// (redes.js): from metres away, which app the QR opens, and that this turn is another network than the last one. The headline
// still says it in words; the poster, the plane and the QR stay as the art direction drew them.
//
// Each network its own object and its own world (22 November 2026: of three ways, the art direction's way A, with way B's world
// behind it; canal-redes.js). The card is no longer a message on a poster of the main colour: on the skin's surface, the
// network's object holds the QR (a polaroid for Instagram, a phone for TikTok, a television for YouTube, a chat bubble for
// WhatsApp, a sheet that unfolds for Telegram, whose paper plane still crosses its sky, a browser's window for the web…), comes
// in with its gesture and keeps still to be read; behind it, softly, the network's world goes on, in the skin's colours. The
// words stay on a clean patch of the surface (the veil), so that nothing of the world crosses them.
//
// The player builds it in makeLayer (buildChannel), fits it in adjustLayer (fitChannel) and gives it its life in startMoving
// (startChannel; leave() stops it through c.hkStop). Its entrance is movimiento.js's (PARTS.canal): the card fades in, and its
// object's gesture is the movement.
//
// Chromium 56: element.animate (Web Animations, Chrome 36) for the gestures, the worlds, the plane and its dots, transforms and
// opacity only, flexbox without gap. Without element.animate, or on a screen that keeps still, every object is at rest, its
// world still, and the plane rests on its way with its dots behind it.

import {even} from './balance.js';
import {fitWord, linesOf} from './lead.js';
import {onWhite} from './qr.js';
import {glyphSvg, knownNetwork, NETWORK_NAMES} from './redes.js';
import {cloudSvg, dressObject, drawWorld, ENTRANCE_AT, gestureOf, LEVELS, lifeOf, objectOf, WORLDS} from './canal-redes.js';

/** The plane's flight, in seconds: it waits for the entrance to end, crosses, and comes back while the slide stays. */
export const FLIGHT = {wait: 2.2, cross: 11, every: 20};

/** The space between two dots of the trail, in plane lengths, and how long a dot stays once the plane's tail has passed it. */
const DOT_EVERY = 0.42;
const DOT_STAYS = 2.6;

/** The least side of the QR, in rem: under it the card loses the channel's name first; the QR never goes smaller. */
const QR_LEAST = 32;

// The paper plane in three quarters: the far wing behind, a little in shadow; the keel under it, in its shadow; and the near wing
// in front, whole, with the crease of its fold. Of the sheet's own paper (canal.css). It leaves the sheet's turned-down corner
// and flies away from the card, so its nose points left, at (0, 30).
const PLANE = '<svg viewBox="0 0 100 62" aria-hidden="true"><g transform="matrix(-1 0 0 1 100 0)">' +
    '<path class="hk-canal-ala-lejos" d="M100 30 L16 0 L36 29 Z"/>' +
    '<path class="hk-canal-quilla" d="M100 30 L36 30 L26 60 Z"/>' +
    '<path class="hk-canal-ala" d="M100 30 L0 15 L36 30 L41 40 Z"/>' +
    '</g></svg>';

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

/**
 * A site's name as people say it: its host without «www.». Pure.
 *
 * @param {string} url
 * @returns {string}
 */
export function siteOf(url) {
    const m = /^https?:\/\/([^/?#:]+)/i.exec(String(url || ''));
    return m ? m[1].replace(/^www\./i, '').toLowerCase() : '';
}

/**
 * The address the code says. With the shortener's own, that one; without it, a network's address loses the screens' tag
 * («utm_source=pantallas»): only the centre's web reads it, and it makes the code denser, so harder to read from afar. Pure.
 *
 * @param {object} item {network, web, webqr}
 * @returns {string}
 */
export function qrAddress(item) {
    const url = String(item.web || '');
    if (item.webqr || item.network === 'web') {
        return url;
    }
    return url.replace(/([?&])utm_source=pantallas(&|#|$)/, (m, before, after) => (after === '&' ? before : after));
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
    const object = objectOf(item.network);
    s.setAttribute('data-objeto', object);
    // The network's world, behind everything (drawn by fitChannel once the block is measured), and the clean patch the words
    // stand on.
    s.appendChild(el('div', 'hk-canal-mundo'));
    s.appendChild(el('div', 'hk-canal-velo'));
    if (object === 'hoja') {
        // Telegram's sky: where the plane flies, placed by fitChannel where nothing is read.
        const sky = el('div', 'hk-canal-cielo');
        sky.appendChild(el('div', 'hk-canal-estela'));
        const plane = el('div', 'hk-canal-avion');
        plane.innerHTML = PLANE;
        sky.appendChild(plane);
        s.appendChild(sky);
    }
    const text = el('div', 'hk-canal-texto');
    text.appendChild(el('h2', 'hk-canal-titular', words.title));
    if (words.line) {
        text.appendChild(el('p', 'hk-canal-linea', words.line));
    }
    if (words.members) {
        text.appendChild(el('p', 'hk-canal-seguidores', words.members));
    }
    s.appendChild(text);
    // The network's object: who writes, and the code, on its white card (a message that arrives, for a chat).
    const side = el('div', 'hk-canal-lado');
    const holder = el('div', 'hk-canal-objeto');
    const card = el('div', 'hk-canal-tarjeta');
    // Who writes, as over a message: the network's glyph and the account («@centro.ejemplo»), the centre's own site by its
    // name («centro.example»), or the network's name alone.
    const sender = words.name || (item.network === 'web' ? siteOf(item.web) : knownNetwork(item.network) ? NETWORK_NAMES[item.network] : '');
    if (sender) {
        const name = el('p', 'hk-canal-nombre');
        if (item.network) {
            const glyph = el('span', 'hk-canal-red');
            glyph.innerHTML = glyphSvg(item.network);
            name.appendChild(glyph);
        }
        name.appendChild(el('span', 'hk-canal-cuenta', sender));
        card.appendChild(name);
    }
    const qr = o.qr(qrAddress(item), item.webqr);
    const code = qr && qr.nodeType === 1 ? qr : null;
    if (code) {
        // A picture from the shortener brings its own white margin: the card gives it less of its own.
        if (code.querySelector('img')) {
            code.classList.add('hk-qr-imagen');
        }
        card.appendChild(code);
    }
    holder.appendChild(card);
    dressObject(holder, card, code, object);
    side.appendChild(holder);
    s.appendChild(side);
    c.appendChild(s);
}

// A line of the card in one line if it can: its letter a step smaller each time, down to «least» (a share of its own) and
// never under «floor» (px), and evened in as many lines as «lines» allows if even then it does not fit. Whether it fits.
function fitCardLine(n, least, lines, floor) {
    if (!n) {
        return true;
    }
    n.style.fontSize = '';
    const size = parseFloat(window.getComputedStyle(n).fontSize);
    const low = floor ? Math.max(least, Math.min(1, floor / size)) : least;
    for (let k = 0; k <= 5; k++) {
        n.style.fontSize = k ? Math.round(size * (1 - (1 - low) * k / 5) * 10) / 10 + 'px' : '';
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
    // The name never under the least that is read from the distance: in two or three lines before that (the review of 21
    // November 2026 found it at 31 px at 3 m and 55 px at 8 m).
    const rem = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 10;
    const least = (parseFloat(window.getComputedStyle(s).getPropertyValue('--hk-t-min')) || 0) * rem;
    if (!fitCardLine(card.querySelector('.hk-canal-nombre'), 0.84, 3, least)) {
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
    const main = window.getComputedStyle(s).getPropertyValue('--hk-primario').trim();
    s.style.setProperty('--hk-canal-tinta', main ? onWhite(main, 4.5, '#16191d') : '#16191d');
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
    if (s.querySelector('.hk-canal-cielo')) {
        placeSky(s, horizontal);
    }
    placeWorld(s);
    drawCloud(s);
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

// Bluesky's card is the cloud: its outline drawn round the card as it is now (again only when its size changes).
function drawCloud(s) {
    const out = s.querySelector('[data-p="silueta"]');
    const card = s.querySelector('.hk-canal-tarjeta');
    if (!out || !card) {
        return;
    }
    const r = rem();
    const key = card.offsetWidth + 'x' + card.offsetHeight;
    if (out.hkKey === key) {
        return;
    }
    out.hkKey = key;
    const pad = 4.2 * r;
    out.style.left = -pad + 'px';
    out.style.top = -pad + 'px';
    out.style.width = (card.offsetWidth + 2 * pad) + 'px';
    out.style.height = (card.offsetHeight + 2 * pad) + 'px';
    out.innerHTML = cloudSvg(card.offsetWidth, card.offsetHeight, pad, 4.6 * r);
}

// Where a node is in the block, by offsets: what the entrance or a gesture moves for a moment does not count.
function placeIn(node, root) {
    let x = 0;
    let y = 0;
    let e = node;
    while (e && e !== root) {
        x += e.offsetLeft;
        y += e.offsetTop;
        e = e.offsetParent;
    }
    return {x, y};
}

/**
 * The network's world over the whole block, drawn for its size (again only when that changes), and the veil: the clean patch
 * of the surface under the words, as wide as their lines are, with a soft edge, so that the world never crosses what is read.
 *
 * @param {HTMLElement} s the slide's block
 */
function placeWorld(s) {
    const world = s.querySelector('.hk-canal-mundo');
    const r = rem();
    const w = Math.round(s.clientWidth / r);
    const h = Math.round(s.clientHeight / r);
    const key = s.getAttribute('data-objeto') + '/' + w + '/' + h;
    if (world && world.hkKey !== key) {
        world.hkKey = key;
        drawWorld(world, WORLDS[s.getAttribute('data-objeto')] || 'charla', w, h);
    }
    const veil = s.querySelector('.hk-canal-velo');
    const text = s.querySelector('.hk-canal-texto');
    if (!veil || !text) {
        return;
    }
    let left = null;
    let top = null;
    let right = null;
    let bottom = null;
    const range = document.createRange ? document.createRange() : null;
    for (let i = 0; i < text.children.length; i++) {
        const k = text.children[i];
        if (!k.offsetHeight) {
            continue;
        }
        const at = placeIn(k, s);
        let wide = k.offsetWidth;
        if (range) {
            // As wide as its lines: the box of its text, measured from the line's own left.
            range.selectNodeContents(k);
            const lines = range.getBoundingClientRect();
            const own = k.getBoundingClientRect();
            if (lines.width > 0) {
                wide = Math.min(k.offsetWidth, lines.right - own.left);
            }
        }
        left = left === null ? at.x : Math.min(left, at.x);
        top = top === null ? at.y : Math.min(top, at.y);
        right = right === null ? at.x + wide : Math.max(right, at.x + wide);
        bottom = bottom === null ? at.y + k.offsetHeight : Math.max(bottom, at.y + k.offsetHeight);
    }
    if (left === null) {
        veil.style.display = 'none';
        return;
    }
    const pad = 2 * r;
    veil.style.display = '';
    veil.style.left = Math.round(left - pad) + 'px';
    veil.style.top = Math.round(top - pad) + 'px';
    veil.style.width = Math.round(right - left + 2 * pad) + 'px';
    veil.style.height = Math.round(bottom - top + 2 * pad) + 'px';
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
    // The card's place, not where its gesture has it this moment.
    const at = placeIn(s.querySelector('.hk-canal-tarjeta'), s);
    const card = {left: box.left + at.x, top: box.top + at.y};
    const air = 3 * rem();
    // The sky reaches the sheet: the plane comes out from behind its turned-down corner (2.5 rem into it) and flies away. Wide,
    // the corner is the sheet's top left, by the sky; tall, its top right, so that the plane crosses the band over it.
    const corner = 2.5 * rem();
    const sheet = s.querySelector('.hk-canal-tarjeta').offsetWidth;
    let r;
    if (horizontal) {
        const width = card.left - box.left;
        r = {top: 0, width, height: (words.top || box.bottom) - box.top - air, exit: 'corner', cx: width, cy: card.top - box.top + corner};
    } else {
        const from = (words.bottom || box.top) - box.top + air * 0.6;
        const height = card.top - box.top - from + corner;
        r = {top: from, width: box.width, height, exit: 'corner', cx: card.left - box.left + sheet - corner, cy: height};
    }
    sky.style.top = Math.round(r.top) + 'px';
    sky.style.width = Math.max(0, Math.round(r.width)) + 'px';
    sky.style.height = Math.max(0, Math.round(r.height)) + 'px';
    const pw = plane.offsetWidth;
    const ph = plane.offsetHeight;
    const room = pw > 0 && r.width > pw * 4 && r.height > ph * 1.5;
    s.classList.toggle('hk-canal-sin-cielo', !room);
    s.hkSky = room ? {w: Math.round(r.width), h: Math.round(r.height), pw, ph, exit: r.exit, cx: Math.round(r.cx || 0),
        cy: Math.round(r.cy || 0)} : null;
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
    const away = sky.exit === 'corner';
    const cy = Math.max(high, Math.min(low, sky.cy || 0));
    // From the sheet's corner (cx, cy), behind it at first, away from the card: wide, it dips and climbs out by the top, on the
    // left; tall (the corner at the sky's foot, on the right), it rises, crosses the band in a wave and leaves by the left.
    const p = away && sky.cx >= w - 1 ? [
        [w + pw * 0.7, cy],
        [w * 0.62, cy + (low - cy) * 0.7],
        [w * 0.3, high + (low - high) * 0.2],
        [w * 0.1, -ph * 1.2],
    ] : away ? [
        [sky.cx - pw * 0.3, sky.h + ph * 0.8],
        [sky.cx - w * 0.3, high],
        [w * 0.3, low],
        [-pw * 0.7, high + (low - high) * 0.4],
    ] : sky.exit === 'top' ? [
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
        let angle = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) * 180 / Math.PI;
        if (away) {
            // The plane faces left: its turn is the way's angle less a half turn.
            angle = angle - 180;
            angle = angle < -180 ? angle + 360 : angle > 180 ? angle - 360 : angle;
        }
        angle *= 0.8;
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
 * The level of movement of the centre's skin (cumple.js's partyOf, read here so that canal.js needs no page to be tested).
 *
 * @returns {string} sobria, elegante or juguetona
 */
function levelNow() {
    const html = document.documentElement;
    const said = (html.getAttribute('data-fiesta') || window.getComputedStyle(html).getPropertyValue('--hk-fiesta') || '').trim();
    return LEVELS[said] ? said : 'elegante';
}

// The node a gesture or a life moves: the object itself, one of its pieces, or a child of one («botones.1»).
function partOf(s, p) {
    if (p === 'objeto') {
        return s.querySelector('.hk-canal-objeto');
    }
    const m = /^([a-z0-9-]+)\.(\d)$/.exec(p);
    const host = s.querySelector('[data-p="' + (m ? m[1] : p) + '"]');
    return m && host ? host.children[+m[2]] || null : host;
}

// Plays a list of gestures or lives from the card's way in; what is missing (a piece of a code that did not come) is skipped.
function play(s, list, level, forever) {
    const pace = LEVELS[level].pace;
    const from = ENTRANCE_AT[level];
    const out = [];
    list.forEach(function (g) {
        const n = partOf(s, g.p);
        if (!n) {
            return;
        }
        out.push(n.animate(g.frames, {duration: Math.round(g.duration * pace * 1000), delay: Math.round((from + g.delay * pace) * 1000),
            easing: g.easing || 'ease-out', direction: g.direction || 'normal', iterations: forever ? Infinity : (g.iterations || 1),
            fill: forever ? 'both' : 'backwards'}));
    });
    return out;
}

/**
 * The slide's life. The object comes in with its gesture, once (fitting the slide again does not repeat it); then only what is
 * off the code moves (a phone's buttons, a television's antennae) and the network's world goes on behind. Telegram's paper plane
 * crosses its sky slowly once the entrance is over, leaving dots that fade behind it, and comes back every FLIGHT.every seconds.
 * On a still screen, or without Web Animations, the object is at rest, its world still, and the plane rests at two thirds of its
 * way with the dots it has left.
 *
 * @param {HTMLElement} c the layer, in the page and fitted
 * @param {object} o {still}
 * @returns {function} what stops it
 */
export function startChannel(c, o) {
    stopLoops(c);
    const s = c.querySelector('.hk-canal');
    c.hkChannelRestart = function () {
        startChannel(c, o);
    };
    const stop = function () {
        stopChannel(c);
    };
    if (!s) {
        return stop;
    }
    const moves = !(o && o.still) && typeof s.animate === 'function';
    const running = [];
    if (moves) {
        const level = levelNow();
        const name = s.getAttribute('data-objeto');
        if (!c.hkChannelGesture) {
            c.hkChannelGesture = play(s, gestureOf(name, LEVELS[level].k), level, false);
        }
        play(s, lifeOf(name, LEVELS[level].k), level, true).forEach(function (a) {
            running.push(a);
        });
        const pieces = s.querySelectorAll('.hk-canal-mundo > *');
        for (let i = 0; i < pieces.length; i++) {
            const l = pieces[i].hkLife;
            if (l) {
                running.push(pieces[i].animate(l.frames, {duration: Math.round(l.duration * 1000), delay: Math.round(l.delay * 1000),
                    easing: l.easing, direction: l.direction, iterations: Infinity, fill: 'both'}));
            }
        }
    }
    flyPlane(c, s, o, running);
    c.hkChannelRun = running;
    return stop;
}

// Telegram's paper plane, in its sky: its flight, or at rest on its way with its dots.
function flyPlane(c, s, o, running) {
    const sky = s.hkSky;
    if (!sky || !s.querySelector('.hk-canal-avion')) {
        return;
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
        return;
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
    running.push(plane.animate(frames, timing));
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
}

// Stops what loops (the object's life, its world, the plane), not the gesture: fitting the slide again restarts them.
function stopLoops(c) {
    if (c && c.hkChannelRun) {
        c.hkChannelRun.forEach(function (a) {
            a.cancel();
        });
        c.hkChannelRun = null;
    }
}

/** Stops the slide's life, its gesture too: render.js's leave() calls it through c.hkStop. */
export function stopChannel(c) {
    stopLoops(c);
    if (c && c.hkChannelGesture) {
        c.hkChannelGesture.forEach(function (a) {
            a.cancel();
        });
        c.hkChannelGesture = null;
    }
}
