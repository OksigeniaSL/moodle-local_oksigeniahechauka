// Which composition comes next, and with which pictures or videos: the rule table of the art direction (Gaudí, 31
// October 2026, «Cuándo sale cada una»). Nothing here touches the page, so it is tested on its own.
//
// foto-hoy        a landscape picture or video, and «Today» beside it (under it on a vertical screen)
// vertical-hoy    a portrait one in a slot of its shape, and a wider «Today»
// dos-verticales  two portrait pictures together, and «Today»
// foto-sola       the picture in the whole body
// solo-hoy        «Today» alone, the menu big, the weather for today and tomorrow
// foto-completa   the picture over the whole screen, with its caption
// semana          the next five school days, each with its events
// escaparate      a showcase: the picture or video over the whole screen, its headline big, its web with a QR
// tiempo-tercio   mixed: the picture or video in two thirds, the weather in the other (today big, three days under)

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
        this.sinceWeek = 0;
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
     * @param {object} [opts] {menu: «Today» has a menu, noToday: the screen never shows «Today»,
     *     week: {things: what the week has beyond today, weekday: 1 Monday … 7 Sunday},
     *     use: info, showcase or mixed (what the screen is for now), weather: the weather has the coming days}
     * @returns {{comp: string, items: object[], seconds: number}}
     */
    next(queue, today, horizontal, opts) {
        const o = opts || {};
        const h = o.noToday ? 0 : today;
        this.n++;
        this.sinceWeek++;
        const pick = (comp, items, seconds) => {
            this.last = comp;
            if (items.length) {
                this.lastId = items[items.length - 1].id;
            }
            return {comp, items, seconds};
        };
        // «La semana»: every 8 slides (5 on Mondays and Fridays, when the next week matters; 3 without pictures), only
        // when the week has something beyond today, never right after the moment of «Today» or the full screen.
        const week = o.week && !o.noToday ? o.week : null;
        const weekDue = (every, alternate) => {
            // Without pictures every slide is the moment of «Today»: then the two take turns.
            if (week && week.things > 0 && this.sinceWeek >= every && (alternate || this.last !== 'solo-hoy') &&
                    this.last !== 'foto-completa') {
                this.sinceWeek = 0;
                return pick('semana', [], week.things >= 8 ? 18 : 14);
            }
            return null;
        };
        // A showcase: only pictures and videos, each over the whole screen; one with a web stays long enough to scan
        // its QR. Without any, the centre's own slide.
        if (o.use === 'showcase') {
            if (!queue.length) {
                return pick('escaparate', [], 20);
            }
            const it = queue[this.position(queue)];
            return pick('escaparate', [it], it.web && it.type !== 'video' ? Math.max(15, secondsOf(it)) : secondsOf(it));
        }
        if (!queue.length) {
            return weekDue(3, true) || pick('solo-hoy', [], o.menu ? 15 : 12);
        }
        // Mixed: every other slide, a picture or video with the weather in a third.
        if (o.use === 'mixed' && o.weather && this.n % 2 === 0) {
            const it = queue[this.position(queue)];
            return pick('tiempo-tercio', [it], secondsOf(it));
        }
        // The moment of «Today»: more often when it has much, less when it has little; never right after the full
        // screen or the week, and it uses no picture of the queue.
        const cadence = h >= 6 ? 4 : (h <= 2 ? 8 : 6);
        if (h > 0 && this.n % cadence === 0 && this.last !== 'foto-completa' && this.last !== 'semana') {
            return pick('solo-hoy', [], o.menu ? 15 : 12);
        }
        const theWeek = weekDue(week && (week.weekday === 1 || week.weekday === 5) ? 5 : 8);
        if (theWeek) {
            return theWeek;
        }
        const i = this.position(queue);
        const it = queue[i];
        const next = queue[(i + 1) % queue.length];
        const a = ratio(it);
        this.sinceFull++;
        const fullDue = this.sinceFull > 3 && this.last !== 'solo-hoy' && this.last !== 'semana';
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

/**
 * The slide that shows a draft in the panel's preview, standing still: a picture or video where it would go (or over
 * the whole screen), a notice or an event in «Today» beside the first picture of the screen (or «Today» alone, or the
 * week), a ticker line under the first picture.
 *
 * @param {object} item the draft, as the contract gives an item
 * @param {string} focus main, full, today or week
 * @param {object[]} main the screen's pictures and videos
 * @param {boolean} horizontal
 * @param {string} [use] what the screen is for now: a showcase shows a picture or video as it will be there
 * @returns {{comp: string, items: object[], seconds: number}}
 */
export function draftChoice(item, focus, main, horizontal, use) {
    const at = (it) => {
        const a = ratio(it);
        if (!horizontal && a < 0.63) {
            return {comp: 'foto-sola', items: [it], seconds: 0};
        }
        return {comp: a < 1.2 ? 'vertical-hoy' : 'foto-hoy', items: [it], seconds: 0};
    };
    const isMedia = item && (item.type === 'image' || item.type === 'video');
    if (isMedia && use === 'showcase') {
        return {comp: 'escaparate', items: [item], seconds: 0};
    }
    if (isMedia) {
        return focus === 'full' ? {comp: 'foto-completa', items: [item], seconds: 0} : at(item);
    }
    if (focus === 'week') {
        return {comp: 'semana', items: [], seconds: 0};
    }
    if (focus === 'today' || !main.length) {
        return {comp: 'solo-hoy', items: [], seconds: 0};
    }
    return at(main[0]);
}
