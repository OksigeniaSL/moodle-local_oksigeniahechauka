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
 * The centre's category of an event by its words: the first category with a word that starts a word of the text
 * («Inf» marks «Infantil»; «Ingeniería» marks «Ingeniería Civil»), or a phrase of several words found whole. 0 if none.
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
    for (let i = 0; i < list.length; i++) {
        const words = list[i].words || [];
        for (let k = 0; k < words.length; k++) {
            const w = plain(words[k]).split(/[^a-z0-9ñ]+/).filter(Boolean).join(' ');
            if (!w) {
                continue;
            }
            const found = w.indexOf(' ') >= 0 ? joined.indexOf(' ' + w + ' ') >= 0 : tokens.some(function (t) {
                return t.indexOf(w) === 0;
            });
            if (found) {
                return list[i].n;
            }
        }
    }
    return 0;
}

/**
 * The colour of an event: the category chosen for it, or the one its words mark, or 0 (a neutral grey).
 *
 * @param {object} ev
 * @param {string} text
 * @param {Array} categories
 * @returns {number}
 */
export function colourOf(ev, text, categories) {
    const n = Number(ev && ev.color) || 0;
    return n >= 1 && n <= 6 ? n : categoryOf(text, categories);
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
 */
export function upcoming(events, today, days, s) {
    const first = dayNumber(today) + 1;
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
