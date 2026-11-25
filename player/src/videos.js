// How the videos get to this screen. A kept video is served by the service worker under its own address («kept»), but some
// televisions (Samsung with Tizen 4) hand the address to a player of their own, which asks the network for it, past the worker:
// there it does not exist, and the still stays for the whole slide with no error. Then the file itself is given, as an object of
// the page's («memory»), and where that player cannot read one either, an address of the server's that needs no key («stream»:
// signed, for this screen and this file, for a few days). A screen where none of them moves shows no videos for the rest of the
// day, and says so.

const KEY = 'videos';

/** The ways, in the order they are tried. */
export const WAYS = ['kept', 'memory', 'stream'];

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
        this.way = WAYS.indexOf(was.way) !== -1 ? was.way : WAYS[0];
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
        this.keep.set(KEY, JSON.stringify({way: this.way, sure: this.sure, rest: this.rest}));
    }

    /** Whether the videos go today. */
    goes(day) {
        return this.rest !== day;
    }

    /**
     * The ways to try with a video, in order: only the one that works, once one has.
     *
     * @returns {string[]}
     */
    ways() {
        return this.sure ? [this.way] : WAYS.slice();
    }

    /** A video moved, given this way. */
    moved(way) {
        this.moves++;
        this.fails = 0;
        if (this.way !== way || !this.sure || this.rest) {
            this.way = way;
            this.sure = true;
            this.rest = '';
            this.write();
        }
    }

    /**
     * A video stood still every way it was given.
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
        this.way = WAYS[0];
        this.sure = false;
        this.rest = day;
        this.write();
        return true;
    }

    /** For the heartbeat, once there is anything to say. */
    report(day) {
        if (!this.moves && !this.stuck && !this.sure && this.goes(day)) {
            return null;
        }
        return {way: this.way, moved: this.moves, stuck: this.stuck, rest: !this.goes(day)};
    }
}
