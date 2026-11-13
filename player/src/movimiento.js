// How the slides move: one language for all of them (Gaudí, 8 November 2026; MOTION.md). The player calls motion()
// once the layer is in the page, measured and with its letters, before .hk-dentro is added: it marks the parts of the slide in
// the order they are read (the frame first, then the headline, what explains it, the object, the third from the top), each
// with how it comes in and when; movimiento.css does the rest with transform and opacity. Then the little life of the slide
// while it stands: a sheen that passes over a block of colour, the bar of the time left, the flaps of a countdown, the words of
// a headline. motion() returns what stops it all; leave() calls it. The sheen passes once a slide or so (every 25 to 30 s), so
// that it is not read as an ornament.
//
// How much moves comes from the skin's --hk-fiesta (sobria, elegante, juguetona), as in the birthdays, and a screen that keeps
// still (.hk-quieto or the system's reduced motion) gets the same order with fades only, and no life.
//
// Chromium 56: element.animate (Web Animations, Chrome 36) for the flaps, transitions and keyframes with plain values.

import {partyOf} from './cumple.js';

/**
 * The timings of each level, in seconds: wait (the old slide has gone), step (between two parts), line (between two lines of a
 * list), flips (of a countdown's flaps), flip (each). The flaps start from yesterday's number at every level: one turn, and
 * never a number that is not (Gaudí, 8 November 2026).
 */
export const TIMING = {
    sobria: {wait: 0.32, step: 0.06, line: 0.045, flips: 1, flip: 0.34},
    elegante: {wait: 0.32, step: 0.09, line: 0.06, flips: 1, flip: 0.26},
    juguetona: {wait: 0.32, step: 0.11, line: 0.07, flips: 1, flip: 0.2},
};

// The parts of each composition in the order they come in: [selector, how it comes in, rank, «each» or nothing]. The rank says
// when (wait + rank × step); with «each», every match after the first a line later; with «step», a step later.
const LEAD = [
    ['.hk-lider', 'bloque', 0],
    ['.hk-lider-etiqueta', 'sube', 1],
    ['.hk-lider-titular', 'sube', 2],
    ['.hk-lider-alergenos', 'sube', 3],
    ['.hk-lider-entrada', 'sube', 3],
    ['.hk-lider-plato', 'sube', 3.5, 'each'],
    ['.hk-lider-tambien', 'sube', 5],
    ['.hk-mesa', 'plato', 1.5],
    ['.hk-senal', 'senal', 1.5],
    ['.hk-talon', 'talon', 0.5],
    ['.hk-marcador', 'marcador', 0.5],
    ['.hk-hoja', 'hoja', 0.5],
    ['.hk-lider-sello', 'sello', 4],
];
const REST = [
    ['.hk-resto > .hk-aviso-fijo', 'sube', 4],
    ['.hk-resto-pagina > *', 'linea', 5, 'each'],
    ['.hk-resto-paginas', 'fundido', 6],
];
const PHOTO = [
    ['.hk-medio', 'foto', 0, 'step'],
    ['.hk-medio .hk-pie h2', 'sube', 2.5, 'step'],
    ['.hk-medio .hk-pie p', 'sube', 3.5, 'step'],
];
const PARTS = {
    'solo-hoy': LEAD.concat(REST),
    'foto-hoy': PHOTO.concat(REST),
    'vertical-hoy': PHOTO.concat(LEAD),
    'dos-verticales': PHOTO.concat(REST),
    'tres-verticales': PHOTO.concat(REST),
    'foto-sola': PHOTO,
    'titular': [
        ['.hk-tipografica', 'marco', 0],
        ['.hk-tipografica-paletas', 'marcador', 1],
        ['.hk-tipografica-etiqueta', 'sube', 1],
        ['.hk-tipografica-dias', 'sube', 2],
        ['.hk-tipografica-cuenta', 'cifra', 2],
        ['.hk-mv-renglon > span', 'renglon', 2, 'step'],
        ['.hk-tipografica[data-tipo="cuenta"] .hk-tipografica-texto', 'sube', 3],
        ['.hk-tipografica-pie', 'sube', 4.5],
    ],
    'plazos': [
        ['.hk-plazos', 'marco', 0],
        ['.hk-plazos-cabeza > *', 'sube', 1, 'step'],
        ['.hk-plazos-dia', 'dia', 2.5, 'step'],
        ['.hk-plazos-fila', 'fila', 3, 'each'],
    ],
    'biblioteca': [
        ['.hk-biblio', 'marco', 0],
        ['.hk-biblio-tabla', 'fundido', 0.5],
        ['.hk-libro-grande', 'libro', 1],
        ['.hk-biblio-texto > *', 'sube', 2, 'step'],
        ['.hk-biblio-cabeza .hk-qr', 'qr', 5],
        ['.hk-biblio-otros > *', 'estante', 4, 'each'],
    ],
    // What the library celebrates: the rosette is pinned on as a stamp, or the cover is put in its place and the rosette on
    // it; then the words, and the marks of the moments last.
    'celebra': [
        ['.hk-celebra', 'marco', 0],
        ['.hk-celebra-portada', 'libro', 1],
        ['.hk-celebra-escarapela', 'sello', 1.5],
        ['.hk-celebra-lado > .hk-celebra-etiqueta', 'sube', 2.5],
        ['.hk-celebra-texto', 'sube', 3],
        ['.hk-celebra-sitio', 'sube', 4],
        ['.hk-celebra-marcas', 'sube', 5],
    ],
    // The channel: its words, and then its last message arrives, the card with the QR (Gaudí, 8 November 2026).
    'canal': [
        ['.hk-canal', 'marco', 0],
        ['.hk-canal-titular', 'sube', 1],
        ['.hk-canal-linea', 'sube', 2],
        ['.hk-canal-seguidores', 'sube', 3],
        ['.hk-canal-tarjeta', 'mensaje', 4.5],
    ],
    // The two zones: the wide one first (the picture, or the place's card and its words), then the column as a block, its
    // band last; the column's carousel and its pictures' slow move are its life (zonas.js, zonas.css).
    'zonas': [
        ['.hk-zonas-ancha', 'foto', 0],
        ['.hk-zonas-ancha .hk-pie h2', 'sube', 2.5],
        ['.hk-zonas-ancha .hk-pie p', 'sube', 3.5],
        ['.hk-sitio-ficha-cuerpo > *', 'sube', 1, 'step'],
        ['.hk-zonas-col', 'bloque', 2],
        ['.hk-zonas-pie', 'sube', 4],
    ],
    'tabla': [
        ['.hk-tabla', 'bloque', 0],
        ['.hk-tabla-cabeza > *', 'sube', 1, 'step'],
        ['.hk-tabla-t thead', 'fundido', 2],
        ['.hk-tabla-t tbody tr', 'fundido', 2.5, 'each'],
        ['.hk-tabla-ficha', 'sube', 2.5, 'step'],
    ],
};

/** The level of movement of the skin, or the one asked for: sobria, elegante or juguetona. */
export function levelOf(party) {
    return partyOf(party);
}

/**
 * When each part comes in, in seconds from the moment the layer is shown. Pure: what the page has is given as counts.
 *
 * @param {Array} rules the composition's parts ([selector, how, rank, each])
 * @param {number[]} counts how many nodes each rule found
 * @param {string} level sobria, elegante or juguetona
 * @param {boolean} still the screen keeps still: the same order, closer together
 * @returns {Array<{rule: number, index: number, at: number, how: string}>}
 */
export function timeline(rules, counts, level, still) {
    const t = TIMING[level] || TIMING.elegante;
    const squeeze = still ? 0.6 : 1;
    const out = [];
    rules.forEach(function (r, i) {
        const n = counts[i] || 0;
        for (let k = 0; k < n; k++) {
            const each = r[3] === 'each' ? t.line : (r[3] === 'step' ? t.step : 0);
            const at = t.wait + (r[2] * t.step + k * each) * squeeze;
            out.push({rule: i, index: k, at: Math.round(at * 1000) / 1000, how: r[1]});
        }
    });
    return out;
}

/** The numbers a countdown's flaps go through to reach «days»: a few before it, never with fewer digits than it has. */
export function flapsOf(days, flips) {
    const n = Math.max(0, parseInt(days, 10) || 0);
    const digits = String(n).length;
    const top = Math.pow(10, digits) - 1;
    const from = Math.min(top, n + Math.max(0, flips || 0));
    const out = [];
    for (let k = from; k >= n; k--) {
        out.push(String(k));
    }
    return out;
}

/** The parts of a composition: their rules, or none for one that keeps the old pass (the full screens, the agenda…). */
export function rulesOf(comp) {
    return PARTS[comp] || null;
}

function each(list, fn) {
    for (let i = 0; i < list.length; i++) {
        fn(list[i], i);
    }
}

function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) {
        n.className = cls;
    }
    return n;
}

// The lines of a headline, each in a mask of its own, so it can rise from under itself: the lines as the page laid them out
// (measured word by word), so the headline keeps its breaks and its size. One mask a line, not one a word: on a screen
// without GPU each mask is a surface of its own.
function splitLines(node) {
    if (!node || node.hkSplit || !document.createRange) {
        return;
    }
    node.hkSplit = true;
    const lines = [];
    let top = null;
    const range = document.createRange();
    const walk = function (n) {
        for (let i = 0; i < n.childNodes.length; i++) {
            const c = n.childNodes[i];
            if (c.nodeType === 1) {
                walk(c);
            } else if (c.nodeType === 3) {
                const re = /\S+/g;
                let m = re.exec(c.textContent);
                while (m) {
                    range.setStart(c, m.index);
                    range.setEnd(c, m.index + m[0].length);
                    const y = Math.round(range.getBoundingClientRect().top);
                    if (top === null || Math.abs(y - top) > 4) {
                        lines.push([]);
                        top = y;
                    }
                    lines[lines.length - 1].push(m[0]);
                    m = re.exec(c.textContent);
                }
            }
        }
    };
    walk(node);
    if (!lines.length) {
        return;
    }
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
    lines.forEach(function (words) {
        const mask = el('span', 'hk-mv-renglon');
        const line = el('span');
        line.textContent = words.join(' ');
        mask.appendChild(line);
        node.appendChild(mask);
    });
}

// A sheen that passes over a block of colour: a soft band in a box of the block's size that clips it (the bubble's tail stays
// outside). CSS moves it (movimiento.css, hk-mv-brillo); it waits its own delay.
function addSheen(block, delay) {
    if (!block || block.querySelector('.hk-mv-brillo-caja')) {
        return;
    }
    const box = el('span', 'hk-mv-brillo-caja');
    const band = el('i', 'hk-mv-brillo');
    band.style.webkitAnimationDelay = delay + 's';
    band.style.animationDelay = delay + 's';
    box.appendChild(band);
    block.insertBefore(box, block.firstChild);
}

// The bar of the time left on the slide, under a heading or as the current page's dot: it fills in the slide's seconds.
function addTimeBar(host, seconds, delay, cls) {
    if (!host || !(seconds > 0)) {
        return;
    }
    const bar = el('i', cls || 'hk-mv-tiempo');
    const fill = el('i');
    fill.style.webkitAnimationDuration = Math.max(1, seconds - delay) + 's';
    fill.style.animationDuration = Math.max(1, seconds - delay) + 's';
    fill.style.webkitAnimationDelay = delay + 's';
    fill.style.animationDelay = delay + 's';
    bar.appendChild(fill);
    host.appendChild(bar);
}

// The flaps of a countdown, one flip at a time to the day's number: the old top half folds down over the new one, and the new
// bottom half comes down over the old. Web Animations; nothing is left in the page when it ends.
function flipBoard(board, days, level, at) {
    const t = TIMING[level] || TIMING.elegante;
    const seq = flapsOf(days, t.flips);
    const flaps = board.querySelectorAll('.hk-paleta');
    if (seq.length < 2 || !flaps.length || !flaps[0].animate) {
        return null;
    }
    const width = seq[0].length;
    const digitAt = function (s, k) {
        return s.charAt(k - (width - s.length));
    };
    // The board shows the first number while it waits.
    each(flaps, function (f, k) {
        f.hkDigit = digitAt(String(days), k);
        f.firstChild.textContent = digitAt(seq[0], k) || f.hkDigit;
    });
    const running = [];
    const timers = [];
    const half = function (f, digit, top, cls) {
        const h = el('span', 'hk-mv-media ' + cls + (top ? ' hk-mv-arriba' : ' hk-mv-abajo'));
        const inner = el('span', 'hk-mv-media-cifra');
        inner.textContent = digit;
        h.appendChild(inner);
        f.appendChild(h);
        return h;
    };
    const flip = function (f, from, to) {
        const leaf = half(f, from, true, 'hk-mv-hoja');
        const under = half(f, from, false, 'hk-mv-quieta');
        const fall = half(f, to, false, 'hk-mv-hoja');
        f.firstChild.textContent = to;
        const ms = t.flip * 1000;
        const a = leaf.animate([{transform: 'rotateX(0deg)'}, {transform: 'rotateX(-90deg)'}],
            {duration: ms / 2, easing: 'cubic-bezier(.55,0,.9,.5)', fill: 'forwards'});
        const b = fall.animate([{transform: 'rotateX(90deg)'}, {transform: 'rotateX(0deg)'}],
            {duration: ms / 2, delay: ms / 2, easing: level === 'juguetona' ? 'cubic-bezier(.2,.9,.3,1.25)' : 'cubic-bezier(.1,.5,.45,1)',
                fill: 'both'});
        running.push(a, b);
        b.onfinish = function () {
            [leaf, under, fall].forEach(function (n) {
                if (n.parentNode) {
                    n.parentNode.removeChild(n);
                }
            });
        };
    };
    for (let s = 1; s < seq.length; s++) {
        timers.push(setTimeout(function () {
            each(flaps, function (f, k) {
                const from = digitAt(seq[s - 1], k);
                const to = digitAt(seq[s], k);
                if (from !== to) {
                    flip(f, from, to);
                }
            });
        }, (at + (s - 1) * t.flip) * 1000));
    }
    return function () {
        timers.forEach(clearTimeout);
        running.forEach(function (a) {
            a.cancel();
        });
        each(flaps, function (f) {
            each(f.querySelectorAll('.hk-mv-media'), function (n) {
                n.parentNode.removeChild(n);
            });
            if (f.hkDigit) {
                f.firstChild.textContent = f.hkDigit;
            }
        });
    };
}

/**
 * The slide's movement: its parts marked in the order they are read, and its life while it stands.
 *
 * @param {HTMLElement} c the layer (.hk-cuerpo.hk-capa), in the page and measured, before .hk-dentro
 * @param {string} comp its composition
 * @param {object} o {still: the screen keeps still, party: a level asked for (or the skin's), seconds: how long it stays}
 * @returns {function} what stops its life
 */
export function motion(c, comp, o) {
    const opts = o || {};
    const rules = rulesOf(comp);
    if (!c || !rules) {
        return function () {};
    }
    const level = levelOf(opts.party);
    const still = !!opts.still;
    c.setAttribute('data-mv', comp);
    c.setAttribute('data-mv-fiesta', level);
    if (still) {
        c.setAttribute('data-mv-quieta', '');
    }
    // The headline's lines, before they are counted (8 m and the sentence of the ticker: titular).
    if (comp === 'titular') {
        splitLines(c.querySelector('.hk-tipografica[data-tipo="frase"] .hk-tipografica-texto'));
    }
    const found = rules.map(function (r) {
        const list = c.querySelectorAll(r[0]);
        const out = [];
        each(list, function (n) {
            // A node two rules find comes in with the first.
            if (!n.hkMv && out.indexOf(n) === -1) {
                out.push(n);
            }
        });
        return out;
    });
    const times = timeline(rules, found.map(function (l) {
        return l.length;
    }), level, still);
    let last = 0;
    times.forEach(function (x) {
        const n = found[x.rule][x.index];
        n.hkMv = true;
        n.classList.add('hk-mv');
        n.setAttribute('data-mv-como', x.how);
        n.style.webkitTransitionDelay = x.at + 's';
        n.style.transitionDelay = x.at + 's';
        last = Math.max(last, x.at);
    });
    if (still) {
        return function () {};
    }
    // The life of the slide, once it is in.
    const t = TIMING[level] || TIMING.elegante;
    const stops = [];
    const settled = last + 0.8;
    if (level !== 'sobria') {
        // The channel's block too when its plane has no sky to fly (from 5 m, or on a small screen): then the sheen is its life.
        each(c.querySelectorAll('.hk-lider[data-tipo="menu"], .hk-lider[data-tipo="aviso"], .hk-tipografica, .hk-canal-sin-cielo'),
            function (b) {
                addSheen(b, settled + 0.4);
            });
        each(c.querySelectorAll('.hk-libro-grande'), function (b) {
            addSheen(b, settled + 0.2);
        });
    }
    const seconds = opts.seconds || 0;
    // The time left: under the heading of what is read for long; on the current dot of a third that turns its page.
    each(c.querySelectorAll('.hk-plazos-cabeza, .hk-tabla-cabeza'), function (h) {
        addTimeBar(h, seconds, settled, 'hk-mv-tiempo');
    });
    each(c.querySelectorAll('.hk-resto-paginas .hk-pagina-actual'), function (dot) {
        addTimeBar(dot, seconds, settled, 'hk-mv-punto');
    });
    // The flaps of a countdown turn to the day's number, a few before it (the lead's board, and the headline's at 8 m).
    each(c.querySelectorAll('.hk-marcador, .hk-tipografica-paletas'), function (board) {
        let n = '';
        each(board.querySelectorAll('.hk-paleta'), function (f) {
            n += f.textContent;
        });
        const stop = flipBoard(board, n, level, t.wait + t.step + 0.35);
        if (stop) {
            stops.push(stop);
        }
    });
    return function () {
        stops.forEach(function (s) {
            s();
        });
    };
}
