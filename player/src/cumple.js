// «Hoy cumplen años», a slide of its own where each person has their moment (Gaudí, 7 November 2026; replaces the grid
// of 2 November). Enrique: «a veces habrá muchos, a veces pocos, a veces ninguno, pero cada persona debe tener su
// momento», and «a este panel le falta acción, movimiento, efectos».
//
// - Nobody: there is no slide (birthdaysShow says so, for the composer).
// - One to three, the stage: each person alone and big, their photo or creature in a large circle, the name huge and the
//   group under it; a burst of paper confetti from behind the face as they come in, the garland swaying above. With two
//   or three, at the end, a group photo with all of them.
// - Four or more, the parade: one at a time in the centre and the rest in small circles hanging from the garland, which
//   moves on to the next; whoever's turn it is comes down from the garland, grows, and goes back up. At most six in a
//   slide; the next time it goes on where it stopped, so through the day everybody has their moment (cumple-turnos.js).
// - The party: confetti in one canvas (80 pieces at most), balloons rising slowly at the back, a shine across the name.
//   How much, the skin says (--hk-fiesta: sobria, elegante or juguetona; the screen may choose its own); a screen that
//   keeps still (.hk-quieto, or the system's reduced motion) only fades from one to the next.
//
// Chromium 56: transform and opacity only, flexbox with margins, no gap, no aspect-ratio, no inset; the shine with the
// Web Animations API of Chrome 56 (element.animate, onfinish), and without it, no shine.

import {even} from './balance.js';
import {bichito} from './bichito.js';
import {Confetti, LEVELS, balloonsHtml, coloursOf, contrast, levelOf, lighter, readable} from './confeti.js';
import {ALONE, GROUP, PARADE_EACH, PARADE_INTRO, STAGE_EACH, STAGE_INTRO, birthdaysSeconds, birthdaysShow, dayOf, keepNext,
    modeOf, orderOf, peopleOf, startOf, storeOf} from './cumple-turnos.js';

export {birthdaysSeconds, birthdaysShow};

// Garland swags at each side of the parade's people, so the string runs across the whole slide wherever it is.
const PADS = 6;
// Who comes out first in the parade has, at most, this many already on the garland to their left.
const LEFT = 3;
// The device's own: localStorage, or memory for as long as the page lasts.
const DEVICE = storeOf();

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

/** The initials of a name: the first letter of its first two words. */
export function initialsOf(name) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(function (w) {
        return w.charAt(0).toUpperCase();
    }).join('');
}

/**
 * How much party: the screen's choice (data-fiesta on <html>), else the skin's (--hk-fiesta), else «elegante».
 *
 * @param {string} [chosen] an explicit choice, over both
 * @returns {string} sobria, elegante or juguetona
 */
export function partyOf(chosen) {
    if (chosen) {
        return levelOf(chosen);
    }
    const html = document.documentElement;
    const set = html.getAttribute('data-fiesta');
    if (set) {
        return levelOf(set);
    }
    return levelOf(getComputedStyle(html).getPropertyValue('--hk-fiesta'));
}

let copies = 0;

// The face: the photo, or the creature of their name when there is none or it does not arrive. Never an empty circle.
function face(p, media, cls) {
    const f = el('div', 'hk-cumple-cara' + (cls ? ' ' + cls : ''));
    const src = p.photo ? (media ? media(p.photo) : null) || p.photo.url || (typeof p.photo === 'string' ? p.photo : null) : null;
    const creature = function () {
        f.classList.add('is-bichito');
        // The creature's ids come from the name, and the same name is on the slide more than once (on the garland, in
        // its moment, in the group photo): each copy gets its own, or a hidden copy would clip away the visible one.
        copies++;
        f.innerHTML = bichito(p.name, document.documentElement.getAttribute('data-tema') === 'oscuro')
            .replace(/(hk\d+_)/g, '$1' + copies + '_');
    };
    if (src) {
        const im = el('img');
        im.alt = '';
        im.onerror = function () {
            if (im.parentNode === f) {
                f.removeChild(im);
            }
            creature();
        };
        im.src = src;
        f.appendChild(im);
    } else {
        creature();
    }
    return f;
}

// The name, with a copy of it for the shine, hidden until it passes.
function nameOf(text, cls) {
    const n = el('p', 'hk-cumple-nombre' + (cls ? ' ' + cls : ''));
    n.appendChild(el('span', 'hk-cumple-nombre-texto', text));
    const band = el('span', 'hk-cumple-brillo');
    band.setAttribute('aria-hidden', 'true');
    band.appendChild(el('span', '', text));
    n.appendChild(band);
    return n;
}

// The name's lines evened out (the player's even()), and the shine's copy with the same breaks.
function evenName(name) {
    const text = name.querySelector('.hk-cumple-nombre-texto');
    if (!text) {
        even(name);
        return;
    }
    even(text);
    const copy = name.querySelector('.hk-cumple-brillo > span');
    if (copy) {
        copy.innerHTML = text.innerHTML;
    }
}

// Back to the words as they came, before measuring again.
function plainName(name) {
    const text = name.querySelector('.hk-cumple-nombre-texto') || name;
    if (text.hkWords !== undefined) {
        text.textContent = text.hkWords;
    }
}

// One swag of the stage's garland, its own SVG so that each sways on its own. Flags in the skin's colours.
function swag(tone0, width) {
    const W = 460;
    const top = 8;
    const low = 84;
    const mx = W / 2;
    const flags = 8;
    let shapes = '';
    for (let k = 0; k < flags; k++) {
        const t = (k + 0.5) / flags;
        const x = 2 * (1 - t) * t * mx + t * t * W;
        const y = (1 - t) * (1 - t) * top + 2 * (1 - t) * t * low + t * t * top;
        const a = Math.atan2(2 * (1 - t) * (low - top) + 2 * t * (top - low), W);
        const c = Math.cos(a);
        const s = Math.sin(a);
        const w = 21;
        const h = 52;
        const p = [[x - c * w, y - s * w], [x + c * w, y + s * w], [x - s * h, y + c * h]];
        shapes += '<path class="hk-banderin-' + ((tone0 + k) % 4) + '" d="M' + p.map(function (q) {
            return q[0].toFixed(1) + ' ' + q[1].toFixed(1);
        }).join('L') + 'Z"/>';
    }
    return '<svg class="hk-cumple-tramo" style="width:' + width + '%" viewBox="0 0 ' + W + ' 150" aria-hidden="true">' + shapes +
        '<path class="hk-guirnalda-cuerda" d="M0 ' + top + 'Q' + mx + ' ' + low + ' ' + W + ' ' + top + '"/></svg>';
}

// One link of the parade's string: a swag with two flags at each side and the hook in its middle, where a person hangs.
function link(tone0, center) {
    const W = 210;
    const top = 8;
    const low = 70;
    let shapes = '';
    const at = center ? [0.14, 0.3, 0.5, 0.7, 0.86] : [0.14, 0.3, 0.7, 0.86];
    at.forEach(function (t, k) {
        const x = 2 * (1 - t) * t * (W / 2) + t * t * W;
        const y = (1 - t) * (1 - t) * top + 2 * (1 - t) * t * low + t * t * top;
        const a = Math.atan2(2 * (1 - t) * (low - top) + 2 * t * (top - low), W);
        const c = Math.cos(a);
        const s = Math.sin(a);
        const w = 13;
        const h = 32;
        const p = [[x - c * w, y - s * w], [x + c * w, y + s * w], [x - s * h, y + c * h]];
        shapes += '<path class="hk-banderin-' + ((tone0 + k) % 4) + '" d="M' + p.map(function (q) {
            return q[0].toFixed(1) + ' ' + q[1].toFixed(1);
        }).join('L') + 'Z"/>';
    });
    return '<svg viewBox="0 0 ' + W + ' 100" aria-hidden="true">' + shapes + '<path class="hk-guirnalda-cuerda" d="M0 ' + top +
        'Q' + W / 2 + ' ' + low + ' ' + W + ' ' + top + '"/></svg>';
}

function moment(p, o, kicker) {
    const m = el('article', 'hk-cumple-momento');
    m.appendChild(face(p, o.media, 'hk-cumple-cara-grande'));
    const t = el('div', 'hk-cumple-texto');
    t.appendChild(el('p', 'hk-cumple-antetitulo', kicker));
    t.appendChild(nameOf(p.name));
    if (p.group) {
        t.appendChild(el('p', 'hk-cumple-grupo', p.group));
    }
    m.appendChild(t);
    return m;
}

/**
 * Builds the slide in the layer.
 *
 * @param {HTMLElement} c the layer
 * @param {object} item {people: [{id, name, group, photo, kicker}]}
 * @param {number} page the composer's turn (used only when the device keeps nothing)
 * @param {object} o {distance, horizontal, glass, one, many, cheers, media: function (ref): url, still, party, today,
 *     store}
 */
export function buildBirthdays(c, item, page, o) {
    const people = peopleOf(item);
    const n = people.length;
    const mode = modeOf(n);
    const s = el('section', 'hk-cumple');
    c.appendChild(s);
    if (!mode) {
        return;
    }
    const level = partyOf(o.party);
    const store = o.store || DEVICE;
    const today = o.today || dayOf();
    s.setAttribute('data-modo', mode);
    s.setAttribute('data-fiesta', level);
    s.setAttribute('data-n', String(Math.min(n, 9)));
    if (o.still) {
        s.classList.add('is-quieto');
    }
    s.insertAdjacentHTML('beforeend', balloonsHtml(level, !!o.still));
    const scene = el('div', 'hk-cumple-escena');
    const plan = {mode: mode, people: people, store: store, today: today, order: [], strip: [], left: 0};
    if (mode === 'escenario') {
        const g = el('div', 'hk-cumple-guirnalda');
        const swags = o.horizontal ? (o.distance === 8 ? 5 : 4) : 2;
        let html = '';
        for (let i = 0; i < swags; i++) {
            html += swag(i * 3, (100 / swags).toFixed(3));
        }
        g.innerHTML = html;
        s.appendChild(g);
        plan.order = orderOf(n, 0);
        plan.order.forEach(function (i) {
            // Each moment is one person's: the heading in the singular, or the one of their day (the weekend's, on Friday).
            scene.appendChild(moment(people[i], o, people[i].kicker || o.one));
        });
        if (n > 1) {
            // The group photo: all of them together, each with their name.
            const shot = el('div', 'hk-cumple-foto');
            shot.appendChild(nameOf(o.cheers || o.many, 'hk-cumple-titulo'));
            const row = el('div', 'hk-cumple-fila');
            plan.order.forEach(function (i) {
                const f = el('figure', 'hk-cumple-retrato');
                f.appendChild(face(people[i], o.media, ''));
                f.appendChild(el('p', 'hk-cumple-nombre hk-cumple-nombre-foto', people[i].name));
                if (people[i].group) {
                    f.appendChild(el('p', 'hk-cumple-grupo', people[i].group));
                }
                row.appendChild(f);
            });
            shot.appendChild(row);
            scene.appendChild(shot);
        }
    } else {
        const from = startOf(people, today, store, page);
        plan.order = orderOf(n, from);
        // The string: everybody once, from a few before the first of this slide, and empty swags at both ends.
        plan.left = Math.min(LEFT, n - plan.order.length);
        for (let j = 0; j < n; j++) {
            plan.strip.push((from - plan.left + j + n * 2) % n);
        }
        const cord = el('div', 'hk-cumple-cuerda');
        const strip = el('div', 'hk-cumple-tira');
        const pad = function (k) {
            const u = el('div', 'hk-cumple-eslabon is-solo');
            u.innerHTML = link(k, true);
            strip.appendChild(u);
        };
        for (let k = 0; k < PADS; k++) {
            pad(k);
        }
        plan.strip.forEach(function (i, j) {
            const u = el('div', 'hk-cumple-eslabon');
            u.innerHTML = link(j + 1, false);
            const hang = el('div', 'hk-cumple-adorno');
            hang.style.webkitAnimationDelay = hang.style.animationDelay = (-(j * 0.73) % 3).toFixed(2) + 's';
            hang.appendChild(el('span', 'hk-cumple-pinza'));
            hang.appendChild(face(people[i], o.media, ''));
            u.appendChild(hang);
            strip.appendChild(u);
        });
        for (let k = 0; k < PADS; k++) {
            pad(k + 2);
        }
        cord.appendChild(strip);
        s.appendChild(cord);
        plan.order.forEach(function (i) {
            scene.appendChild(moment(people[i], o, people[i].kicker || o.one));
        });
    }
    const canvas = el('canvas', 'hk-cumple-confeti');
    canvas.setAttribute('aria-hidden', 'true');
    s.appendChild(canvas);
    s.appendChild(scene);
    s.hkPlan = plan;
}

// The fit of a name: a step smaller each time, until it is in its lines and its box, never under the last step.
const STEPS = ['', '1', '2', '3', '4'];

function fitName(name, box, lines) {
    const fits = function () {
        const lh = parseFloat(getComputedStyle(name).lineHeight) || name.offsetHeight;
        return name.scrollWidth <= name.clientWidth + 1 && Math.round(name.offsetHeight / lh) <= lines &&
            box.scrollHeight <= box.clientHeight + 1;
    };
    for (let i = 0; i < STEPS.length; i++) {
        if (STEPS[i]) {
            name.setAttribute('data-ajuste', STEPS[i]);
        } else {
            name.removeAttribute('data-ajuste');
        }
        if (fits()) {
            return;
        }
    }
}

/**
 * Once in the page (and again when the letters arrive): each name at the largest size that fits.
 *
 * @param {HTMLElement} c the layer
 */
export function fitBirthdays(c) {
    const s = c.querySelector('.hk-cumple');
    if (!s || !s.hkPlan) {
        return;
    }
    const vertical = s.clientHeight > s.clientWidth;
    const moments = s.querySelectorAll('.hk-cumple-momento');
    for (let i = 0; i < moments.length; i++) {
        const name = moments[i].querySelector('.hk-cumple-nombre');
        plainName(name);
        fitName(name, moments[i], vertical ? 4 : 3);
        evenName(name);
    }
    const shot = s.querySelector('.hk-cumple-foto');
    if (shot) {
        const names = shot.querySelectorAll('.hk-cumple-nombre-foto');
        // The same size for all of them: the one that fits the longest.
        let worst = 0;
        for (let i = 0; i < names.length; i++) {
            plainName(names[i]);
            names[i].removeAttribute('data-ajuste');
        }
        for (let step = 0; step < STEPS.length; step++) {
            let ok = true;
            for (let i = 0; i < names.length; i++) {
                if (STEPS[step]) {
                    names[i].setAttribute('data-ajuste', STEPS[step]);
                }
                const lh = parseFloat(getComputedStyle(names[i]).lineHeight) || 1;
                if (names[i].scrollWidth > names[i].clientWidth + 1 || Math.round(names[i].offsetHeight / lh) > 3) {
                    ok = false;
                }
            }
            worst = step;
            if (ok && shot.scrollHeight <= shot.clientHeight + 1) {
                break;
            }
        }
        shot.setAttribute('data-ajuste', String(worst));
        for (let i = 0; i < names.length; i++) {
            evenName(names[i]);
        }
    }
}

// What happens at its time, all stopped at once.
function Timeline() {
    this.timers = [];
}
Timeline.prototype.when = function (seconds, fn) {
    this.timers.push(setTimeout(fn, Math.round(seconds * 1000)));
};
Timeline.prototype.stop = function () {
    this.timers.forEach(clearTimeout);
    this.timers = [];
};

// The shine: each band is a narrow window that crosses the name, with a copy of the name inside that crosses it the
// other way, so the copy stays on the letters and only the band moves. Both by transform, on the compositor.
function shineOf(name, colour) {
    const bands = name.querySelectorAll('.hk-cumple-brillo');
    const text = name.querySelector('.hk-cumple-nombre-texto');
    if (!bands.length || !text || !bands[0].animate) {
        return null;
    }
    const w = name.clientWidth;
    for (let i = 0; i < bands.length; i++) {
        const copy = bands[i].firstChild;
        copy.style.width = w + 'px';
        copy.style.color = colour;
    }
    let running = [];
    return {
        play: function () {
            running.forEach(function (a) {
                a.cancel();
            });
            running = [];
            name.classList.add('is-brilla');
            const travel = name.clientWidth + name.clientHeight * 0.4;
            for (let i = 0; i < bands.length; i++) {
                const band = bands[i];
                const width = band.offsetWidth;
                const from = -width;
                const to = travel;
                const timing = {duration: 1600, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'both'};
                running.push(band.animate([
                    {transform: 'translateX(' + from + 'px) skewX(-18deg)'},
                    {transform: 'translateX(' + to + 'px) skewX(-18deg)'},
                ], timing));
                running.push(band.firstChild.animate([
                    {transform: 'skewX(18deg) translateX(' + (-from) + 'px)'},
                    {transform: 'skewX(18deg) translateX(' + (-to) + 'px)'},
                ], timing));
            }
        },
        stop: function () {
            running.forEach(function (a) {
                a.cancel();
            });
            running = [];
        },
    };
}

function centreOf(node, within) {
    const a = node.getBoundingClientRect();
    const b = within.getBoundingClientRect();
    return {x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2, r: a.width / 2};
}

/**
 * Once the layer is in the page, with its letters: the party starts, and it says how long the slide lasts. c.hkStop
 * stops all of it.
 *
 * @param {HTMLElement} c the layer
 * @param {object} o {still}
 * @returns {number} seconds
 */
export function startBirthdays(c, o) {
    const s = c.querySelector('.hk-cumple');
    if (!s || !s.hkPlan) {
        return 0;
    }
    if (s.hkSeconds) {
        return s.hkSeconds;
    }
    const plan = s.hkPlan;
    const still = !!(o && o.still) || s.classList.contains('is-quieto');
    s.classList.toggle('is-quieto', still);
    const level = s.getAttribute('data-fiesta');
    const tl = new Timeline();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
    const canvas = s.querySelector('.hk-cumple-confeti');
    const confetti = !still && canvas.getContext ? new Confetti(canvas, {colours: coloursOf(s, level), level: level, rem: rem}) : null;
    const cs = getComputedStyle(s);
    const ground = (cs.getPropertyValue('--hk-primario') || '').trim();
    const ink = (cs.getPropertyValue('--hk-sobre-primario') || '#ffffff').trim();
    const accent = (cs.getPropertyValue('--hk-acento') || '').trim();
    // The kicker in the accent, a little lighter if it takes that to read at 4.5:1 on the ground; if not even so, in the
    // text's colour.
    const kicker = accent ? readable(accent, ground, 4.5, 0.4) : null;
    if (!kicker) {
        s.classList.add('is-antetitulo-claro');
    } else if (kicker !== accent) {
        s.style.setProperty('--hk-cumple-antetitulo', kicker);
    }
    // The shine: the accent, lightened, unless it is too close to the name's own colour; while it crosses the name, the name
    // still reads at 4.5:1.
    const glint = readable(accent && contrast(accent, ink) >= 1.25 ? lighter(accent, 0.25) : lighter(ground, 0.6), ground, 4.5) ||
        ink;
    const shines = [];
    const shine = function (name) {
        if (still || !name) {
            return;
        }
        const sh = shineOf(name, glint);
        if (sh) {
            shines.push(sh);
            sh.play();
        }
    };
    const moments = s.querySelectorAll('.hk-cumple-momento');
    const burstAt = function (node, n) {
        if (confetti && node) {
            const p = centreOf(node, s);
            confetti.burst(p.x, p.y, n, p.r);
        }
    };
    let seconds = birthdaysSeconds({people: plan.people});
    tl.when(0.05, function () {
        s.classList.add('is-lista');
    });
    if (plan.mode === 'escenario') {
        const n = plan.order.length;
        const show = function (m, k) {
            m.classList.add('is-dentro');
            tl.when(0.55, function () {
                burstAt(m.querySelector('.hk-cumple-cara-grande'));
            });
            tl.when(1.25, function () {
                shine(m.querySelector('.hk-cumple-nombre'));
            });
            return k;
        };
        if (n === 1) {
            tl.when(STAGE_INTRO, function () {
                show(moments[0]);
            });
            // A long moment: the shine comes back, and a second, smaller burst halfway.
            tl.when(STAGE_INTRO + 5.2, function () {
                shine(moments[0].querySelector('.hk-cumple-nombre'));
                if (LEVELS[level].again) {
                    burstAt(moments[0].querySelector('.hk-cumple-cara-grande'), LEVELS[level].again);
                }
            });
            tl.when(STAGE_INTRO + 8.9, function () {
                shine(moments[0].querySelector('.hk-cumple-nombre'));
            });
            seconds = ALONE;
        } else {
            for (let k = 0; k < n; k++) {
                (function (k) {
                    tl.when(STAGE_INTRO + k * STAGE_EACH, function () {
                        show(moments[k]);
                    });
                    tl.when(STAGE_INTRO + (k + 1) * STAGE_EACH - 0.45, function () {
                        moments[k].classList.remove('is-dentro');
                        moments[k].classList.add('is-fuera');
                    });
                })(k);
            }
            const shot = s.querySelector('.hk-cumple-foto');
            const at = STAGE_INTRO + n * STAGE_EACH;
            tl.when(at, function () {
                shot.classList.add('is-dentro');
                if (confetti) {
                    confetti.rain();
                }
            });
            tl.when(at + 1.1, function () {
                shine(shot.querySelector('.hk-cumple-titulo'));
            });
            seconds = Math.round(at + GROUP);
        }
    } else {
        seconds = parade(s, plan, moments, tl, confetti, shine, still);
    }
    s.hkSeconds = seconds;
    c.hkStop = function () {
        tl.stop();
        if (confetti) {
            confetti.stop();
        }
        shines.forEach(function (sh) {
            sh.stop();
        });
    };
    return seconds;
}

// The parade: the string comes in, and then, for each person, down from the garland, a moment, back up, and the string
// moves on to the next one.
function parade(s, plan, moments, tl, confetti, shine, still) {
    const strip = s.querySelector('.hk-cumple-tira');
    const cord = s.querySelector('.hk-cumple-cuerda');
    const links = strip.querySelectorAll('.hk-cumple-eslabon');
    const unit = links[0].offsetWidth;
    const at = function (j) {
        return Math.round(cord.clientWidth / 2 - (PADS + j + 0.5) * unit);
    };
    const move = function (x, smooth, first) {
        strip.classList.toggle('is-avanza', !!smooth && !still && !first);
        strip.classList.toggle('is-entra', !!smooth && !still && !!first);
        strip.style.webkitTransform = strip.style.transform = 'translate3d(' + x + 'px,0,0)';
    };
    // It comes in from the right, already moving.
    move(at(plan.left) + Math.round(cord.clientWidth * 0.7), false);
    void strip.offsetWidth;
    tl.when(0.15, function () {
        move(at(plan.left), true, true);
    });
    const rect = function (node) {
        return node.getBoundingClientRect();
    };
    plan.order.forEach(function (who, k) {
        const j = plan.left + k;
        const hang = links[PADS + j].querySelector('.hk-cumple-adorno');
        const small = hang.querySelector('.hk-cumple-cara');
        const m = moments[k];
        const big = m.querySelector('.hk-cumple-cara-grande');
        const t0 = PARADE_INTRO + k * PARADE_EACH;
        // From the small circle to the big one, and back: the difference, as a transform of the big one.
        const offset = function () {
            big.style.webkitTransition = big.style.transition = 'none';
            big.style.webkitTransform = big.style.transform = 'none';
            const b = rect(big);
            const a = rect(small);
            const sc = a.width / b.width;
            return 'translate3d(' + Math.round(a.left + a.width / 2 - b.left - b.width / 2) + 'px,' +
                Math.round(a.top + a.height / 2 - b.top - b.height / 2) + 'px,0) scale(' + sc.toFixed(4) + ')';
        };
        tl.when(t0, function () {
            if (!still) {
                const from = offset();
                big.style.webkitTransform = big.style.transform = from;
                void big.offsetWidth;
                big.style.webkitTransition = big.style.transition = '';
                big.style.webkitTransform = big.style.transform = '';
            }
            hang.classList.add('is-vacio');
            m.classList.add('is-dentro');
        });
        tl.when(t0 + 0.45, function () {
            m.classList.add('is-texto');
        });
        tl.when(t0 + 0.6, function () {
            if (confetti) {
                const p = centreOf(big, s);
                confetti.burst(p.x, p.y, null, p.r);
            }
        });
        tl.when(t0 + 1.2, function () {
            shine(m.querySelector('.hk-cumple-nombre'));
        });
        tl.when(t0 + 3.45, function () {
            m.classList.remove('is-texto');
        });
        tl.when(t0 + 3.55, function () {
            if (still) {
                m.classList.remove('is-dentro');
                return;
            }
            // Back up to the garland, quickening as it goes.
            big.style.webkitTransition = big.style.transition = 'none';
            big.style.webkitTransform = big.style.transform = 'none';
            const to = offset();
            void big.offsetWidth;
            big.style.webkitTransition = big.style.transition = 'transform .55s cubic-bezier(.55,0,.8,.3)';
            big.style.webkitTransform = big.style.transform = to;
        });
        tl.when(t0 + 4.1, function () {
            hang.classList.remove('is-vacio');
            m.classList.remove('is-dentro');
            big.style.webkitTransition = big.style.transition = 'none';
            keepNext(plan.people, plan.today, plan.store, who);
            if (k < plan.order.length - 1) {
                move(at(j + 1), true);
            }
        });
    });
    return birthdaysSeconds({people: plan.people});
}
