// How the videos get to this screen. A kept video is served by the service worker under its own address, but some televisions
// (Samsung with Tizen 4) hand the address to a player of their own, which asks the network for it, past the worker: there it
// does not exist, and the still stays for the whole slide with no error. Then the same file is given from the device's store
// as an object of the page's («memory»). A screen where neither moves shows no videos for the rest of the day, and says so.

const KEY = 'video';

/** How long a video may stand without moving after it is told to play. */
export const STUCK_MS = 8000;

/** How many in a row have to stand still before the videos rest: more where one has moved before. */
const ENOUGH = 2;
const ENOUGH_SURE = 4;

export class VideoWay {
    /**
     * @param {object} keep {get(name), set(name, value)}: what stays between restarts
     */
    constructor(keep) {
        this.keep = keep;
        const was = this.read();
        this.memory = !!was.memory;
        this.sure = !!was.sure;
        this.rest = was.rest || '';
        this.fails = 0;
        this.moves = 0;
        this.stuck = 0;
    }

    read() {
        try {
            return JSON.parse(this.keep.get(KEY) || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    write() {
        this.keep.set(KEY, JSON.stringify({memory: this.memory, sure: this.sure, rest: this.rest}));
    }

    /** Whether the videos go today. */
    goes(day) {
        return this.rest !== day;
    }

    /** A video moved, given this way. */
    moved(memory) {
        this.moves++;
        this.fails = 0;
        if (this.memory !== memory || !this.sure || this.rest) {
            this.memory = memory;
            this.sure = true;
            this.rest = '';
            this.write();
        }
    }

    /**
     * A video stood still every way it could be given.
     *
     * @param {string} day today
     * @returns {boolean} whether the videos rest from now on
     */
    failed(day) {
        this.stuck++;
        this.fails++;
        if (this.fails < (this.sure ? ENOUGH_SURE : ENOUGH)) {
            return false;
        }
        // Tomorrow it starts over, from the worker's address: a television that was updated may do it by then.
        this.fails = 0;
        this.memory = false;
        this.sure = false;
        this.rest = day;
        this.write();
        return true;
    }

    /** For the heartbeat, once there is anything to say. */
    report(day) {
        if (!this.moves && !this.stuck && !this.memory && this.goes(day)) {
            return null;
        }
        return {way: this.memory ? 'memory' : 'kept', moved: this.moves, stuck: this.stuck, rest: !this.goes(day)};
    }
}
