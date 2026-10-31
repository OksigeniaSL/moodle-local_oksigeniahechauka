// «La semana»: the next five school days, each with its events; holidays as holidays; events of more than a day as a
// band across their days (on a vertical screen, a flag on a pole). From the art direction (Gaudí, 31 October 2026,
// «semanaDe» in its demo). Nothing here touches the page, so it is tested on its own.

import {dayNumber, weekdayOf} from './rules.js';
import {splitTitle, stageOf} from './agenda.js';

const DAYS = 5;

function dateOfNumber(n) {
    const d = new Date(n * 86400000);
    return {month: d.getUTCMonth(), day: d.getUTCDate(), weekday: d.getUTCDay()};
}

/** A holiday: «Festivo - Todos los Santos», «No lectivo - …», «Vacaciones - …», a title «Festivo», or holiday: true. */
export function holidayOf(ev, parts, labels) {
    if (ev.holiday === true || /^(festivo|no lectivo|vacaciones)$/i.test(parts.group)) {
        return {label: parts.group || labels.holiday || '', name: parts.title};
    }
    if (!parts.group && /^(festivo|no lectivo)$/i.test(parts.title)) {
        return {label: '', name: parts.title};
    }
    return null;
}

// «mar 10», with the month when it is not the one of the day it is said from («mar 1 dic»).
function shortDay(n, from, labels) {
    const f = dateOfNumber(n);
    const text = labels.days_short[f.weekday] + ' ' + f.day;
    return f.month !== dateOfNumber(from).month ? text + ' ' + labels.months_short[f.month] : text;
}

// Places the bands in this order, each in the first lane free on all its days.
function placeBands(order, ndays, max) {
    const taken = [];
    const lanes = [];
    const placed = [];
    const left = [];
    for (let i = 0; i < ndays; i++) {
        lanes.push(0);
    }
    order.forEach(function (t) {
        for (let k = 0; k < max; k++) {
            let free = true;
            for (let j = t.from; j <= t.to; j++) {
                free = free && !(taken[k] && taken[k][j]);
            }
            if (free) {
                taken[k] = taken[k] || {};
                for (let j = t.from; j <= t.to; j++) {
                    taken[k][j] = true;
                    lanes[j] = Math.max(lanes[j], k + 1);
                }
                placed.push({t, lane: k});
                return;
            }
        }
        left.push(t);
    });
    let room = 0;
    lanes.forEach(function (c) {
        room += c;
    });
    return {placed, left, lanes, room, out: left.length, flags: null};
}

// On a vertical screen, flags on poles: by their first day, the longest first, each band takes the lane further in
// than every band still going on that day, so its flag crosses no other pole; if there is none, the first lane free on
// all its days; if none is free, it goes to the lists. Its flag takes the next row of its first day (two at most).
function placeFlags(list, ndays, max) {
    const order = list.slice().sort(byStart);
    const lanes = [];
    const flags = [];
    for (let i = 0; i < ndays; i++) {
        lanes.push(0);
        flags.push(0);
    }
    const placed = [];
    const left = [];
    const freeIn = function (k, t) {
        return !placed.some(function (p) {
            return p.lane === k && p.t.from <= t.to && p.t.to >= t.from;
        });
    };
    order.forEach(function (t) {
        let k = 0;
        placed.forEach(function (p) {
            if (p.t.from <= t.from && p.t.to >= t.from) {
                k = Math.max(k, p.lane + 1);
            }
        });
        if (k >= max || !freeIn(k, t)) {
            k = -1;
            for (let c = 0; c < max && k < 0; c++) {
                k = freeIn(c, t) ? c : -1;
            }
        }
        if (k < 0 || flags[t.from] >= 2) {
            left.push(t);
            return;
        }
        placed.push({t, lane: k, row: flags[t.from]});
        flags[t.from]++;
        for (let j = t.from; j <= t.to; j++) {
            lanes[j] = Math.max(lanes[j], k + 1);
        }
    });
    return {placed, left, lanes, flags};
}

function byStart(x, y) {
    return x.from - y.from || (y.to - y.from) - (x.to - x.from) || (x.start < y.start ? -1 : 1);
}

// Every order of a short list (up to 6: 720 orders); a longer one, only as it is.
function orders(list) {
    if (list.length < 2 || list.length > 6) {
        return [];
    }
    const all = [];
    const permute = function (done, rest) {
        if (!rest.length) {
            all.push(done);
            return;
        }
        for (let i = 0; i < rest.length; i++) {
            permute(done.concat([rest[i]]), rest.slice(0, i).concat(rest.slice(i + 1)));
        }
    };
    permute([], list);
    return all;
}

/**
 * The week as the screen shows it.
 *
 * @param {object[]} events items of type event (title, start, end, allday, color, holiday)
 * @param {string} today «YYYY-MM-DD»
 * @param {boolean} vertical a vertical screen: two lanes as flags on poles (three lanes of bands on a horizontal one)
 * @param {object} labels days (full, Sunday first), days_short, months, months_short, holiday, from, until
 * @returns {{days: object[], bands: object[], things: number}}
 */
export function weekOf(events, today, vertical, labels) {
    const t0 = dayNumber(today);
    const days = [];
    const byNumber = {};
    for (let n = t0; days.length < DAYS; n++) {
        if (weekdayOf(n) <= 5) {
            const f = dateOfNumber(n);
            byNumber[n] = days.length;
            const before = days.length ? days[days.length - 1].n : t0;
            days.push({n, number: f.day, name: labels.days[f.weekday], today: n === t0, tomorrow: n === t0 + 1,
                month: f.month !== dateOfNumber(before).month ? labels.months[f.month] : '',
                afterWeekend: days.length > 0 && n - days[days.length - 1].n > 1,
                holiday: null, events: [], lanes: 0, flags: 0});
        }
    }
    const first = days[0].n;
    const last = days[days.length - 1].n;
    const bands = [];
    events.forEach(function (ev) {
        if (!ev.start) {
            return;
        }
        const a = dayNumber(ev.start.slice(0, 10));
        const b = ev.end ? Math.max(a, dayNumber(ev.end.slice(0, 10))) : a;
        if (b < first || a > last) {
            return;
        }
        const parts = splitTitle(ev.title);
        // Who it is for: the group in its title or, for one made in the panel, its «who or where».
        const group = parts.group || ev.detail || '';
        const color = stageOf(group) || (ev.color >= 1 && ev.color <= 4 ? ev.color : 0);
        const holiday = holidayOf(ev, parts, labels);
        if (holiday) {
            days.forEach(function (d) {
                if (d.n >= a && d.n <= b) {
                    d.holiday = holiday;
                }
            });
            return;
        }
        if (b > a) {
            let from = -1;
            let to = -1;
            days.forEach(function (d, i) {
                if (d.n >= a && d.n <= b) {
                    from = from < 0 ? i : from;
                    to = i;
                }
            });
            if (from < 0) {
                // Only on a weekend.
                return;
            }
            const before = a < days[from].n;
            const after = b > days[to].n;
            bands.push({title: parts.title, group, color, from, to, before, after, start: ev.start,
                note: (before ? labels.from + ' ' + shortDay(a, days[from].n, labels) : '') +
                    (before && after ? ', ' : '') +
                    (after ? labels.until + ' ' + shortDay(b, days[to].n, labels) : '')});
            return;
        }
        if (byNumber[a] === undefined) {
            // A weekend.
            return;
        }
        days[byNumber[a]].events.push({title: parts.title, group, color,
            time: ev.allday ? '' : String(ev.start).slice(11, 16), order: ev.allday ? '' : String(ev.start)});
    });
    // The whole-day ones first, then by the hour.
    days.forEach(function (d) {
        d.events.sort(function (x, y) {
            return x.order < y.order ? -1 : (x.order > y.order ? 1 : 0);
        });
    });
    bands.sort(byStart);
    let best;
    if (vertical) {
        best = placeFlags(bands, days.length, 2);
    } else {
        best = placeBands(bands, days.length, 3);
        orders(bands).forEach(function (order) {
            const tryit = placeBands(order, days.length, 3);
            if (tryit.out < best.out || (tryit.out === best.out && tryit.room < best.room)) {
                best = tryit;
            }
        });
    }
    const laid = [];
    best.placed.forEach(function (p) {
        p.t.lane = p.lane;
        p.t.row = p.row || 0;
        laid.push(p.t);
    });
    days.forEach(function (d, i) {
        d.lanes = best.lanes[i];
        d.flags = best.flags ? best.flags[i] : 0;
    });
    best.left.forEach(function (t) {
        for (let j = t.from; j <= t.to; j++) {
            days[j].events.unshift({title: t.title, group: (t.group ? t.group + ' · ' : '') + labels.until + ' ' +
                shortDay(days[t.to].n, days[j].n, labels), color: t.color, time: '', order: ''});
        }
    });
    let things = laid.length;
    days.forEach(function (d) {
        things += (d.holiday ? 1 : 0) + (d.today ? 0 : d.events.length);
    });
    return {days, bands: laid, things};
}
