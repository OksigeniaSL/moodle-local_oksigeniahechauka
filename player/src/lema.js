// The centre's own sentence (centre.phrase of the manifest: its motto, what it wants everybody to read): one more sentence
// of the ticker, said whole and set apart, that comes back every few sentences. Nothing here touches the page, so it is
// tested on its own (test/lema.test.js).

/** With this many sentences or more, the centre's comes back after this many of them. */
export const CENTRE_EVERY = 5;

/** With fewer, it comes back after this long, and never twice in a row. */
export const CENTRE_MS = 180000;

/** A fresh count: the sentence has not been shown yet. */
export function centreState() {
    return {since: 0, at: null};
}

/**
 * Whether the centre's sentence is the next one in the ticker.
 *
 * @param {{since: number, at: number|null}} state sentences shown since it last came, and when it came (ms)
 * @param {number} n how many other sentences the ticker has
 * @param {number} now ms
 * @returns {boolean}
 */
export function centreDue(state, n, now) {
    if (!n || state.at === null) {
        return true;
    }
    if (n >= CENTRE_EVERY) {
        return state.since >= CENTRE_EVERY;
    }
    return state.since >= 1 && now - state.at >= CENTRE_MS;
}

/**
 * The count after a sentence has come.
 *
 * @param {{since: number, at: number|null}} state
 * @param {boolean} centre it was the centre's
 * @param {number} now ms
 * @returns {{since: number, at: number|null}}
 */
export function centreAfter(state, centre, now) {
    return centre ? {since: 0, at: now} : {since: state.since + 1, at: state.at};
}
