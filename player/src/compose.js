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
// apaisado        a landscape video in two thirds with its band, the rest of «Today» in the other
// titular         a sentence (of the ticker, at 8 m) or the countdown, over the whole body in the centre's colour
// agenda          the month and a diary of the next thirty days that goes up by stretches and stops to be read
// fotos-tercio    an album's photos, one at a time, in a third, and what leads in the other two
// muro            three to five photos of an album, one changing at a time; on a showcase, with a poster and its QR
//
// By the distance it is read from (the art direction's 0.7.0): at 3 m, all; at 5 m, all but «semana»; at 8 m, no
// thirds (foto-hoy is foto-sola, a landscape video is foto-completa, «Today» comes one thing at a time) and the
// ticker's sentences come as slides of their own.

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
     *     use: info, showcase or mixed (what the screen is for now), weather: the weather has the coming days,
     *     distance: 3, 5 or 8 (metres), phrases: the ticker's sentences (slides of their own at 8 m),
     *     countdown: «Today» has a countdown, agenda: the next thirty days have something,
     *     albums: [{id, count}], the albums that can be shown}
     * @returns {{comp: string, items: object[], seconds: number}}
     */
    next(queue, today, horizontal, opts) {
        const o = opts || {};
        const h = o.noToday ? 0 : today;
        this.n++;
        this.sinceWeek++;
        const far = o.distance === 8;
        const pick = (comp, items, seconds, extra) => {
            this.last = comp;
            if (items.length) {
                this.lastId = items[items.length - 1].id;
            }
            return extra ? {comp, items, seconds, extra} : {comp, items, seconds};
        };
        // The turn of the coming days. From 5 and 8 m, the agenda: «La semana» reads only from close, and there it keeps
        // Mondays and Fridays, when the week is what matters; the other turns are the agenda's.
        const flagDay = !!(o.week && (o.week.weekday === 1 || o.week.weekday === 5));
        const close = !o.distance || o.distance === 3;
        const useWeek = !!(o.week && !o.noToday && close && o.week.things > 0 && (!o.agenda || flagDay));
        const useAgenda = !!(o.agenda && !o.noToday && !useWeek);
        const albumOf = (min) => {
            const list = (o.albums || []).filter((a) => a.count >= min);
            if (!list.length) {
                return null;
            }
            this.albumTurn = (this.albumTurn || 0) + 1;
            return list[this.albumTurn % list.length];
        };
        // Every 8 slides (5 on Mondays and Fridays; 3 without pictures), only when there is something, never right after the
        // moment of «Today» or the full screen.
        const weekDue = (every, alternate) => {
            // Without pictures every slide is the moment of «Today»: then the two take turns.
            if ((useWeek || useAgenda) && this.sinceWeek >= every && (alternate || this.last !== 'solo-hoy') &&
                    this.last !== 'foto-completa') {
                this.sinceWeek = 0;
                return useWeek ? pick('semana', [], o.week.things >= 8 ? 18 : 14) : pick('agenda', [], 70);
            }
            return null;
        };
        // A showcase: only pictures and videos, each over the whole screen; one with a web stays long enough to scan
        // its QR. Without any, the centre's own slide.
        if (o.use === 'showcase') {
            if (!queue.length) {
                return pick('escaparate', [], 20);
            }
            // One slide in four, the wall of an album, as a poster.
            const poster = this.n % 4 === 0 ? albumOf(4) : null;
            if (poster) {
                return pick('muro', [], 30, {album: poster.id, poster: true});
            }
            const it = queue[this.position(queue)];
            return pick('escaparate', [it], it.web && it.type !== 'video' ? Math.max(15, secondsOf(it)) : secondsOf(it));
        }
        // At 8 m the ticker's sentences and the countdown come as slides of their own, one every four.
        if (far && this.n % 4 === 3) {
            const phrases = o.phrases || [];
            this.sinceType = (this.sinceType || 0) + 1;
            if (o.countdown && (!phrases.length || this.sinceType % 3 === 0)) {
                return pick('titular', [], 9, {type: 'cuenta'});
            }
            if (phrases.length) {
                this.phrase = ((this.phrase === undefined ? -1 : this.phrase) + 1) % phrases.length;
                return pick('titular', [], 9, {type: 'frase', text: phrases[this.phrase]});
            }
        }
        if (!queue.length) {
            return weekDue(3, true) || pick('solo-hoy', [], o.menu ? 15 : 12);
        }
        // Mixed: one slide in ten, the wall of an album, from any distance.
        if (o.use === 'mixed' && this.n % 10 === 0) {
            const wall = albumOf(4);
            if (wall) {
                return pick('muro', [], 30, {album: wall.id});
            }
        }
        // Mixed: every other slide, a picture or video with the weather in a third.
        if (o.use === 'mixed' && o.weather && this.n % 2 === 0) {
            const it = queue[this.position(queue)];
            return pick('tiempo-tercio', [it], secondsOf(it));
        }
        // The moment of «Today»: more often when it has much, less when it has little; never right after the full
        // screen or the week, and it uses no picture of the queue.
        const cadence = h >= 6 ? 4 : (h <= 2 ? 8 : 6);
        if (h > 0 && this.n % cadence === 0 && this.last !== 'foto-completa' && this.last !== 'semana' &&
                this.last !== 'agenda') {
            return pick('solo-hoy', [], o.menu ? 15 : 12);
        }
        const theWeek = weekDue(flagDay ? 5 : 8);
        if (theWeek) {
            return theWeek;
        }
        // An album's photos in a third, instead of a picture beside «Today», one slide in six: never from afar.
        this.sinceAlbum = (this.sinceAlbum === undefined ? 3 : this.sinceAlbum) + 1;
        if (!far && h > 0 && this.sinceAlbum >= 6) {
            const third = albumOf(3);
            if (third) {
                this.sinceAlbum = 0;
                return pick('fotos-tercio', [], 24, {album: third.id});
            }
        }
        const i = this.position(queue);
        const it = queue[i];
        const next = queue[(i + 1) % queue.length];
        const a = ratio(it);
        this.sinceFull++;
        const fullDue = this.sinceFull > 3 && this.last !== 'solo-hoy' && this.last !== 'semana' && this.last !== 'agenda';
        if (fullDue && (horizontal ? a >= 1.45 : a < 0.63)) {
            this.sinceFull = 0;
            return pick('foto-completa', [it], it.type === 'video' ? secondsOf(it) : 9);
        }
        // A landscape video has its own place: two thirds with its band (from afar, the whole screen).
        if (it.type === 'video' && a >= 1.45) {
            return far ? pick('foto-completa', [it], secondsOf(it)) : pick('apaisado', [it], secondsOf(it));
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
        return pick((h || !horizontal) && !far ? 'foto-hoy' : 'foto-sola', [it], secondsOf(it));
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
