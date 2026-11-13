// «La foto del día»: one curious and beautiful picture a day (a galaxy, a bug under the microscope, a painting) for whoever
// passes to stop and look (Jujol, 13 November 2026). The picture leads: as big as the body lets it, whole (a painting is
// never cut), on a mat of the skin's surface; its credit under it, always, as the licence of many of them asks. Beside it
// (under it on an upright screen) a small label with the pictogram of its kind, the title, and the caption, a «did you
// know…?» for a child, in big letters. The frame is measured here from the picture's own shape and the room: the words
// keep their share, and a picture of the other shape than the screen takes the room it needs, not a cut.
// Chromium 56: flexbox, margins for gaps; the picture settles with a transform only.
import {fitWord} from './lead.js';

// The share of the body the words keep, by the screen and the picture's shape, at 3 and 5 m; at 8 m the words are bigger
// and keep a little more.
const SHARE = {h: {h: 0.32, v: 0.44}, v: {h: 0.34, v: 0.36}};
const SHARE_FAR = 0.08;

// A pictogram for each kind, in the line of the screen's icons: 24 units, a stroke of 2.
const KINDS = {
    cielo: '<path d="M15.5 4.5a7.5 7.5 0 1 0 4 13.6A6 6 0 0 1 15.5 4.5z"/><path d="M6 4.5v3M4.5 6h3M18 13.5v2M17 14.5h2"/>',
    tierra: '<path d="M2.5 19.5 9 8l4 6.5 2.5-3.5 6 8z"/><path d="M7.4 11 9 12.5l1.6-1.5"/>',
    vida: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
    cerca: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20"/><circle cx="8.5" cy="9" r="1"/>' +
        '<circle cx="11.5" cy="11" r=".9"/>',
    arte: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.4-2.1-.6-1.2.1-2.4 1.5-2.4h1.6a4 4 0 0 0 ' +
        '4-4C20.5 7.3 16.7 3.5 12 3.5z"/><circle cx="7.6" cy="11" r="1.2"/><circle cx="10.5" cy="7.4" r="1.2"/>' +
        '<circle cx="15" cy="7.8" r="1.2"/>',
};
// The themes each centre chooses from: «universo» is the sky's.
KINDS.universo = KINDS.cielo;

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

// An SVG through the HTML parser: innerHTML on an SVG element is not safe in Chromium 56.
function svg(inner) {
    const d = document.createElement('div');
    d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
    return d.firstChild;
}

/**
 * The picture's shape: from its media's size, else from the item's orientation, else landscape.
 *
 * @param {object} item {image: {width, height}, orientation: 'h'|'v'}
 * @returns {number} width over height
 */
export function aspectOf(item) {
    const m = (item && item.image) || {};
    if (m.width > 0 && m.height > 0) {
        return m.width / m.height;
    }
    return item && item.orientation === 'v' ? 3 / 4 : 4 / 3;
}

/**
 * Where the frame goes and how big: the words keep their share of the room, and the picture takes what is left, whole.
 *
 * @param {number} w the room's width
 * @param {number} h the room's height (without the credit's line)
 * @param {number} aspect the picture's width over its height
 * @param {boolean} horizontal the screen
 * @param {number} share the share of the room for the words
 * @returns {{w: number, h: number}}
 */
export function frameOf(w, h, aspect, horizontal, share) {
    let fw;
    if (horizontal) {
        fw = Math.min(w * (1 - share), h * aspect);
    } else {
        fw = Math.min(w, h * (1 - share) * aspect);
    }
    return {w: Math.floor(fw), h: Math.floor(fw / aspect)};
}

/**
 * The slide, on its layer.
 *
 * @param {HTMLElement} c the layer
 * @param {object} item {image, title, caption, credit, category, orientation, label}
 * @param {object} o {distance, horizontal, media (a media reference to its url), label (the slide's name)}
 */
export function buildPhotoday(c, item, o) {
    if (!item || !item.image) {
        return;
    }
    const aspect = aspectOf(item);
    const s = el('section', 'hk-fdd');
    s.setAttribute('data-forma', aspect >= 1 ? 'h' : 'v');
    s.setAttribute('data-ajuste', '0');
    if (KINDS[item.category]) {
        s.setAttribute('data-categoria', item.category);
    }
    s.hkAspect = aspect;
    const frame = el('figure', 'hk-fdd-marco');
    const box = el('div', 'hk-fdd-lamina');
    const im = el('img', 'hk-fdd-img');
    im.alt = item.title || '';
    im.src = (o.media && o.media(item.image)) || item.image.url || '';
    box.appendChild(im);
    frame.appendChild(box);
    if (item.credit) {
        frame.appendChild(el('figcaption', 'hk-fdd-credito', item.credit));
    }
    s.appendChild(frame);
    const side = el('div', 'hk-fdd-lado');
    const label = el('p', 'hk-fdd-etiqueta');
    if (KINDS[item.category]) {
        const icon = el('span', 'hk-fdd-icono');
        icon.appendChild(svg(KINDS[item.category]));
        label.appendChild(icon);
    }
    label.appendChild(document.createTextNode(item.label || o.label || ''));
    side.appendChild(label);
    if (item.title) {
        side.appendChild(el('h2', 'hk-fdd-titulo', item.title));
    }
    if (item.caption) {
        side.appendChild(el('p', 'hk-fdd-pie', item.caption));
    }
    s.appendChild(side);
    c.appendChild(s);
}

/**
 * Fitted once on the screen: the frame from the room and the picture's shape; then the words take the biggest of their
 * steps that fits their share (two bigger, with room to spare; three smaller: 0.92, 0.84 and 0.76); if they still do
 * not, the picture gives them a little more room, up to 15 % of the body. Never under the least that is read; a word
 * wider than its column, alone, smaller.
 *
 * @param {HTMLElement} c the layer
 * @param {boolean} horizontal
 */
export function fitPhotoday(c, horizontal) {
    const s = c.querySelector('.hk-fdd');
    if (!s) {
        return;
    }
    const frame = s.querySelector('.hk-fdd-marco');
    const box = s.querySelector('.hk-fdd-lamina');
    const side = s.querySelector('.hk-fdd-lado');
    const credit = s.querySelector('.hk-fdd-credito');
    const far = s.closest('[data-distancia="8"]') !== null;
    const cs = window.getComputedStyle(s);
    const w = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const gap = parseFloat(window.getComputedStyle(side).getPropertyValue(horizontal ? 'margin-left' : 'margin-top')) || 0;
    // The credit's height depends on the frame's width (a long one takes two lines in a narrow frame): measured with the
    // frame set, and the frame set again with it.
    const creditOf = function () {
        return credit ? credit.offsetHeight + (parseFloat(window.getComputedStyle(credit).marginTop) || 0) : 0;
    };
    const base = SHARE[horizontal ? 'h' : 'v'][s.getAttribute('data-forma')] + (far ? SHARE_FAR : 0);
    const fits = function () {
        return side.scrollHeight <= side.clientHeight + 1 && side.scrollWidth <= side.clientWidth + 1;
    };
    const place = function (share) {
        let creditH = creditOf();
        for (let k = 0; k < 2; k++) {
            const room = horizontal ? h - creditH : h - creditH - gap;
            const f = frameOf(horizontal ? w - gap : w, room, s.hkAspect, horizontal, share);
            box.style.width = f.w + 'px';
            box.style.height = f.h + 'px';
            frame.style.width = f.w + 'px';
            creditH = creditOf();
        }
    };
    for (let more = 0; more <= 0.15001; more += 0.05) {
        place(base + more);
        for (let step = -2; step <= 3; step++) {
            s.setAttribute('data-ajuste', String(step));
            if (fits()) {
                return;
            }
        }
    }
    const title = s.querySelector('.hk-fdd-titulo');
    if (title) {
        fitWord(title);
    }
}
