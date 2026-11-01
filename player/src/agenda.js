// What comes in the next days: the events after today, with their day in front («Tomorrow», «Tue 3»), and one
// countdown for something big. An agenda is there to see what is coming: «is there a trip on Thursday?».

import {dateFromNumber, dayNumber, weekdayOf} from './rules.js';
import {holidayOf} from './week.js';

// An emoji at the start keeps to its first word, never alone on a line: «📚 Celebración del libro».
function keepEmoji(t) {
    const m = /^([\uD800-\uDBFF][\uDC00-\uDFFF]\uFE0F?) /.exec(t);
    return m ? m[1] + '\u00a0' + t.slice(m[0].length) : t;
}

// Lower case and without accents, for comparing words: «Educación» and «educacion» are the same word.
function plain(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * The centre's category of an event by its words: a word that starts a word of the text («Inf» marks «Infantil»), or a
 * phrase of several words found whole. The closest wins: a whole word over a beginning, a longer beginning over a
 * shorter one («Inglés» goes to the category with «inglés», not to the one with «ing»); then the first. 0 if none.
 *
 * @param {string} text the group of its title, or its «who or where»
 * @param {Array<{n: number, words: string[]}>} categories from the manifest
 * @returns {number} the category's position, 1 to 6
 */
export function categoryOf(text, categories) {
    const tokens = plain(text).split(/[^a-z0-9ñ]+/).filter(Boolean);
    if (!tokens.length) {
        return 0;
    }
    const joined = ' ' + tokens.join(' ') + ' ';
    const list = categories || [];
    let best = 0;
    let found = 0;
    for (let i = 0; i < list.length; i++) {
        const words = list[i].words || [];
        for (let k = 0; k < words.length; k++) {
            const w = plain(words[k]).split(/[^a-z0-9ñ]+/).filter(Boolean).join(' ');
            let score = 0;
            if (!w) {
                continue;
            }
            if (w.indexOf(' ') >= 0) {
                score = joined.indexOf(' ' + w + ' ') >= 0 ? 1000 + w.length : 0;
            } else if (tokens.indexOf(w) >= 0) {
                score = 1000 + w.length;
            } else if (tokens.some(function (t) {
                return t.indexOf(w) === 0;
            })) {
                score = w.length;
            }
            if (score > best) {
                best = score;
                found = list[i].n;
            }
        }
    }
    return found;
}

/**
 * The colour of an event: the category chosen for it; else the one the words of its group or «for whom» mark; else the
 * one the words of its whole title mark; else 0 (a neutral grey).
 *
 * @param {object} ev
 * @param {string} text the group of its title, or its «for whom»
 * @param {Array} categories
 * @returns {number}
 */
export function colourOf(ev, text, categories) {
    const n = Number(ev && ev.color) || 0;
    return n >= 1 && n <= 6 ? n : (categoryOf(text, categories) || categoryOf(ev && ev.title, categories));
}

/** «3º ESO - Acampada» reads as «Acampada» with «3º ESO» under it; a title without « - » stays whole. */
export function splitTitle(title) {
    const t = String(title || '');
    const at = t.indexOf(' - ');
    if (at <= 0) {
        return {title: keepEmoji(t), group: ''};
    }
    return {title: keepEmoji(t.slice(at + 3).trim()), group: t.slice(0, at).trim()};
}

function dateOf(stamp) {
    return String(stamp || '').slice(0, 10);
}

/**
 * The day of an event as the screen says it: «Tomorrow», or its short weekday and its day («Tue 3»), with the month
 * only when it is not this month's («Mon 1 Dec»).
 *
 * @param {string} date «YYYY-MM-DD»
 * @param {string} today «YYYY-MM-DD»
 * @param {object} s {tomorrow, days_short (Sunday first), months_short}
 */
export function dayLabel(date, today, s) {
    const n = dayNumber(date);
    if (n === dayNumber(today) + 1 && s.tomorrow) {
        return s.tomorrow;
    }
    const days = s.days_short || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = s.months_short || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov',
        'Dec'];
    const d = parseInt(date.slice(8, 10), 10);
    let text = days[weekdayOf(n) % 7] + ' ' + d;
    if (date.slice(5, 7) !== today.slice(5, 7)) {
        text += ' ' + months[parseInt(date.slice(5, 7), 10) - 1];
    }
    return text;
}

/**
 * The events of the next days, the nearest first: each with its day, its title split, its colour and whether it is
 * the same day as the one before (then the day is not repeated).
 *
 * @param {object[]} events items of type event
 * @param {string} today «YYYY-MM-DD»
 * @param {number} days how many days ahead
 * @param {object} s labels and day names
 * @param {number} [skip] days left out after today (1 at the end of the day, when «Today» shows tomorrow)
 */
export function upcoming(events, today, days, s, skip) {
    // At the end of the day tomorrow is «Today»'s own: the coming days start after it.
    const first = dayNumber(today) + 1 + (skip || 0);
    const last = dayNumber(today) + days;
    const list = events.filter(function (ev) {
        const n = dayNumber(dateOf(ev.start));
        return ev.start && n >= first && n <= last;
    }).sort(function (a, b) {
        return a.start < b.start ? -1 : (a.start > b.start ? 1 : 0);
    });
    let before = '';
    return list.map(function (ev) {
        const date = dateOf(ev.start);
        const parts = splitTitle(ev.title);
        const row = {
            id: ev.id,
            date,
            day: dayLabel(date, today, s),
            title: parts.title,
            group: parts.group || ev.detail || '',
            color: colourOf(ev, parts.group || ev.detail, s.categories),
            sameDay: date === before,
        };
        before = date;
        return row;
    });
}

/**
 * One countdown, for the nearest big event (one that lasts more than a day: a camp, a residential trip) from two to
 * fourteen days ahead. Tomorrow's is just a coming day.
 *
 * @returns {{id: string, days: number, title: string, group: string, date: string, color: number}|null}
 */
export function countdown(events, today, max, categories) {
    const t = dayNumber(today);
    let best = null;
    events.forEach(function (ev) {
        if (!ev.start || !ev.end) {
            return;
        }
        const start = dayNumber(dateOf(ev.start));
        const long = dayNumber(dateOf(ev.end)) > start;
        const days = start - t;
        if (long && days >= 2 && days <= (max || 14) && (!best || days < best.days)) {
            const parts = splitTitle(ev.title);
            best = {id: ev.id, days, title: parts.title, group: parts.group || ev.detail || '', date: dateOf(ev.start),
                color: colourOf(ev, parts.group || ev.detail, categories)};
        }
    });
    return best;
}

/**
 * Whether the day is over for the screens: from the hour the centre sets («dayend», «HH:MM»), «Today» shows tomorrow.
 *
 * @param {{min: number}} wall
 * @param {string} dayend
 * @returns {boolean}
 */
export function afterDayEnd(wall, dayend) {
    if (!/^\d{1,2}:\d{2}$/.test(String(dayend || ''))) {
        return false;
    }
    const parts = dayend.split(':');
    return wall.min >= parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Whether an event takes place on a day: from the day it starts to the day it ends (an end at midnight is the day
 * before's).
 *
 * @param {object} ev
 * @param {number} day a day number
 * @returns {boolean}
 */
function onDay(ev, day) {
    const first = dayNumber(dateOf(ev.start));
    let last = ev.end ? dayNumber(dateOf(ev.end)) : first;
    if (last > first && String(ev.end).slice(11, 16) === '00:00') {
        last--;
    }
    return first <= day && day <= Math.max(first, last);
}

/**
 * The events of one day as «Today» lists them (today's, or tomorrow's at the end of the day): those that take place
 * that day, by their own dates, not by the days they are shown; each with its hour (a dot when it lasts all day or
 * began before), its title split and its colour.
 *
 * @param {object[]} events items of type event
 * @param {string} today «YYYY-MM-DD»
 * @param {number} ahead days after today (0 for today)
 * @param {Array} categories
 * @returns {object[]}
 */
export function eventsOn(events, today, ahead, categories) {
    const day = dayNumber(today) + ahead;
    return events.filter(function (ev) {
        return ev.start && onDay(ev, day);
    }).sort(function (a, b) {
        return a.start < b.start ? -1 : (a.start > b.start ? 1 : 0);
    }).map(function (ev) {
        const parts = splitTitle(ev.title);
        const timed = !ev.allday && ev.start.length >= 16 && dayNumber(dateOf(ev.start)) === day;
        return {time: timed ? ev.start.slice(11, 16) : '·', title: parts.title, group: parts.group || ev.detail || '',
            color: colourOf(ev, parts.group || ev.detail, categories)};
    });
}

// The last day of an event: an end at midnight is the day before's.
function lastDayOf(ev, start) {
    let last = ev.end ? dayNumber(dateOf(ev.end)) : start;
    if (ev.end && last > start && String(ev.end).slice(11, 16) === '00:00') {
        last--;
    }
    return Math.max(start, last);
}

/**
 * Until when, in words: «hasta mañana»; within a week, «hasta el viernes»; further on, «hasta el viernes 18»; in another
 * month, «hasta el 4 de diciembre».
 *
 * @param {number} last the last day's number
 * @param {number} from the day it is said on
 * @param {number} first today
 * @param {object} s {until, until_tomorrow, days (Sunday first), months, date_format}
 * @returns {string}
 */
export function untilText(last, from, first, s) {
    if (last === first + 1 && s.until_tomorrow) {
        return s.until_tomorrow;
    }
    const date = dateFromNumber(last);
    const day = parseInt(date.slice(8, 10), 10);
    const month = parseInt(date.slice(5, 7), 10) - 1;
    const until = s.until || '';
    if (date.slice(5, 7) !== dateFromNumber(from).slice(5, 7)) {
        const written = (s.date_format || '{d} {m}').replace('{d}', day).replace('{m}', (s.months || [])[month] || '');
        return (until + ' ' + written).trim();
    }
    const name = String((s.days || [])[weekdayOf(last) % 7] || '').toLowerCase();
    return (until + ' ' + name + (last - from < 7 ? '' : ' ' + day)).trim();
}

/**
 * The agenda that scrolls (as a calendar's agenda view): the days from today with something, each with its events, up
 * to a number of days ahead and a top of events (the nearest stay). Holidays apart, in day.holiday: they count for
 * neither the top nor the rest. A day starts the month's name when the month changes, so the list goes on into the next.
 *
 * @param {object[]} events items of type event
 * @param {string} today «YYYY-MM-DD»
 * @param {number} days how many days ahead (today too)
 * @param {number} max the most events
 * @param {object} s {days (Sunday first), months, categories, today, tomorrow, until, until_tomorrow, date_format, holiday}
 * @returns {{days: object[], count: number, more: number, last: string}}
 */
export function agendaOf(events, today, days, max, s) {
    const first = dayNumber(today);
    const last = first + days - 1;
    const byDay = {};
    const rowOf = function (n) {
        return (byDay[n] = byDay[n] || {events: [], holiday: null});
    };
    let count = 0;
    let all = 0;
    events.filter(function (ev) {
        return ev.start;
    }).sort(function (a, b) {
        return a.start < b.start ? -1 : (a.start > b.start ? 1 : 0);
    }).forEach(function (ev) {
        const start = dayNumber(dateOf(ev.start));
        const from = Math.max(first, start);
        const end = lastDayOf(ev, start);
        // An event of several days is listed on its first day still to come; one already over, not at all.
        if (from > last || end < first) {
            return;
        }
        const parts = splitTitle(ev.title);
        const free = holidayOf(ev, parts, {holiday: s.holiday});
        const until = end > from ? untilText(end, from, first, s) : '';
        if (free) {
            rowOf(from).holiday = {label: free.label, name: free.name, until};
            return;
        }
        all++;
        if (count >= max) {
            return;
        }
        count++;
        rowOf(from).events.push({
            time: ev.allday || start < from || String(ev.start).length < 16 ? '' : ev.start.slice(11, 16),
            title: parts.title,
            group: parts.group || ev.detail || '',
            color: colourOf(ev, parts.group || ev.detail, s.categories),
            until,
        });
    });
    const names = s.days || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = s.months || ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
        'October', 'November', 'December'];
    let month = '';
    const list = Object.keys(byDay).map(Number).sort(function (a, b) {
        return a - b;
    }).filter(function (n) {
        // A holiday beyond the last event shown is not worth a line of its own when the list was cut by the top.
        return !(count < all && !byDay[n].events.length && n > first + 21);
    }).map(function (n) {
        const date = dateFromNumber(n);
        const m = date.slice(0, 7);
        const row = {
            date,
            day: parseInt(date.slice(8, 10), 10),
            weekday: names[weekdayOf(n) % 7],
            label: n === first ? (s.today || '') : (n === first + 1 ? (s.tomorrow || '') : ''),
            today: n === first,
            month: m !== month ? months[parseInt(date.slice(5, 7), 10) - 1] : '',
            far: n - first,
            holiday: byDay[n].holiday,
            events: byDay[n].events,
        };
        month = m;
        return row;
    });
    return {days: list, count, more: all - count, last: dateFromNumber(last)};
}

/**
 * A month as a calendar shows it, Monday first: its weeks, each day with its number and date, whether it is today, past
 * or a holiday, and the colours of its events (the first three categories, 0 for one without category). A holiday has
 * no marks of its own.
 *
 * @param {string} date any day of the month, «YYYY-MM-DD»
 * @param {string} today «YYYY-MM-DD»
 * @param {object[]} events items of type event
 * @param {Array} categories
 * @returns {{month: number, year: number, weeks: Array<Array<object|null>>}}
 */
export function monthOf(date, today, events, categories) {
    const year = parseInt(date.slice(0, 4), 10);
    const month = parseInt(date.slice(5, 7), 10);
    const first = dayNumber(date.slice(0, 8) + '01');
    const next = dayNumber((month === 12 ? (year + 1) + '-01' : year + '-' + (month < 9 ? '0' : '') + (month + 1)) +
        '-01');
    const t = dayNumber(today);
    const marks = {};
    const free = {};
    events.forEach(function (ev) {
        if (!ev.start) {
            return;
        }
        const from = dayNumber(dateOf(ev.start));
        const to = lastDayOf(ev, from);
        const parts = splitTitle(ev.title);
        const holiday = holidayOf(ev, parts, {});
        const colour = holiday ? 0 : colourOf(ev, parts.group || ev.detail, categories);
        for (let n = Math.max(from, first); n <= Math.min(to, next - 1); n++) {
            if (holiday) {
                free[n] = true;
                continue;
            }
            const list = (marks[n] = marks[n] || []);
            if (list.indexOf(colour) === -1 && list.length < 3) {
                list.push(colour);
            }
        }
    });
    const weeks = [];
    let week = [];
    // Monday first: weekdayOf gives 1 Monday … 7 Sunday.
    const lead = (weekdayOf(first) + 6) % 7;
    for (let i = 0; i < lead; i++) {
        week.push(null);
    }
    for (let n = first; n < next; n++) {
        week.push({day: n - first + 1, date: dateFromNumber(n), today: n === t, past: n < t, marks: marks[n] || [],
            holiday: !!free[n]});
        if (week.length === 7) {
            weeks.push(week);
            week = [];
        }
    }
    if (week.length) {
        while (week.length < 7) {
            week.push(null);
        }
        weeks.push(week);
    }
    return {month, year, weeks};
}
