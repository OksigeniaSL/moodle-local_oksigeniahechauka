// The schedule rules of the contract («when», power hours, the dark theme), evaluated on the wall clock of the screen.
// Pure functions: the same code runs on the screen, in the preview of the panel and in the tests.

const MS_DAY = 86400000;

function two(n) {
    return (n < 10 ? '0' : '') + n;
}

/**
 * The wall clock of a Date, in the time zone of the device that runs the player.
 *
 * @param {Date} d
 * @returns {{date: string, dow: number, min: number, stamp: string}}
 */
export function wallOf(d) {
    const date = d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    const min = d.getHours() * 60 + d.getMinutes();
    return {date, dow, min, stamp: date + 'T' + two(d.getHours()) + ':' + two(d.getMinutes())};
}

/** Minutes from midnight of "HH:MM". */
export function toMinutes(hm) {
    const p = String(hm).split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1] || '0', 10);
}

/** Days since 1970-01-01 of "YYYY-MM-DD", whatever the time zone. */
export function dayNumber(ymd) {
    const p = String(ymd).split('-');
    return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / MS_DAY);
}

/** ISO weekday (1 Monday … 7 Sunday) of a day number: 1970-01-01 was a Thursday. */
export function weekdayOf(day) {
    return ((day + 3) % 7 + 7) % 7 + 1;
}

/** Whether a minute of the day falls in one ["HH:MM", "HH:MM"] range; a range can cross midnight. */
export function inRange(range, min) {
    const a = toMinutes(range[0]);
    const b = toMinutes(range[1]);
    if (a === b) {
        return true;
    }
    return a < b ? (min >= a && min < b) : (min >= a || min < b);
}

/**
 * Whether a «when» of the contract holds at a wall time. No «when» means always.
 *
 * @param {object|undefined} when {from, until, days, times, every}
 * @param {{date: string, dow: number, min: number}} wall
 */
export function matchesWhen(when, wall) {
    if (!when) {
        return true;
    }
    if (when.from && wall.date < when.from) {
        return false;
    }
    if (when.until && wall.date > when.until) {
        return false;
    }
    if (when.days && when.days.length && when.days.indexOf(wall.dow) === -1) {
        return false;
    }
    if (when.times && when.times.length) {
        let any = false;
        for (let i = 0; i < when.times.length; i++) {
            if (inRange(when.times[i], wall.min)) {
                any = true;
                break;
            }
        }
        if (!any) {
            return false;
        }
    }
    if (when.every > 1 && when.from) {
        const start = dayNumber(when.from);
        const monday = start - (weekdayOf(start) - 1);
        const today = dayNumber(wall.date);
        const week = Math.floor((today - monday) / 7);
        if (week < 0 || week % when.every !== 0) {
            return false;
        }
    }
    return true;
}

/** When an event stops being news: its end, its start without an end, or the end of its day if it is all day. */
export function eventOver(item, wall) {
    const last = item.end || item.start;
    if (!last) {
        return false;
    }
    if (item.allday) {
        return wall.date > last.slice(0, 10);
    }
    if (!item.end) {
        // Without an end it stays an hour: «10:00 Museum visit» is news while it is happening.
        const startMin = dayNumber(last.slice(0, 10)) * 1440 + toMinutes(last.slice(11, 16));
        return dayNumber(wall.date) * 1440 + wall.min >= startMin + 60;
    }
    return wall.stamp >= last.slice(0, 16);
}

/** Whether an item is on at a wall time. */
export function isLive(item, wall) {
    if (!matchesWhen(item.when, wall)) {
        return false;
    }
    if (item.type === 'event' && eventOver(item, wall)) {
        return false;
    }
    return true;
}

/** Whether the screen should be on, after the «power» of the manifest. No power hours means always on. */
export function isPowerOn(power, wall) {
    if (!power || !power.length) {
        return true;
    }
    for (let i = 0; i < power.length; i++) {
        const p = power[i];
        if (p.days && p.days.length && p.days.indexOf(wall.dow) === -1) {
            continue;
        }
        if (inRange([p.on, p.off], wall.min)) {
            return true;
        }
    }
    return false;
}

/** Whether the dark theme is on: always, never or by hours. */
export function isDark(theme, wall) {
    if (!theme || !theme.mode || theme.mode === 'light') {
        return false;
    }
    if (theme.mode === 'dark') {
        return true;
    }
    if (theme.mode === 'auto' && theme.dark_from && theme.dark_until) {
        return inRange([theme.dark_from, theme.dark_until], wall.min);
    }
    return false;
}

/** The live items of a zone, in their order. */
export function liveItems(items, zone, wall) {
    const out = [];
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.zone === zone && isLive(it, wall)) {
            out.push(it);
        }
    }
    out.sort(function (a, b) {
        return (a.order || 0) - (b.order || 0);
    });
    return out;
}

/**
 * The urgent notice on now, if any: the newest one whose «when» is live and whose «ends» has not come. It covers the
 * whole screen until it is taken off (the panel's «Aviso urgente»).
 *
 * @param {object[]} items
 * @param {{date: string, dow: number, min: number, stamp: string}} wall
 * @returns {object|null}
 */
export function urgentOf(items, wall) {
    let found = null;
    (items || []).forEach(function (it) {
        if (it.type === 'urgent' && isLive(it, wall) && !(it.ends && it.ends <= wall.stamp)) {
            found = it;
        }
    });
    return found;
}
