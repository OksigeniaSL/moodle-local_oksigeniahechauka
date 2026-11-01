// What comes in the next days: the events after today, with their day in front («Tomorrow», «Tue 3»), and one
// countdown for something big. An agenda is there to see what is coming: «is there a trip on Thursday?».

import {dayNumber, weekdayOf} from './rules.js';

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
