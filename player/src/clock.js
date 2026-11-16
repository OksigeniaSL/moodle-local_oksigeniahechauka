// The clocks of the player: the real one of the device, or a simulated one for the preview of the panel («what will
// the screen show on Monday at ten?»), which starts at the chosen moment and runs at normal speed from there.

import {wallOf} from './rules.js';

/** Where the last difference with the server is kept, for a start without network. */
const SKEW_KEY = 'hk-reloj';
/** Under this, the device's clock is taken as right: the Date header has whole seconds, and the network takes its time. */
export const SKEW_MIN_MS = 60000;
/** An answer that took longer than this says little about the time it was sent. */
const SKEW_SLOW_MS = 10000;

function storage() {
    try {
        return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
    } catch (e) {
        return null;
    }
}

/**
 * How far the device's clock is from the server's, from one answer: its Date header against the middle of the request.
 *
 * @param {number} server the answer's Date header, in ms (whole seconds)
 * @param {number} sent when the request left, by the device's clock
 * @param {number} received when the answer came
 * @returns {number|null} what to add to the device's clock; 0 when it is right; null when the answer says nothing
 */
export function skewOf(server, sent, received) {
    if (!(server > 0) || !(received >= sent) || received - sent > SKEW_SLOW_MS) {
        return null;
    }
    const skew = server + 500 - (sent + received) / 2;
    return Math.abs(skew) < SKEW_MIN_MS ? 0 : Math.round(skew);
}

/**
 * The device's clock, put right with the server's when it is a minute or more off: a television whose clock was never
 * set, or that keeps summer time, shows the right hour, «Today» and its timetable all the same.
 */
export function realClock() {
    let skew = 0;
    const kept = storage();
    if (kept) {
        try {
            skew = Number(kept.getItem(SKEW_KEY)) || 0;
        } catch (e) {
            skew = 0;
        }
    }
    function date() {
        return new Date(Date.now() + skew);
    }
    return {
        now: function () {
            return Date.now() + skew;
        },
        date: date,
        wall: function () {
            return wallOf(date());
        },
        /** An answer of the server: its time (Date header), and when the request left and came back. */
        heard: function (server, sent, received) {
            const next = skewOf(server, sent, received);
            if (next === null || Math.abs(next - skew) < 2000) {
                return;
            }
            skew = next;
            const s = storage();
            if (s) {
                try {
                    s.setItem(SKEW_KEY, String(skew));
                } catch (e) {
                    // A full or closed storage: the clock is right until the next start.
                }
            }
        },
        /** What is added to the device's clock, for the heartbeat. */
        skew: function () {
            return skew;
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
