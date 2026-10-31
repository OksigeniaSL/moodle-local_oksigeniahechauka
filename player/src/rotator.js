// Takes turns among the live items of a zone, each for its duration. The list can change at any moment (an item
// starts or ends by the clock, a new manifest arrives): the rotator keeps the current item while it is still live
// and moves on to the one that follows it in order.

export class Rotator {
    /**
     * @param {function(object): number} durationOf seconds an item stays
     */
    constructor(durationOf) {
        this.durationOf = durationOf;
        this.current = null;
        this.since = 0;
    }

    /**
     * The item to show now.
     *
     * @param {object[]} list the live items, in order
     * @param {number} now milliseconds
     * @returns {{item: object|null, changed: boolean}}
     */
    pick(list, now) {
        if (!list.length) {
            const changed = this.current !== null;
            this.current = null;
            return {item: null, changed};
        }
        const at = this.indexOf(list);
        if (at === -1) {
            return this.start(this.following(list), now);
        }
        // The live copy of the item: a new manifest may have changed it under the same id.
        this.current = list[at];
        if ((now - this.since) / 1000 >= this.durationOf(this.current)) {
            const next = list[(at + 1) % list.length];
            if (next.id === this.current.id) {
                this.since = now;
                return {item: this.current, changed: false};
            }
            return this.start(next, now);
        }
        return {item: this.current, changed: false};
    }

    /** Moves on now (a video ended, a picture failed). */
    advance(list, now) {
        if (!list.length) {
            return this.pick(list, now);
        }
        const at = this.indexOf(list);
        const next = at === -1 ? this.following(list) : list[(at + 1) % list.length];
        return this.start(next, now);
    }

    indexOf(list) {
        if (!this.current) {
            return -1;
        }
        for (let i = 0; i < list.length; i++) {
            if (list[i].id === this.current.id) {
                return i;
            }
        }
        return -1;
    }

    // When the current item is gone, the first one after it in order; at the start, the first one.
    following(list) {
        if (!this.current) {
            return list[0];
        }
        const order = this.current.order || 0;
        for (let i = 0; i < list.length; i++) {
            if ((list[i].order || 0) > order) {
                return list[i];
            }
        }
        return list[0];
    }

    start(item, now) {
        this.current = item;
        this.since = now;
        return {item, changed: true};
    }
}

/**
 * Pages of a block that does not fit at once: which page shows now, turning every few seconds.
 *
 * @param {number} count entries
 * @param {number} perPage entries that fit
 * @param {number} now milliseconds
 * @param {number} seconds per page
 */
export function pageAt(count, perPage, now, seconds) {
    if (perPage <= 0 || count <= perPage) {
        return 0;
    }
    const pages = Math.ceil(count / perPage);
    return Math.floor(now / 1000 / seconds) % pages;
}
