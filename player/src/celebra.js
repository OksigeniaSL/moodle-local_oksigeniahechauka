// «La biblioteca celebra», a slide of its own (Jujol, 13 November 2026): what Ayvurenda celebrates this week, one moment at
// a time, in the library's own words. A party, but a small one beside the birthdays': the library's rosette (or the cover of
// the book, with the rosette pinned on it), the sentence large and a few streamers printed on the paper, still. Each turn,
// the next moment; its marks under the words, one per moment, in the four colours of the skin.

import {fitWord, linesOf} from './lead.js';

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

/** The moments a slide turns through: four at most, as the contract says. */
export function momentsOf(item) {
    return ((item && item.moments) || []).filter(function (m) {
        return m && m.text;
    }).slice(0, 4);
}

/**
 * The sentence with its short words held to the next one by a no-break space: «El faro», «a las», «de la». From afar an
 * «El» at the end of a line, apart from what it opens, reads as a word of its own.
 */
export function heldShortWords(text) {
    // Each short word is looked at by itself, so two in a row («fue «El faro») are both held: a match that took the space
    // before the next one would leave that one loose. Only at the start of a word (no lookbehind in Chrome 56).
    return String(text || '').replace(/([«¿¡"(]?[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{1,3})\s+(?=\S)/g, function (all, word, at, whole) {
        return at === 0 || /\s/.test(whole.charAt(at - 1)) ? word + '\u00a0' : all;
    });
}

/** One page per moment. */
export function momentsPages(item) {
    return Math.max(1, momentsOf(item).length);
}

/** The leaves of a laurel on one side (1 right, -1 left), from the bottom up round (32, 33), each along the round. */
function laurel(side) {
    let out = '';
    for (let k = 0; k < 5; k++) {
        const deg = -60 + k * 28;
        const a = deg * Math.PI / 180;
        const x = (32 + side * Math.cos(a) * 22).toFixed(1);
        const y = (34 - Math.sin(a) * 22).toFixed(1);
        out += '<ellipse class="a-verde" cx="' + x + '" cy="' + y + '" rx="4" ry="8.5" transform="rotate(' + (-side * deg) + ' ' + x +
            ' ' + y + ')"/>';
    }
    return out;
}

// What each kind of moment shows inside the rosette, in the line and colours of the activity icons (actividad.css): stickers
// with a dark outline, which read on either theme.
const GLYPHS = {
    // Books lent: the pile on the counter.
    loans: '<rect class="a-azul" x="9" y="43" width="46" height="12" rx="2.5"/>' +
        '<rect class="a-rojo" x="13" y="30" width="40" height="12" rx="2.5" transform="rotate(-4 33 36)"/>' +
        '<rect class="a-verde" x="10" y="17" width="42" height="12" rx="2.5" transform="rotate(3 31 23)"/>' +
        '<path class="a-l" d="M17 49H47M19 36H46M16 23H45"/>',
    // A book that went out a hundred times: the book with its ribbon.
    book: '<rect class="a-violeta" x="13" y="5" width="38" height="54" rx="4"/><path class="a-l" d="M19 5V59"/>' +
        '<rect class="a-crema" x="24" y="15" width="21" height="11" rx="2"/><path class="a-rojo" d="M38 52V62L42 58L46 62V52Z"/>',
    // The day with most loans: its calendar sheet and a star.
    record: '<rect class="a-crema" x="8" y="10" width="48" height="46" rx="6"/><path class="a-rojo" d="M8 22V16C8 13 11 10 14 10H50' +
        'C53 10 56 13 56 16V22Z"/><path class="a-f" d="M20 5V14M44 5V14"/><path class="a-amarillo" d="M32 27L36 35L45 36L38 42L40 51' +
        'L32 46L24 51L26 42L19 36L28 35Z"/>',
    // Readers at the goal of a challenge: the finish flag.
    quest: '<path class="a-f" d="M14 60V5"/><path class="a-crema" d="M14 7H52V33H14Z"/>' +
        '<path class="a-azul" d="M14 7H23.5V15.7H14ZM33 7H42.5V15.7H33ZM23.5 15.7H33V24.3H23.5ZM42.5 15.7H52V24.3H42.5ZM14 24.3H23.5' +
        'V33H14ZM33 24.3H42.5V33H33Z"/>',
    // A class that met its challenge: the cup.
    challenge: '<path class="a-f" d="M20 13H11C11 22 15 27 21 27M44 13H53C53 22 49 27 43 27M32 38V48"/>' +
        '<path class="a-amarillo" d="M19 7H45V23C45 32 39 38 32 38C25 38 19 32 19 23Z"/><rect class="a-marron" x="19" y="48" width="26"' +
        ' height="10" rx="2.5"/>',
    // Readers with their first book: the open book, and a spark.
    first: '<path class="a-crema" d="M32 18C26 13 15 12 6 15V55C15 52 26 53 32 58C38 53 49 52 58 55V15C49 12 38 13 32 18Z"/>' +
        '<path class="a-l" d="M32 18V58M12 24C17 23 22 24 26 26M12 32C17 31 22 32 26 34M38 26C42 24 47 23 52 24M38 34C42 32 47 31 52 32"/>' +
        '<path class="a-amarillo" d="M50 1L52.5 6.5L58 9L52.5 11.5L50 17L47.5 11.5L42 9L47.5 6.5Z"/>',
    // The library's anniversary: a laurel round a star.
    anniversary: laurel(1) + laurel(-1) + '<path class="a-amarillo" d="M32 21L35.5 28L43 29L37.5 34L39 41.5L32 38L25 41.5L26.5 34L21' +
        ' 29L28.5 28Z"/><path class="a-rojo" d="M25 54L32 49L39 54L37 62L32 58L27 62Z"/>',
};

/** The rosette of the library: its pleated round in the skin's first colour, its two tails, and the kind's sticker inside. */
function rosette(kind, small) {
    const pleats = [];
    for (let k = 0; k < 64; k++) {
        const a = k * Math.PI / 32;
        const r = k % 2 ? 84 : 96;
        pleats.push((100 + Math.sin(a) * r).toFixed(1) + ' ' + (100 - Math.cos(a) * r).toFixed(1));
    }
    const glyph = GLYPHS[kind] || GLYPHS.loans;
    const svg = '<svg viewBox="0 0 200 262" aria-hidden="true" focusable="false">' +
        '<path class="hk-celebra-cola-1" d="M70 146L46 250L66 236L82 254L104 160Z"/>' +
        '<path class="hk-celebra-cola-2" d="M130 146L154 250L134 236L118 254L96 160Z"/>' +
        '<path class="hk-celebra-pliegues" d="M' + pleats.join('L') + 'Z"/>' +
        '<circle class="hk-celebra-aro" cx="100" cy="100" r="70"/>' +
        '<circle class="hk-celebra-centro" cx="100" cy="100" r="62"/>' +
        '<svg class="hk-icono-actividad" x="52" y="52" width="96" height="96" viewBox="0 0 64 64" stroke-width="3.4"' +
        ' stroke-linejoin="round" stroke-linecap="round">' + glyph + '</svg></svg>';
    const d = el('div', 'hk-celebra-escarapela' + (small ? ' hk-celebra-escarapela-prendida' : ''));
    d.innerHTML = svg;
    return d;
}

/** The streamers printed on the paper: three curls in the corners, each its own drawing of a fixed shape, so that they stay
 * in the corners on any screen and never cross the words; in the skin's colours, quiet and still. */
function streamers() {
    // Made by the HTML parser, as the rosette: innerHTML on an SVG element is not sure on Chromium 56.
    const box = el('div', 'hk-celebra-serpentinas');
    box.setAttribute('aria-hidden', 'true');
    const curl = function (where, d, n) {
        return '<svg class="hk-celebra-serpentina hk-celebra-' + where + '" viewBox="0 0 300 200" focusable="false">' +
            '<path class="hk-celebra-serpentina-' + n + '" d="' + d + '"/></svg>';
    };
    box.innerHTML = curl('arriba', 'M310 150C260 160 240 110 200 120C160 130 175 175 135 180C95 185 90 130 120 105C150 80 120 30 70 40' +
        'C40 46 30 20 35 -10', 1) +
        curl('abajo-izquierda', 'M-10 60C40 40 70 90 110 80C150 70 140 20 180 25C220 30 215 90 255 105C285 116 300 150 290 210', 3) +
        curl('abajo-derecha', 'M310 40C270 30 250 80 210 85C170 90 160 50 125 60C90 70 100 120 70 140C45 157 20 150 0 210', 2);
    return box;
}

/**
 * Fills the layer with one moment: the rosette (or the cover with the rosette pinned on it), the label, the sentence and the
 * marks of the moments.
 *
 * @param {HTMLElement} c the layer
 * @param {object} item {label, moments: [{kind, text, cover, library}]}
 * @param {number} page
 * @param {object} o {distance, horizontal, media: function (ref): url}
 */
export function buildMoments(c, item, page, o) {
    const moments = momentsOf(item);
    if (!moments.length) {
        return;
    }
    const at = page % moments.length;
    const m = moments[at];
    const s = el('section', 'hk-celebra');
    s.setAttribute('data-tipo', m.kind || '');
    s.appendChild(streamers());
    const room = el('div', 'hk-celebra-sala');
    const thing = el('div', 'hk-celebra-objeto');
    const src = m.cover ? (o.media(m.cover) || m.cover.url) : null;
    if (src) {
        const book = el('div', 'hk-libro hk-libro-grande hk-celebra-portada');
        const im = el('img');
        im.alt = '';
        im.src = src;
        book.appendChild(im);
        thing.appendChild(book);
        thing.appendChild(rosette(m.kind, true));
        s.classList.add('hk-celebra-con-portada');
    } else {
        thing.appendChild(rosette(m.kind, false));
    }
    room.appendChild(thing);
    const side = el('div', 'hk-celebra-lado');
    side.appendChild(el('p', 'hk-celebra-etiqueta', (item && item.label) || ''));
    side.appendChild(el('h2', 'hk-celebra-texto', heldShortWords(m.text)));
    if (m.library) {
        side.appendChild(el('p', 'hk-celebra-sitio', m.library));
    }
    // One mark per moment, the one of now lit: so whoever passes twice knows there is more (never a count).
    if (moments.length > 1) {
        const marks = el('p', 'hk-celebra-marcas');
        marks.setAttribute('aria-hidden', 'true');
        for (let k = 0; k < moments.length; k++) {
            const i = el('i');
            i.setAttribute('data-n', String(k % 4 + 1));
            if (k === at) {
                i.className = 'hk-celebra-marca-actual';
            }
            marks.appendChild(i);
        }
        side.appendChild(marks);
    }
    room.appendChild(side);
    s.appendChild(room);
    c.appendChild(s);
    s.hkMoment = m;
}

/**
 * Once in the page: the sentence by steps, never under the distance's minimum; then the place goes, and last a smaller cover.
 *
 * @param {HTMLElement} c the layer
 * @param {boolean} horizontal
 */
export function fitMoments(c, horizontal) {
    const party = c.querySelector('.hk-celebra');
    if (!party) {
        return;
    }
    const text = party.querySelector('.hk-celebra-texto');
    const side = party.querySelector('.hk-celebra-lado');
    const most = horizontal ? 4 : 5;
    text.style.fontSize = '';
    // The rosette, or the cover with it, never taller than the room: a low body (the birthday strip at 8 m) makes them
    // smaller, from what the room leaves, rather than out of the card.
    party.style.removeProperty('--hk-escarapela');
    party.style.removeProperty('--hk-libro-alto');
    party.classList.remove('hk-celebra-baja');
    if (horizontal) {
        const room = party.querySelector('.hk-celebra-sala');
        const cs = window.getComputedStyle(room);
        const free = room.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const rosette = party.querySelector('.hk-celebra-escarapela:not(.hk-celebra-escarapela-prendida)');
        const cover = party.querySelector('.hk-celebra-portada');
        if (rosette && rosette.offsetHeight > free) {
            party.style.setProperty('--hk-escarapela', Math.floor(free / 1.31) + 'px');
            party.classList.add('hk-celebra-baja');
        }
        if (cover && cover.offsetHeight > free * 0.92) {
            party.style.setProperty('--hk-libro-alto', Math.floor(free * 0.92) + 'px');
            party.classList.add('hk-celebra-baja');
        }
    }
    const states = [[], ['hk-celebra-sin-sitio'], ['hk-celebra-sin-sitio', 'hk-celebra-menor']];
    for (let n = 0; n < states.length; n++) {
        party.classList.remove('hk-celebra-sin-sitio', 'hk-celebra-menor');
        states[n].forEach(function (cls) {
            party.classList.add(cls);
        });
        for (let step = 0; step <= 3; step++) {
            party.setAttribute('data-ajuste', String(step));
            if (linesOf(text) <= most && side.scrollHeight <= side.clientHeight + 1 && text.scrollWidth <= text.clientWidth + 1) {
                return;
            }
        }
    }
    const size = parseFloat(window.getComputedStyle(text).fontSize);
    for (let k = 1; k <= 8 && side.scrollHeight > side.clientHeight + 1; k++) {
        text.style.fontSize = Math.round(size * (1 - k * 0.05)) + 'px';
    }
    fitWord(text);
}
