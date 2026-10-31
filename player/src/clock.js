// The clocks of the player: the real one of the device, or a simulated one for the preview of the panel («what will
// the screen show on Monday at ten?»), which starts at the chosen moment and runs at normal speed from there.

import {wallOf} from './rules.js';

export function realClock() {
    return {
        now: function () {
            return Date.now();
        },
        date: function () {
            return new Date();
        },
        wall: function () {
            return wallOf(new Date());
        },
    };
}

/**
 * @param {string} at "YYYY-MM-DDTHH:MM", in the time zone of the browser that shows the preview
 */
export function simulatedClock(at) {
    const p = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(at || '');
    const start = p ? new Date(+p[1], +p[2] - 1, +p[3], +p[4], +p[5], 0, 0).getTime() : Date.now();
    const began = Date.now();
    function date() {
        return new Date(start + (Date.now() - began));
    }
    return {
        now: function () {
            return Date.now();
        },
        date: date,
        wall: function () {
            return wallOf(date());
        },
    };
}
