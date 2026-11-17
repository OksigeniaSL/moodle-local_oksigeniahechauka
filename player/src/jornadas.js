// «Puertas abiertas»: the acts Eguahe opens to the families who are getting to know the centre (an open day, a talk, a
// festival with open sign-up), on the centre's screens (Jujol, 17 November 2026). Two faces:
//   - the days before (up to 30): an invitation in the centre's colour, the day on a calendar leaf, the hours and the place,
//     the turns (the full ones struck out), and the QR on a white card to sign up; full, its stamp instead of the QR;
//   - the day, while it lasts: the welcome, with the centre's guide (its dog) waving and its words in a bubble, the hours
//     and the turns (the one now, lit; the full ones struck out), how many families have come once they are a few, and the
//     QR for whoever arrives without having signed up.
// The colours are the skin's (the centre's), never Eguahe's. Nothing reads «and N more»: the turns go all or none.
// Chromium 56: flexbox, margins for gaps, no clamp, no aspect-ratio, no inset.
import {even} from './balance.js';
import {fitWord, linesOf} from './lead.js';

const MS_DAY = 86400000;

/** How far ahead an act shows: thirty days. */
export const OPEN_AHEAD_DAYS = 30;

// One slide in how many, by how near the act is (compose.js): while it lasts, every other one; on its day before it starts,
// one in four; its last week, one in eight; before, one in fourteen, as the networks.
export const OPEN_EVERY = {ahora: 2, hoy: 4, semana: 8, antes: 14};

// The least that makes «have already come» worth saying: a handful, never «2 families» (a half of those signed up on a
// small act, between five and ten).
const CAME_LEAST = 5;
const CAME_ENOUGH = 10;

// The most turns that are listed: more, and none is (never «and N more»).
const TURNS_MOST = {antes: 8, ahora: 6};

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

function two(n) {
    return (n < 10 ? '0' : '') + n;
}

/** «10:00» of a moment (ms), in the device's time zone. */
export function timeOf(ms) {
    const d = new Date(ms);
    return two(d.getHours()) + ':' + two(d.getMinutes());
}

/** Days between two moments' calendar days, in the device's time zone: 0 the same day, 1 the next. */
export function daysBetween(fromMs, toMs) {
    const a = new Date(fromMs);
    const b = new Date(toMs);
    return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(),
        a.getDate())) / MS_DAY);
}

/**
 * Where an act is, now: «ahora» while it lasts, «hoy» on its day before it starts, «antes» in the days before (up to
 * thirty), or null (over, or too far). Pure.
 *
 * @param {object} act {timestart, timeend} in seconds
 * @param {number} now ms
 * @returns {string|null}
 */
export function phaseOf(act, now) {
    const start = (act && act.timestart || 0) * 1000;
    const end = (act && act.timeend || 0) * 1000 || start;
    if (!start || now >= end) {
        return null;
    }
    if (now >= start) {
        return 'ahora';
    }
    const days = daysBetween(now, start);
    if (days === 0) {
        return 'hoy';
    }
    return days <= OPEN_AHEAD_DAYS ? 'antes' : null;
}

/** Whether an act can come: a name and when it starts. */
export function actShows(act) {
    return !!(act && String(act.name || '').trim() && act.timestart > 0);
}

/**
 * The acts to show now, in the order they start, each with its phase; and one slide in how many (OPEN_EVERY). While one
 * lasts, only those that last: that day the screens are theirs. Pure.
 *
 * @param {object} item the manifest's {type: 'openacts', acts: [...]}
 * @param {number} now ms
 * @returns {{acts: {act: object, phase: string}[], every: number}|null}
 */
export function openActsNow(item, now) {
    if (!item || !item.acts || !item.acts.length) {
        return null;
    }
    let list = [];
    item.acts.forEach(function (act) {
        const phase = actShows(act) ? phaseOf(act, now) : null;
        if (phase) {
            list.push({act: act, phase: phase});
        }
    });
    if (!list.length) {
        return null;
    }
    list.sort(function (a, b) {
        return a.act.timestart - b.act.timestart;
    });
    const live = list.filter(function (x) {
        return x.phase === 'ahora';
    });
    if (live.length) {
        return {acts: live, every: OPEN_EVERY.ahora};
    }
    if (list.some(function (x) {
        return x.phase === 'hoy';
    })) {
        return {acts: list, every: OPEN_EVERY.hoy};
    }
    const soon = daysBetween(now, list[0].act.timestart * 1000) <= 7;
    return {acts: list, every: soon ? OPEN_EVERY.semana : OPEN_EVERY.antes};
}

/**
 * The line over the headline, how near it is: «Hoy», «Mañana», «Este sábado», «Faltan 12 días». Pure.
 *
 * @param {object} act
 * @param {number} now ms
 * @param {object} s the screen's words: open_today, open_tomorrow, open_this ({day}), open_in ({n}), days
 * @param {boolean} [keep] the weekday as the site writes it (English, German), not in lower case
 * @returns {string}
 */
export function whenWords(act, now, s, keep) {
    const w = s || {};
    const start = act.timestart * 1000;
    const days = daysBetween(now, start);
    if (days <= 0) {
        return w.open_today || '';
    }
    if (days === 1) {
        return w.open_tomorrow || '';
    }
    const day = (w.days || [])[new Date(start).getDay()] || '';
    if (days <= 6 && day && w.open_this) {
        return w.open_this.replace('{day}', keep ? day : day.toLowerCase());
    }
    return (w.open_in || '').replace('{n}', String(days));
}

/** «10:00 – 13:00», with the screen's range when it has it, never broken inside (a line breaks before it). Pure. */
export function hoursOf(act, s) {
    const from = timeOf(act.timestart * 1000);
    if (!act.timeend || act.timeend <= act.timestart) {
        return from;
    }
    const range = (s && s.place_time_range) || '{from} – {until}';
    return range.replace('{from}', from).replace('{until}', timeOf(act.timeend * 1000)).replace(/ /g, '\u00a0');
}

/**
 * The turns as they are now: its hour and its state (full, gone, now, free). Pure.
 *
 * @param {object} act {turns: [{timestart, timeend, full}]}
 * @param {number} now ms
 * @returns {{at: string, state: string}[]}
 */
export function turnsOf(act, now) {
    return (act.turns || []).filter(function (t) {
        return t && t.timestart > 0;
    }).sort(function (a, b) {
        return a.timestart - b.timestart;
    }).map(function (t) {
        const start = t.timestart * 1000;
        const end = (t.timeend || 0) * 1000;
        let state = t.full ? 'lleno' : 'libre';
        if (end && now >= end) {
            state = 'pasado';
        } else if (now >= start && (!end || now < end)) {
            state = 'ahora';
        }
        return {at: timeOf(start), state: state};
    });
}

/** Whether every place is taken: by its capacity, or with every turn full. Pure. */
export function isFull(act) {
    if (act.capacity > 0 && act.signed >= act.capacity) {
        return true;
    }
    const turns = (act.turns || []).filter(function (t) {
        return t && t.timestart > 0;
    });
    return turns.length > 0 && turns.every(function (t) {
        return !!t.full;
    });
}

/**
 * How many places are left, when they are few enough to say it (ten or fewer, or a quarter of the capacity), else 0. Pure.
 */
export function leftToSay(act) {
    if (!(act.capacity > 0) || isFull(act)) {
        return 0;
    }
    const left = act.capacity - (act.signed || 0);
    return left > 0 && left <= Math.max(10, Math.round(act.capacity / 4)) ? left : 0;
}

/**
 * Whether «have already come» is said: from a handful of families (half of those signed up on a small act, between five
 * and ten). Pure.
 */
export function cameShows(came, signed) {
    if (typeof came !== 'number' || came < CAME_LEAST) {
        return false;
    }
    return came >= Math.max(CAME_LEAST, Math.min(CAME_ENOUGH, Math.ceil((signed || 0) / 2)));
}

/** A count in its words: {n} replaced, the «one» form for 1. Pure. */
function counted(n, many, one) {
    return (n === 1 && one ? one : many || '').replace('{n}', String(n));
}

// The calendar leaf: the weekday and the month on the leaf's band and foot, the day big.
function leafOf(act, s) {
    const d = new Date(act.timestart * 1000);
    const leaf = el('div', 'hk-pa-hoja');
    leaf.appendChild(el('span', 'hk-pa-hoja-dia', ((s.days_short || [])[d.getDay()] || '').toUpperCase()));
    leaf.appendChild(el('b', 'hk-pa-hoja-num', String(d.getDate())));
    leaf.appendChild(el('span', 'hk-pa-hoja-mes', ((s.months_short || [])[d.getMonth()] || '').toUpperCase()));
    return leaf;
}

// The turns: each hour in its chip, the full ones struck out, the one now lit.
function turnsList(turns, s) {
    const list = el('ul', 'hk-pa-turnos');
    turns.forEach(function (t) {
        const li = el('li', 'hk-pa-turno', t.at);
        li.setAttribute('data-estado', t.state);
        if (t.state === 'ahora' && s.open_now) {
            li.appendChild(el('small', '', s.open_now));
        }
        list.appendChild(li);
    });
    return list;
}

/**
 * Fills the layer with an act's slide.
 *
 * @param {HTMLElement} c the layer
 * @param {object} act one of the manifest's openacts: {kind, name, place, timestart, timeend, today, turns, web, webqr,
 *     capacity, signed, came, guide: {img, hello}, centre}
 * @param {string} phase antes, hoy or ahora
 * @param {object} o {s: the screen's words, media: a media reference to its url on the device (or null), qr: function
 *     (url, image): node (render.js's qrBox), now: Date, capitalDays: the weekday keeps its capital in a sentence}
 */
export function buildOpenAct(c, act, phase, o) {
    if (!actShows(act)) {
        return;
    }
    const s = o.s || {};
    const now = o.now ? o.now.getTime() : Date.now();
    const day = phase === 'ahora';
    const sec = el('section', 'hk-pa');
    sec.setAttribute('data-cara', day ? 'dia' : 'antes');
    sec.setAttribute('data-ajuste', '0');
    if (act.kind) {
        sec.setAttribute('data-tipo', act.kind);
    }
    // The guide, only from the device: without its picture, the welcome is said in words.
    const guide = day && act.guide && act.guide.img && o.media ? o.media(act.guide.img) : null;
    if (guide) {
        sec.classList.add('hk-pa-con-guia');
        const fig = el('figure', 'hk-pa-guia');
        if (act.guide.hello) {
            fig.appendChild(el('p', 'hk-pa-bocadillo', act.guide.hello));
        }
        const im = el('img', 'hk-pa-guia-img');
        im.alt = '';
        im.src = guide;
        fig.appendChild(im);
        sec.appendChild(fig);
    } else if (!day) {
        sec.appendChild(leafOf(act, s));
    }
    const words = el('div', 'hk-pa-texto');
    // How near and the hours, on the tag: what never goes, from any distance. The hours whole on their line.
    const tag = el('p', 'hk-pa-cuando');
    const near = day ? (s.open_today || '') : whenWords(act, now, s, o.capitalDays);
    if (near) {
        tag.appendChild(document.createTextNode(near + ' · '));
    }
    tag.appendChild(el('span', 'hk-pa-horas', hoursOf(act, s)));
    words.appendChild(tag);
    if (day && !guide && s.open_welcome) {
        words.appendChild(el('h2', 'hk-pa-titular', s.open_welcome));
        words.appendChild(el('p', 'hk-pa-nombre', act.name));
    } else {
        words.appendChild(el('h2', 'hk-pa-titular', act.name));
    }
    const facts = [];
    if (act.place) {
        facts.push(act.place);
    }
    // The centre, only when the acts are of more than one (the manifest says it then).
    if (act.centre) {
        facts.push(act.centre);
    }
    if (facts.length) {
        words.appendChild(el('p', 'hk-pa-donde', facts.join(' · ')));
    }
    const turns = turnsOf(act, now);
    if (turns.length > 1 && turns.length <= TURNS_MOST[day ? 'ahora' : 'antes']) {
        words.appendChild(turnsList(turns, s));
    }
    const full = isFull(act);
    if (day && cameShows(act.came, act.signed)) {
        words.appendChild(el('p', 'hk-pa-vinieron', counted(act.came, s.open_came, s.open_came_one)));
    } else if (!day && !full) {
        const left = leftToSay(act);
        if (left) {
            words.appendChild(el('p', 'hk-pa-quedan', counted(left, s.open_left, s.open_left_one)));
        }
    }
    sec.appendChild(words);
    // The card: the QR to sign up (the day, for whoever comes without having done it). Full before the day, its stamp.
    const side = el('div', 'hk-pa-lado');
    if (!day && full) {
        side.appendChild(el('p', 'hk-pa-completo', s.open_full || ''));
        sec.classList.add('hk-pa-lleno');
    } else if (act.web && /^https?:\/\/\S+$/i.test(act.web)) {
        const card = el('div', 'hk-pa-tarjeta');
        const ask = day ? [s.open_walkin, s.open_walkin_do] : [s.open_signup];
        if (ask[0]) {
            card.appendChild(el('p', 'hk-pa-tarjeta-t', ask[0]));
        }
        if (ask[1]) {
            card.appendChild(el('p', 'hk-pa-tarjeta-sub', ask[1]));
        }
        const qr = o.qr(act.web, act.webqr);
        if (qr && qr.nodeType === 1) {
            if (qr.querySelector('img')) {
                qr.classList.add('hk-qr-imagen');
            }
            card.appendChild(qr);
        }
        side.appendChild(card);
    }
    if (side.firstChild) {
        sec.appendChild(side);
    }
    c.appendChild(sec);
}

// Whether the words fit their column, and the whole slide its body: nothing beyond a foot or a side, the headline in its
// lines.
function wordsFit(sec, most) {
    const text = sec.querySelector('.hk-pa-texto');
    const title = sec.querySelector('.hk-pa-titular');
    // The guide's words in their bubble, never over the card, and never taking more than half of the guide's column.
    const bubble = sec.querySelector('.hk-pa-bocadillo');
    if (bubble && bubble.offsetWidth && (bubble.scrollWidth > bubble.clientWidth + 1 ||
            bubble.offsetHeight > bubble.parentNode.clientHeight * 0.5)) {
        return false;
    }
    // A couple of pixels of the headline's descenders and the turns' rounding are not an overflow.
    return text.scrollHeight <= text.clientHeight + 3 && text.scrollWidth <= text.clientWidth + 1 &&
        sec.scrollHeight <= sec.clientHeight + 1 &&
        (!title || (linesOf(title) <= most && title.scrollWidth <= title.clientWidth + 1));
}

// The card's question in its width, in two lines at most: a step smaller each time, down to two thirds (it is read from a
// step away, as the code).
function fitCardTitle(sec) {
    const t = sec.querySelector('.hk-pa-tarjeta-t');
    if (!t) {
        return;
    }
    t.style.fontSize = '';
    const size = parseFloat(window.getComputedStyle(t).fontSize);
    for (let k = 1; k <= 6 && (t.scrollWidth > t.clientWidth + 1 || linesOf(t) > 2); k++) {
        t.style.fontSize = Math.round(size * (1 - k * 0.055) * 10) / 10 + 'px';
    }
}

// Whether the card fits its column.
function cardFits(sec) {
    const side = sec.querySelector('.hk-pa-lado');
    const card = sec.querySelector('.hk-pa-tarjeta');
    if (!side || !card) {
        return true;
    }
    return card.offsetHeight <= side.clientHeight + 1 && card.offsetWidth <= side.clientWidth + 1;
}

/**
 * Once in the page: the words take the biggest of their six steps that fits; then the QR gets a little smaller (to 84, 76
 * and 68 %, still read from a step away) before anything goes; and then what says least goes first (the places left or the
 * families come, then the turns, all of them, then the place, and from afar the guide's bubble, the guide, when its column
 * leaves the words too narrow, and last the leaf: the tag above the headline still says the day and the hours). The guide's picture takes what its column leaves, whole.
 *
 * @param {HTMLElement} c the layer
 * @param {boolean} horizontal
 */
export function fitOpenAct(c, horizontal) {
    const sec = c.querySelector('.hk-pa');
    if (!sec) {
        return;
    }
    const title = sec.querySelector('.hk-pa-titular');
    // The headline in three lines; from 8 m, where its letters are biggest, in four.
    const most = sec.closest('[data-distancia="8"]') ? 4 : 3;
    const drops = [[], ['hk-pa-sin-nota'], ['hk-pa-sin-nota', 'hk-pa-sin-turnos'],
        ['hk-pa-sin-nota', 'hk-pa-sin-turnos', 'hk-pa-sin-donde'],
        ['hk-pa-sin-nota', 'hk-pa-sin-turnos', 'hk-pa-sin-donde', 'hk-pa-sin-bocadillo'],
        ['hk-pa-sin-nota', 'hk-pa-sin-turnos', 'hk-pa-sin-donde', 'hk-pa-sin-bocadillo', 'hk-pa-sin-guia'],
        ['hk-pa-sin-nota', 'hk-pa-sin-turnos', 'hk-pa-sin-donde', 'hk-pa-sin-bocadillo', 'hk-pa-sin-guia', 'hk-pa-sin-hoja']];
    // The code's own side (its address goes under it at the card's width).
    const code = sec.querySelector('.hk-pa-tarjeta .hk-qr svg, .hk-pa-tarjeta .hk-qr img');
    const wanted = code ? Math.round(code.getBoundingClientRect().width) : 0;
    const put = function (n, step, qr) {
        drops[drops.length - 1].forEach(function (cls) {
            sec.classList.remove(cls);
        });
        drops[n].forEach(function (cls) {
            sec.classList.add(cls);
        });
        sec.setAttribute('data-ajuste', String(step));
        if (qr) {
            sec.style.setProperty('--hk-pa-qr', qr + 'px');
        } else {
            sec.style.removeProperty('--hk-pa-qr');
        }
        if (title) {
            even(title);
        }
    };
    fitCardTitle(sec);
    const sizes = wanted ? [0, Math.round(wanted * 0.84), Math.round(wanted * 0.76), Math.round(wanted * 0.68)] : [0];
    for (let n = 0; n < drops.length; n++) {
        for (let q = 0; q < sizes.length; q++) {
            for (let step = 0; step <= 5; step++) {
                put(n, step, sizes[q]);
                if (wordsFit(sec, most) && cardFits(sec)) {
                    return;
                }
            }
        }
    }
    if (title) {
        fitWord(title);
    }
}
