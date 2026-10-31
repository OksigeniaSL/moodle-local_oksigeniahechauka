// Which composition comes next, and with which pictures or videos: the rule table of the art direction (Gaudí, 31
// October 2026, «Cuándo sale cada una»). Nothing here touches the page, so it is tested on its own.
//
// foto-hoy        a landscape picture or video, and «Today» beside it (under it on a vertical screen)
// vertical-hoy    a portrait one in a slot of its shape, and a wider «Today»
// dos-verticales  two portrait pictures together, and «Today»
// foto-sola       the picture in the whole body
// solo-hoy        «Today» alone, the menu big, the weather for today and tomorrow
// foto-completa   the picture over the whole screen, with its caption

/** Width over height of an item's picture or video; landscape when it does not say. */
export function ratio(item) {
    const m = (item && item.media) || {};
    return m.width > 0 && m.height > 0 ? m.width / m.height : 16 / 9;
}

/** The nearest slot shape of a portrait or square item, or null for a landscape one. */
export function shapeOf(item) {
    const a = ratio(item);
    if (a >= 1.2) {
        return null;
    }
    if (a >= 0.85) {
        return '1x1';
    }
    if (a >= 0.72) {
        return '3x4';
    }
    if (a >= 0.63) {
        return '2x3';
    }
    return '9x16';
}

export function isPortrait(item) {
    return ratio(item) < 0.85;
}

/** Seconds an item stays: its own duration, ten for a picture, a video's length and its caption's three seconds. */
export function secondsOf(item) {
    if (item.duration > 0) {
        return item.duration;
    }
    if (item.type === 'video') {
        const len = item.media && item.media.duration;
        return len > 0 ? len + 3 : 600;
    }
    return 10;
}

export class Composer {
    constructor() {
        this.n = 0;
        this.sinceFull = 9;
        this.last = null;
        this.lastId = null;
    }

    // Where the queue goes on: after the last item shown, wherever it is now (items come and go with their hours).
    position(queue) {
        if (this.lastId !== null) {
            for (let i = 0; i < queue.length; i++) {
                if (queue[i].id === this.lastId) {
                    return (i + 1) % queue.length;
                }
            }
        }
        return 0;
    }

    /**
     * @param {object[]} queue the pictures and videos that can be shown now, in their order
     * @param {number} today how many things «Today» has (the menu counts as one; each notice and event, one)
     * @param {boolean} horizontal the shape of the screen
     * @param {object} [opts] {menu: «Today» has a menu, noToday: the screen never shows «Today»}
     * @returns {{comp: string, items: object[], seconds: number}}
     */
    next(queue, today, horizontal, opts) {
        const o = opts || {};
        const h = o.noToday ? 0 : today;
        this.n++;
        const pick = (comp, items, seconds) => {
            this.last = comp;
            if (items.length) {
                this.lastId = items[items.length - 1].id;
            }
            return {comp, items, seconds};
        };
        if (!queue.length) {
            return pick('solo-hoy', [], o.menu ? 15 : 12);
        }
        // The moment of «Today»: more often when it has much, less when it has little; never right after the full
        // screen, and it uses no picture of the queue.
        const cadence = h >= 6 ? 4 : (h <= 2 ? 8 : 6);
        if (h > 0 && this.n % cadence === 0 && this.last !== 'foto-completa') {
            return pick('solo-hoy', [], o.menu ? 15 : 12);
        }
        const i = this.position(queue);
        const it = queue[i];
        const next = queue[(i + 1) % queue.length];
        const a = ratio(it);
        this.sinceFull++;
        const fullDue = this.sinceFull > 3 && this.last !== 'solo-hoy';
        if (fullDue && (horizontal ? a >= 1.45 : a < 0.63)) {
            this.sinceFull = 0;
            return pick('foto-completa', [it], it.type === 'video' ? secondsOf(it) : 9);
        }
        if (!horizontal && a < 0.63) {
            return pick('foto-sola', [it], secondsOf(it));
        }
        // Two portrait pictures in a row go together; a video never (one decoder).
        if (isPortrait(it) && it.type === 'image' && next !== it && next.type === 'image' && isPortrait(next)) {
            return pick('dos-verticales', [it, next], 12);
        }
        if (a < 1.2) {
            return pick('vertical-hoy', [it], secondsOf(it));
        }
        return pick(h || !horizontal ? 'foto-hoy' : 'foto-sola', [it], secondsOf(it));
    }
}
