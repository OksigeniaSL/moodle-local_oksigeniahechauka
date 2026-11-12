// The birthday strip (Jujol, 12 November 2026; a party, not one more information band: Gaudí's review, the same day): whoever
// has their birthday today, all day long, in a strip above the ticker, over every composition but the big birthday slide
// (which says it bigger, cumple.js) and never on a showcase.
//
// - Its paper: a soft tint of the skin's colour with confetti printed on it, still and of little contrast; nothing like the
//   bands of the notices.
// - Its garland: a string hanging in swags between points along its top edge, the pennants tilted along it in the four
//   colours of the skin (--hk-marca-1..4). Still.
// - One person at a time: the portrait almost as high as the strip, ringed in the skin's colour (the photo, or the creature of
//   their name), «Hoy cumple años» small, the name big and the group after it (on a vertical screen, the heading over the
//   name). The next one every 8 s, and that is their moment, once: the portrait comes in with a small bounce and the pennants
//   sway, and then all is still. A screen that keeps still only fades.
//
//   <section class="hk-cumple-franja [hk-franja-mece]" data-fiesta="sobria|elegante|juguetona" data-ajuste="0…4">
//     <div class="hk-franja-papel"><svg>(the printed confetti)</svg></div>
//     <div class="hk-franja-guirnalda"><svg class="hk-franja-tramo">…</svg>… <svg class="hk-franja-nudos">…</svg></div>
//     <div class="hk-franja-pista">
//       <div class="hk-franja-persona hk-franja-dentro [hk-franja-salta]">
//         <div class="hk-cumple-cara hk-franja-cara"><img> or the creature's <svg></div>
//         <p class="hk-franja-texto"><span class="hk-franja-antetitulo">Hoy cumple años</span>
//           <span class="hk-franja-linea"><b class="hk-franja-nombre">Lucas Ferrera</b>
//             <span class="hk-franja-grupo">3.º B</span></span></p>
//       </div>…
//     </div>
//   </section>
//
// data-ajuste: 0 all in one line; 1 in one line with the name a step smaller (the strip stays low); 2 the heading over the
// name (where a vertical screen starts); 3 and the name a step smaller; 4 the name may take two lines. The strip takes the step
// its longest person needs, so it does not change height from one to the next.
//
// Chromium 56: transform and opacity only, and what moves is an element of the page (each swag is an SVG of its own), never
// the inside of a drawing; flexbox with margins.

import {face, partyOf} from './cumple.js';

/** Seconds of each person. */
export const STRIP_EACH = 8;

/** How long the moment of a person lasts (the bounce and the sway), in ms: then everything is still. */
const MOMENT_MS = 1300;

/** Seconds the strip waits when something else on the screen has just moved. */
const WAIT_BUSY = 2.5;

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

function each(list, fn) {
    for (let i = 0; i < list.length; i++) {
        fn(list[i], i);
    }
}

/** What tells one strip from another: who, in which order, with which words and pictures. */
export function stripKey(item, media) {
    if (!item || !item.people || !item.people.length) {
        return '';
    }
    return item.people.map(function (p) {
        return [p.name, p.group || '', p.kicker || '', p.photo ? (media ? media(p.photo) : '') || p.photo.url || '' : ''].join('|');
    }).join('\n');
}

function f1(n) {
    return n.toFixed(1);
}

/**
 * How the garland hangs across a width: where its points are, and each swag's pennants. Pure, so it is tested on its own.
 *
 * @param {number} w the strip's width in pixels
 * @param {number} h the garland's height in pixels (the distance's: about 48 px at 3 m on a 1080 screen)
 * @returns {{span: number, points: number[], swags: Array<{x: number, flags: Array<{x: number, y: number, a: number}>}>,
 *     top: number, ctrl: number, fw: number, fh: number}}
 */
export function garlandPlan(w, h) {
    const W = Math.max(1, w);
    const H = Math.max(1, h);
    // A point every 4.8 garland heights: some 230 px at 3 m, more from afar, as the letter grows.
    const count = Math.max(2, Math.round(W / (H * 4.8)));
    const span = W / count;
    const top = H * 0.06;
    const low = H * 0.42;
    const ctrl = 2 * low - top;
    const per = Math.max(3, Math.round(span / (H * 0.95)));
    const points = [];
    const swags = [];
    for (let s = 0; s <= count; s++) {
        points.push(s * span);
    }
    for (let s = 0; s < count; s++) {
        const flags = [];
        for (let k = 0; k < per; k++) {
            const t = (k + 0.5) / per;
            flags.push({
                x: span * t,
                y: (1 - t) * (1 - t) * top + 2 * (1 - t) * t * ctrl + t * t * top,
                // Along the string: its slope where the pennant hangs.
                a: Math.atan2(2 * (ctrl - top) * (1 - 2 * t), span),
            });
        }
        swags.push({x: s * span, flags});
    }
    return {span, points, swags, top, ctrl, fw: H * 0.5, fh: H * 0.52};
}

/**
 * The garland's markup: one SVG a swag (what sways is each of them, an element of the page), and the points where it hangs
 * in a still one over them.
 *
 * @param {number} w width in pixels
 * @param {number} h height in pixels
 * @returns {string}
 */
export function garland(w, h) {
    const p = garlandPlan(w, h);
    const H = Math.round(h);
    const S = p.span;
    let out = '';
    let n = 0;
    p.swags.forEach(function (sw, s) {
        let flags = '';
        sw.flags.forEach(function (f) {
            const c = Math.cos(f.a);
            const sn = Math.sin(f.a);
            const pts = [[f.x - c * p.fw / 2, f.y - sn * p.fw / 2], [f.x + c * p.fw / 2, f.y + sn * p.fw / 2],
                [f.x - sn * p.fh, f.y + c * p.fh]];
            flags += '<path class="hk-franja-banderin-' + (n % 4) + '" d="M' + pts.map(function (q) {
                return f1(q[0]) + ' ' + f1(q[1]);
            }).join('L') + 'Z"/>';
            n++;
        });
        out += '<svg class="hk-franja-tramo" style="left:' + f1(sw.x) + 'px;width:' + f1(S) + 'px;height:' + H +
            'px;-webkit-animation-delay:' + (s % 3) * 0.07 + 's;animation-delay:' + (s % 3) * 0.07 + 's" viewBox="0 0 ' + f1(S) +
            ' ' + H + '" aria-hidden="true"><path class="hk-franja-cuerda" d="M0 ' + f1(p.top) + 'Q' + f1(S / 2) + ' ' +
            f1(p.ctrl) + ' ' + f1(S) + ' ' + f1(p.top) + '"/>' + flags + '</svg>';
    });
    let knots = '';
    p.points.forEach(function (x) {
        knots += '<circle cx="' + f1(Math.min(Math.max(x, h * 0.09), w - h * 0.09)) + '" cy="' + f1(p.top) + '" r="' +
            f1(h * 0.08) + '"/>';
    });
    out += '<svg class="hk-franja-nudos" viewBox="0 0 ' + Math.round(w) + ' ' + H + '" width="' + Math.round(w) + '" height="' +
        H + '" aria-hidden="true">' + knots + '</svg>';
    return out;
}

/**
 * The confetti printed on the strip's paper: small pieces scattered, always the same for the same size (a fixed seed), in the
 * four colours of the skin; still.
 *
 * @param {number} w width in pixels
 * @param {number} h height in pixels
 * @param {number} unit the size of a piece, in pixels
 * @returns {string} SVG markup
 */
export function paper(w, h, unit) {
    let seed = 20261112;
    const rnd = function () {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };
    const U = Math.max(2, unit);
    const n = Math.max(6, Math.round(w * h / (U * U * 26)));
    let out = '';
    for (let i = 0; i < n; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const kind = rnd();
        const turn = Math.round(rnd() * 180);
        const cls = 'hk-franja-confeti-' + (i % 4);
        if (kind < 0.45) {
            out += '<rect class="' + cls + '" x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(U * 0.9) + '" height="' +
                f1(U * 0.38) + '" transform="rotate(' + turn + ' ' + f1(x) + ' ' + f1(y) + ')"/>';
        } else if (kind < 0.8) {
            out += '<circle class="' + cls + '" cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(U * 0.26) + '"/>';
        } else {
            out += '<path class="' + cls + ' hk-franja-serpentina" d="M' + f1(x) + ' ' + f1(y) + 'q' + f1(U * 0.35) + ' ' +
                f1(-U * 0.45) + ' ' + f1(U * 0.7) + ' 0t' + f1(U * 0.7) + ' 0"/>';
        }
    }
    return '<svg viewBox="0 0 ' + Math.round(w) + ' ' + Math.round(h) + '" width="' + Math.round(w) + '" height="' + Math.round(h) +
        '" aria-hidden="true">' + out + '</svg>';
}

/**
 * Builds the strip's people in its node.
 *
 * @param {HTMLElement} node the strip
 * @param {object} item {people: [{name, group, photo, kicker}]}
 * @param {object} o {one: the heading of one person («Hoy cumple años»), media: function (ref): url, party}
 */
export function buildStrip(node, item, o) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
    node.setAttribute('data-fiesta', partyOf(o.party));
    node.appendChild(el('div', 'hk-franja-papel'));
    node.appendChild(el('div', 'hk-franja-guirnalda'));
    const track = el('div', 'hk-franja-pista');
    (item.people || []).forEach(function (p) {
        const row = el('div', 'hk-franja-persona');
        row.appendChild(face(p, o.media, 'hk-franja-cara'));
        const t = el('p', 'hk-franja-texto');
        t.appendChild(el('span', 'hk-franja-antetitulo', p.kicker || o.one || ''));
        const line = el('span', 'hk-franja-linea');
        line.appendChild(el('b', 'hk-franja-nombre', p.name || ''));
        if (p.group) {
            line.appendChild(el('span', 'hk-franja-grupo', p.group));
        }
        t.appendChild(line);
        row.appendChild(t);
        track.appendChild(row);
    });
    node.appendChild(track);
}

/**
 * Measured in the page: the step that every person fits in (a vertical screen starts with the heading over the name), the
 * track as high as the highest, and the garland and the paper at the strip's size. False when the strip is not in sight yet
 * (it is measured again when it is).
 *
 * @param {HTMLElement} node
 * @param {object} [o] {vertical}
 * @returns {boolean}
 */
export function fitStrip(node, o) {
    if (!node.offsetWidth) {
        return false;
    }
    const people = node.querySelectorAll('.hk-franja-persona');
    const track = node.querySelector('.hk-franja-pista');
    track.style.height = '';
    const over = function () {
        let out = false;
        each(people, function (p) {
            const t = p.querySelector('.hk-franja-texto');
            if (t.scrollWidth > t.clientWidth + 1) {
                out = true;
            }
        });
        return out;
    };
    const steps = ['0', '1', '2', '3', '4'];
    for (let s = o && o.vertical ? 2 : 0; s < steps.length; s++) {
        node.setAttribute('data-ajuste', steps[s]);
        if (!over()) {
            break;
        }
    }
    let most = 0;
    each(people, function (p) {
        most = Math.max(most, p.offsetHeight);
    });
    track.style.height = most + 'px';
    const g = node.querySelector('.hk-franja-guirnalda');
    if (g) {
        g.innerHTML = garland(g.clientWidth, g.clientHeight);
    }
    const sheet = node.querySelector('.hk-franja-papel');
    if (sheet) {
        sheet.innerHTML = paper(node.clientWidth, node.clientHeight, g ? g.clientHeight * 0.36 : 16);
    }
    return true;
}

/**
 * The first person at once, and the next one every 8 s; never in the same moment as something else changes (a slide that
 * comes in, the column of the two zones): then it waits a little. Each person's coming is their moment, once: the portrait
 * bounces in and the pennants sway (CSS: .hk-franja-salta and .hk-franja-mece, which leave after it), then all is still.
 *
 * @param {HTMLElement} node
 * @param {object} [o] {busy: function (): boolean, whether something else has just moved; still: the screen keeps still}
 * @returns {function} what stops it
 */
export function startStrip(node, o) {
    const people = node.querySelectorAll('.hk-franja-persona');
    const busy = (o && o.busy) || function () {
        return false;
    };
    const still = !!(o && o.still);
    let inner = null;
    let timer = null;
    let calm = null;
    const moment = function (row) {
        if (still) {
            return;
        }
        clearTimeout(calm);
        node.classList.remove('hk-franja-mece');
        each(people, function (p) {
            p.classList.remove('hk-franja-salta');
        });
        void node.offsetWidth;
        node.classList.add('hk-franja-mece');
        row.classList.add('hk-franja-salta');
        calm = setTimeout(function () {
            node.classList.remove('hk-franja-mece');
            row.classList.remove('hk-franja-salta');
        }, MOMENT_MS);
    };
    if (!people.length) {
        return function () {};
    }
    let i = 0;
    people[0].classList.add('hk-franja-dentro');
    moment(people[0]);
    if (people.length < 2) {
        return function () {
            clearTimeout(calm);
        };
    }
    const turn = function (seconds) {
        timer = setTimeout(function () {
            if (busy()) {
                turn(WAIT_BUSY);
                return;
            }
            const old = people[i];
            i = (i + 1) % people.length;
            const fresh = people[i];
            old.classList.remove('hk-franja-dentro');
            old.classList.add('hk-franja-fuera');
            // The old one has gone before the new one comes: two names never cross.
            inner = setTimeout(function () {
                old.classList.remove('hk-franja-fuera');
                fresh.classList.add('hk-franja-dentro');
                moment(fresh);
            }, 500);
            turn(STRIP_EACH);
        }, seconds * 1000);
    };
    turn(STRIP_EACH);
    return function () {
        clearTimeout(timer);
        clearTimeout(inner);
        clearTimeout(calm);
    };
}
