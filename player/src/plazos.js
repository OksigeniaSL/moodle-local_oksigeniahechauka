// «Entregas de esta semana»: what falls due in the courses. What no other signage knows, and above all for universities and
// academies: someone goes by, looks for their course, and if it is theirs they stop. So the course is what is read first, its day
// beside it, in rows that can be run down at a walk. How many fit depends on the distance it is read from; the composer sends the
// next page with the next turn. Gaudí, 2 November 2026.

import {dayLabel} from './agenda.js';
import {stage} from './today.js';

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

// Measured on the real sheets with long names: horizontal and vertical, by the distance it is read from; behind glass, fewer.
const PER_PAGE = {h: {3: 7, 5: 5, 8: 4}, v: {3: 8, 5: 6, 8: 4}};
const PER_PAGE_GLASS = {h: {3: 6, 5: 4, 8: 3}, v: {3: 7, 5: 5, 8: 3}};

/**
 * How many dates fit on a page.
 *
 * @param {number} distance 3, 5 or 8
 * @param {boolean} horizontal
 * @param {boolean} [glass]
 * @returns {number}
 */
export function deadlinesPerPage(distance, horizontal, glass) {
    const table = glass ? PER_PAGE_GLASS : PER_PAGE;
    return table[horizontal ? 'h' : 'v'][distance] || table[horizontal ? 'h' : 'v'][3];
}

/**
 * Every date of the item, in its order, each with its day.
 *
 * @param {object} [item] {days: [{date, items}]}
 * @returns {object[]}
 */
export function deadlinesFlat(item) {
    const out = [];
    ((item && item.days) || []).forEach(function (d) {
        (d.items || []).forEach(function (x) {
            out.push({date: d.date, course: x.course, activity: x.activity, kind: x.kind, time: x.time, color: x.color});
        });
    });
    return out;
}

/**
 * How many pages the item takes.
 *
 * @param {object} [item]
 * @param {number} distance
 * @param {boolean} horizontal
 * @param {boolean} [glass]
 * @returns {number}
 */
export function deadlinesPages(item, distance, horizontal, glass) {
    return Math.max(1, Math.ceil(deadlinesFlat(item).length / deadlinesPerPage(distance, horizontal, glass)));
}

/**
 * A page of dates, by days: a day cut by the page comes again on the next one, with its name.
 *
 * @param {object} [item]
 * @param {number} page any number: it goes round
 * @param {number} perPage
 * @returns {{at: number, of: number, days: object[]}}
 */
export function deadlinesPage(item, page, perPage) {
    const all = deadlinesFlat(item);
    const of = Math.max(1, Math.ceil(all.length / perPage));
    const at = ((page % of) + of) % of;
    const days = [];
    all.slice(at * perPage, (at + 1) * perPage).forEach(function (x) {
        const last = days[days.length - 1];
        if (last && last.date === x.date) {
            last.items.push(x);
        } else {
            days.push({date: x.date, items: [x]});
        }
    });
    return {at, of, days};
}

/**
 * The hour, when it says something. «23:59» and «00:00» only mean «that day», and the day is already there.
 *
 * @param {string} [time] «HH:MM»
 * @returns {string}
 */
export function deadlineTime(time) {
    return !time || time === '23:59' || time === '00:00' ? '' : time;
}

/**
 * The slide.
 *
 * @param {HTMLElement} c the layer
 * @param {object} [item] {label, words: {due, quiz}, days}
 * @param {number} page
 * @param {object} o {distance, horizontal, glass, today: «YYYY-MM-DD», s: the screen's words}
 */
export function buildDeadlines(c, item, page, o) {
    const per = deadlinesPerPage(o.distance, o.horizontal, o.glass);
    const p = deadlinesPage(item, page, per);
    const words = (item && item.words) || {};
    const s = el('section', 'hk-plazos');
    const count = p.days.reduce(function (n, d) {
        return n + d.items.length;
    }, 0);
    s.setAttribute('data-filas', String(count));
    // Few for what a page holds: then they can be large. A full page of three, from afar, is not few.
    if (count <= Math.min(3, Math.floor(per / 2))) {
        s.setAttribute('data-pocas', '');
    }
    const head = el('header', 'hk-plazos-cabeza');
    head.appendChild(el('h2', 'hk-plazos-titulo', (item && item.label) || ''));
    if (p.of > 1) {
        const n = el('p', 'hk-plazos-pagina');
        n.appendChild(el('b', '', String(p.at + 1)));
        n.appendChild(document.createTextNode('/' + p.of));
        head.appendChild(n);
    }
    s.appendChild(head);
    const list = el('div', 'hk-plazos-lista');
    p.days.forEach(function (d) {
        const day = el('article', 'hk-plazos-dia');
        const isToday = d.date === o.today;
        if (isToday) {
            day.setAttribute('data-hoy', '');
        }
        const when = el('p', 'hk-plazos-cuando');
        when.appendChild(el('b', '', isToday && o.s.today ? o.s.today : dayLabel(d.date, o.today, o.s)));
        day.appendChild(when);
        const rows = el('div', 'hk-plazos-filas');
        d.items.forEach(function (x) {
            const row = el('div', 'hk-plazos-fila');
            stage(row, x.color);
            row.appendChild(el('b', 'hk-plazos-curso', x.course || ''));
            const kind = words[x.kind] || '';
            if (kind || x.activity) {
                const what = el('p', 'hk-plazos-que');
                if (kind) {
                    what.appendChild(el('i', '', kind));
                }
                if (x.activity) {
                    what.appendChild(document.createTextNode(x.activity));
                }
                row.appendChild(what);
            }
            // Empty too, on a wide screen: its column keeps the others straight.
            row.appendChild(el('b', 'hk-plazos-hora', deadlineTime(x.time)));
            rows.appendChild(row);
        });
        day.appendChild(rows);
        list.appendChild(day);
    });
    s.appendChild(list);
    c.appendChild(s);
}

/**
 * What gives way if a page does not fit (a long name, an important notice under it): first the second line of the course, then what
 * is due. What cannot go: the course and its day, which are what someone comes to look for.
 *
 * @param {HTMLElement} c the layer
 */
export function fitDeadlines(c) {
    const s = c.querySelector('.hk-plazos');
    if (!s) {
        return;
    }
    const list = s.querySelector('.hk-plazos-lista');
    const steps = [[], ['hk-plazos-una-linea'], ['hk-plazos-una-linea', 'hk-plazos-sin-que']];
    for (let k = 0; k < steps.length; k++) {
        s.classList.remove('hk-plazos-sin-que', 'hk-plazos-una-linea');
        steps[k].forEach(function (x) {
            s.classList.add(x);
        });
        if (list.scrollHeight <= list.clientHeight + 1) {
            return;
        }
    }
}
