// The place of a screen (screen.place of the manifest: a library, a canteen, an office, a gym) and whether it is open now,
// said in words from the screen's own clock: «Abierto · hasta las 17:00», «Cerrado · abre mañana a las 8:00». Nothing here
// touches the page, so it is tested on its own (test/sitio.test.js).
//
//   screen.place = {name: 'Biblioteca', hours: [{days: [1, 2, 3, 4, 5], from: '08:00', until: '17:00'}],
//                   closed: ['2026-12-08'], words: {open: 'Abierta', closed: 'Cerrada'}}
//
// days are ISO (1 Monday … 7 Sunday); «until» may be «24:00», or earlier than «from» for a range that crosses midnight.
// words is optional: the two state words agree with the place's name in some languages, and only the centre knows it.

import {dateFromNumber, dayNumber, toMinutes, weekdayOf} from './rules.js';

/** The words of the place, in the player's Spanish; the site's strings and the manifest's labels go over them. */
export const PLACE_WORDS = {
    place_open: 'Abierto',
    place_closed: 'Cerrado',
    place_until: 'hasta las {time}',
    place_opens_today: 'abre a las {time}',
    place_opens_tomorrow: 'abre mañana a las {time}',
    place_opens_day: 'abre el {day} a las {time}',
    place_opens_date: 'abre el {date} a las {time}',
    place_hours: 'Horario',
    place_today: 'Hoy',
    place_days_range: '{from} a {until}',
    place_days_pair: '{from} y {until}',
    place_time_range: '{from} – {until}',
};

/**
 * The words to say the place with: each from the manifest's labels, else the site's strings, else the player's Spanish;
 * the place's own open and closed words over all of them.
 *
 * @param {object} [labels] the manifest's
 * @param {object} [strings] the site's
 * @param {object} [place] screen.place
 * @returns {object}
 */
export function placeWords(labels, strings, place) {
    const out = {};
    Object.keys(PLACE_WORDS).forEach(function (k) {
        out[k] = (labels && labels[k]) || (strings && strings[k]) || PLACE_WORDS[k];
    });
    const own = (place && place.words) || {};
    if (own.open) {
        out.place_open = own.open;
    }
    if (own.closed) {
        out.place_closed = own.closed;
    }
    return out;
}

function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (all, k) {
        return values[k] !== undefined ? values[k] : all;
    });
}

/** «8:00», «17:30»: the hour without a leading zero, as it is said. */
export function hm(min) {
    const m = ((min % 1440) + 1440) % 1440;
    const mm = m % 60;
    return Math.floor(m / 60) + ':' + (mm < 10 ? '0' : '') + mm;
}

/** Whether the place has hours to say anything with. */
export function hasPlace(place) {
    return !!(place && place.hours && place.hours.length);
}

function isClosedDay(place, date) {
    return (place.closed || []).indexOf(date) !== -1;
}

// The ranges of a weekday, in minutes from its midnight, sorted; a range that crosses midnight ends after 1440.
function rangesOfWeekday(place, dow) {
    const out = [];
    (place.hours || []).forEach(function (h) {
        if (!h || !h.from || !h.until || (h.days && h.days.length && h.days.indexOf(dow) === -1)) {
            return;
        }
        const from = toMinutes(h.from);
        let until = h.until === '24:00' ? 1440 : toMinutes(h.until);
        if (until <= from) {
            until += 1440;
        }
        out.push({from, until});
    });
    out.sort(function (a, b) {
        return a.from - b.from;
    });
    return out;
}

// The ranges of a day, unless the centre has closed it.
function rangesOn(place, n) {
    const date = dateFromNumber(n);
    return isClosedDay(place, date) ? [] : rangesOfWeekday(place, weekdayOf(n));
}

/**
 * Whether the place is open now and until when, or when it opens next.
 *
 * @param {object} place screen.place
 * @param {{date: string, min: number}} wall the screen's clock
 * @returns {object|null} {open: true, until: minutes of the day it closes} or {open: false, next: {ahead: days from today,
 *     date, dow, min} or null}; null without a place
 */
export function placeState(place, wall) {
    if (!hasPlace(place)) {
        return null;
    }
    const today = dayNumber(wall.date);
    const now = wall.min;
    // The open ranges around now: yesterday's that cross midnight (moved to today's minutes), and today's.
    const around = rangesOn(place, today - 1).filter(function (r) {
        return r.until > 1440;
    }).map(function (r) {
        return {from: r.from - 1440, until: r.until - 1440};
    }).concat(rangesOn(place, today));
    for (let i = 0; i < around.length; i++) {
        const r = around[i];
        if (now >= r.from && now < r.until) {
            // Ranges that touch or overlap make one: 8:00–14:00 and 14:00–17:00 is open until 17:00.
            let until = r.until;
            let grew = true;
            while (grew) {
                grew = false;
                around.forEach(function (o) {
                    if (o.from <= until && o.until > until) {
                        until = o.until;
                        grew = true;
                    }
                });
            }
            return {open: true, until: until % 1440};
        }
    }
    const later = rangesOn(place, today).filter(function (r) {
        return r.from > now;
    })[0];
    if (later) {
        return {open: false, next: {ahead: 0, date: wall.date, dow: weekdayOf(today), min: later.from}};
    }
    for (let k = 1; k <= 31; k++) {
        const r = rangesOn(place, today + k)[0];
        if (r) {
            return {open: false, next: {ahead: k, date: dateFromNumber(today + k), dow: weekdayOf(today + k), min: r.from}};
        }
    }
    return {open: false, next: null};
}

/**
 * A weekday's name as it goes in the middle of a sentence: lower case where the language writes it so.
 *
 * @param {object} names {days: the weekdays' names, Sunday first, lower: whether they go in lower case in a sentence}
 * @param {number} dow 1 Monday … 7 Sunday
 * @returns {string}
 */
export function dayWord(names, dow) {
    const d = ((names && names.days) || [])[dow % 7] || '';
    return names && names.lower ? d.toLowerCase() : d;
}

function capital(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * The state in one line: «Abierto · hasta las 17:00», «Cerrado · abre el lunes a las 8:00».
 *
 * @param {object|null} state from placeState
 * @param {object} w placeWords
 * @param {object} names {days, lower, date: function («2026-11-16») → «16 de noviembre»}
 * @returns {{state: string, more: string}} the state word and what follows it (empty when nothing does)
 */
export function placeLine(state, w, names) {
    if (!state) {
        return {state: '', more: ''};
    }
    if (state.open) {
        return {state: w.place_open, more: fill(w.place_until, {time: hm(state.until)})};
    }
    const n = state.next;
    if (!n) {
        return {state: w.place_closed, more: ''};
    }
    const time = hm(n.min);
    let more;
    if (n.ahead === 0) {
        more = fill(w.place_opens_today, {time});
    } else if (n.ahead === 1) {
        more = fill(w.place_opens_tomorrow, {time});
    } else if (n.ahead < 7) {
        more = fill(w.place_opens_day, {day: dayWord(names, n.dow), time});
    } else {
        more = fill(w.place_opens_date, {date: names && names.date ? names.date(n.date) : n.date, time});
    }
    return {state: w.place_closed, more};
}

function rangesText(ranges, w) {
    return ranges.map(function (r) {
        return fill(w.place_time_range, {from: hm(r.from), until: hm(r.until)});
    }).join(', ');
}

/**
 * Today's hours in words: «8:00 – 17:00», or the closed word on a day it does not open.
 *
 * @param {object} place
 * @param {{date: string}} wall
 * @param {object} w placeWords
 * @returns {string}
 */
export function todayHours(place, wall, w) {
    const r = hasPlace(place) ? rangesOn(place, dayNumber(wall.date)) : [];
    return r.length ? rangesText(r, w) : w.place_closed;
}

/**
 * The week's hours, the days with the same hours together: «Lunes a jueves · 8:00 – 17:00», «Viernes · 8:00 – 14:00»,
 * «Sábado y domingo · Cerrado». The days the centre closes are not in it: they are the state's.
 *
 * @param {object} place
 * @param {object} w placeWords
 * @param {object} names {days, lower}
 * @param {number} [today] 1 Monday … 7 Sunday, to mark its row
 * @returns {Array<{days: string, hours: string, today: boolean, open: boolean}>}
 */
export function weekRows(place, w, names, today) {
    if (!hasPlace(place)) {
        return [];
    }
    const groups = [];
    for (let dow = 1; dow <= 7; dow++) {
        const r = rangesOfWeekday(place, dow);
        const key = r.length ? rangesText(r, w) : '';
        const last = groups[groups.length - 1];
        if (last && last.key === key) {
            last.to = dow;
        } else {
            groups.push({key, from: dow, to: dow});
        }
    }
    return groups.map(function (g) {
        const a = capital(dayWord(names, g.from));
        let days = a;
        if (g.to === g.from + 1) {
            days = fill(w.place_days_pair, {from: a, until: dayWord(names, g.to)});
        } else if (g.to > g.from) {
            days = fill(w.place_days_range, {from: a, until: dayWord(names, g.to)});
        }
        return {days, hours: g.key || w.place_closed, today: today >= g.from && today <= g.to, open: !!g.key};
    });
}
