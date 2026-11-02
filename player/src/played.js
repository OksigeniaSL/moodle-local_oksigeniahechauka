// Oksigenia Hechauka: what has been on the screen, added up and sent every few heartbeats.

/** How many heartbeats go by between one count sent and the next. */
const EVERY = 10;

export class Played {
    constructor() {
        this.counts = {};
        this.beats = 0;
        this.sending = null;
    }

    /**
     * Adds a slide.
     *
     * @param {string[]} ids what it brings
     * @param {number} seconds how long it lasts
     */
    add(ids, seconds) {
        const counts = this.counts;
        ids.forEach(function (id) {
            const pair = counts[id] || (counts[id] = [0, 0]);
            pair[0]++;
            pair[1] += Math.round(seconds);
        });
    }

    /**
     * What goes with this heartbeat, if anything.
     *
     * @returns {?object} id => [times, seconds]
     */
    take() {
        this.beats++;
        if (this.beats < EVERY || this.sending || !Object.keys(this.counts).length) {
            return null;
        }
        this.beats = 0;
        this.sending = this.counts;
        this.counts = {};
        return this.sending;
    }

    /** It arrived. */
    sent() {
        this.sending = null;
    }

    /** It did not: it goes with the next. */
    failed() {
        const back = this.sending || {};
        const counts = this.counts;
        Object.keys(back).forEach(function (id) {
            const pair = counts[id] || (counts[id] = [0, 0]);
            pair[0] += back[id][0];
            pair[1] += back[id][1];
        });
        this.sending = null;
    }
}
