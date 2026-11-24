// The hour of the centre, whatever time zone the device is in. A television says one zone to its browser and shows
// another in its own menu: going by the device's, its screen was an hour ahead once its clock had been put right with the
// server's. The manifest says how far the centre is from UTC, now and after each change of hour for more than a year
// (screen.offsets), so nothing depends on the zones the browser knows, nor on the network.

/** [{from: seconds, minutes}], in order; null until a manifest says it: then the device's own zone, as always. */
let offsets = null;

/**
 * @param {Array<{from: number, minutes: number}>|undefined} list screen.offsets of the manifest
 */
export function setZone(list) {
    const good = (Array.isArray(list) ? list : []).filter(function (o) {
        return o && typeof o.from === 'number' && typeof o.minutes === 'number' && Math.abs(o.minutes) <= 14 * 60;
    });
    good.sort(function (a, b) {
        return a.from - b.from;
    });
    offsets = good.length ? good : null;
}

/**
 * How far the centre is from UTC at a moment.
 *
 * @param {number} ms
 * @returns {number|null} minutes east; null when no manifest has said it
 */
export function zoneMinutes(ms) {
    if (!offsets) {
        return null;
    }
    let minutes = offsets[0].minutes;
    for (let i = 1; i < offsets.length && offsets[i].from * 1000 <= ms; i++) {
        minutes = offsets[i].minutes;
    }
    return minutes;
}

/**
 * A moment, to be read with getHours(), getDate() and the like: they say what the clocks of the centre say then. Read from
 * UTC, moved: the device's own zone has hours that do not exist, the night it changes.
 *
 * @param {Date|number} when
 * @returns {Date|object} only to be read
 */
export function here(when) {
    const ms = typeof when === 'number' ? when : when.getTime();
    const minutes = zoneMinutes(ms);
    if (minutes === null) {
        return new Date(ms);
    }
    const d = new Date(ms + minutes * 60000);
    return {
        getFullYear: function () {
            return d.getUTCFullYear();
        },
        getMonth: function () {
            return d.getUTCMonth();
        },
        getDate: function () {
            return d.getUTCDate();
        },
        getDay: function () {
            return d.getUTCDay();
        },
        getHours: function () {
            return d.getUTCHours();
        },
        getMinutes: function () {
            return d.getUTCMinutes();
        },
        toLocaleDateString: function (lang, options) {
            return d.toLocaleDateString(lang, Object.assign({}, options, {timeZone: 'UTC'}));
        },
    };
}
