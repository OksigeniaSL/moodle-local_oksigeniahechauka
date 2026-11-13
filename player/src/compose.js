// Which composition comes next, and with which pictures or videos: the rule table of the art direction (Gaudí, 31
// October 2026, «Cuándo sale cada una»). Nothing here touches the page, so it is tested on its own.
//
// foto-hoy        a landscape picture or video, and «Today» beside it (under it on a vertical screen)
// vertical-hoy    a portrait one in a slot of its shape, and a wider «Today»
// dos-verticales  two portrait pictures together, and «Today»
// tres-verticales three portrait pictures in a row: with «Today» beside them when they are tall (9:16), over the whole
//                 body when they are a phone's 3:4 or 2:3, so they lose nothing
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
// cumple          whose birthday it is today, with their pictures, by pages
// biblioteca      what has come to the library: a book at a time with its QR, the next ones on the shelf
// celebra        what the library celebrates this week: a moment at a time, with its rosette or its cover
// menus          every menu of the day, the menus in columns and their dishes in rows; often while the canteen serves
// canal           the centre's messaging channel: follow it from the screen, with its QR
// plazos          what falls due in the courses in the coming days, by days and by pages
// tabla           a table of the centre: a spreadsheet or a list, by pages
// reposo          nothing at all to show: the centre, the hour, the date and the weather, under a sky that goes by
// zonas           two zones at once, now and then: a column with a carousel of its own (portrait pictures, the weather, the
//                 coming days) and a wide zone (a landscape picture or video, or the card of the screen's place)
//
// By the distance it is read from (the art direction's 0.7.0): at 3 m, all; at 5 m, all but «semana»; at 8 m, no
// thirds (foto-hoy is foto-sola, a landscape video is foto-completa, «Today» comes one thing at a time) and the
// ticker's sentences come as slides of their own.

import {birthdaysSeconds, birthdaysShow} from './cumple-turnos.js';

/** How many slides go by between one of the birthdays and the next. */
const BIRTHDAY_EVERY = 7;

/** How many slides go by between one of the library and the next. */
const BOOKS_EVERY = 16;

/** How many slides go by between two of every menu of the day: while the canteen serves, and the rest of the day. */
const MENUS_MEAL_EVERY = 3;
const MENUS_EVERY = 12;

/** How many go by between two of what the library celebrates: as its books, and half a round away from them. */
const MOMENTS_EVERY = 16;

/** How many slides go by between one of the channel and the next; the first comes soon, for whoever passes. */
const CHANNEL_EVERY = 14;

/** How many slides go by between one of the deadlines and the next. */
const DEADLINES_EVERY = 12;

/** How many slides go by between one of the tables and the next. */
const TABLES_EVERY = 8;

/** The seconds of the weather alone, from 8 m. */
const WEATHER_ALONE = 10;

/** How many slides go by between one of the two zones and the next, and before the first. */
export const ZONES_EVERY = 9;

/** The seconds of the two zones, before the page measures them (zonas.js says the real ones). */
export const ZONES_SECONDS = 45;

/** The most portrait pictures in the column of the two zones. */
const ZONES_PORTRAITS = 4;

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

/**
 * What the two zones would have now, or null when one of them would be empty: the column needs a portrait picture, the
 * weather or the coming days; the wide zone a landscape picture or video, or the screen's place.
 *
 * @param {object[]} queue
 * @param {number} start where the queue goes on
 * @param {object} o {weather, agendaNext: the days after today have something, place: the screen has a place}
 * @returns {{items: object[], wide: object|null, extra: object}|null}
 */
export function zonesOf(queue, start, o) {
    let wide = null;
    const portraits = [];
    for (let k = 0; k < queue.length; k++) {
        const it = queue[(start + k) % queue.length];
        if (!wide && ratio(it) >= 1.2 && it.layout !== 'full') {
            wide = it;
        } else if (it.type === 'image' && isPortrait(it) && portraits.length < ZONES_PORTRAITS) {
            portraits.push(it);
        }
    }
    const column = portraits.length + (o.weather ? 1 : 0) + (o.agendaNext ? 1 : 0);
    if (!column || (!wide && !o.place)) {
        return null;
    }
    return {items: (wide ? [wide] : []).concat(portraits), wide,
        extra: {wide: !!wide, weather: !!o.weather, agenda: !!o.agendaNext, place: !wide && !!o.place}};
}

// How much the week has to have to come out, and to come out often.
const WEEK_FULL = 4;

/** How many slides go by, at least, between two videos. */
export const VIDEO_GAP = 3;

/**
 * The videos of the day: of those without days of their own, each screen shows only `perDay` a day, the next ones the
 * next day, in turn, so that the more there are the more they share out (a week moves the turn on by one, so that a
 * video does not always fall on the same weekday). Those with days of their own come on their days, besides. A weekend
 * keeps Friday's turn. With `perDay` 0, or no more than that, all of them.
 *
 * @param {object[]} queue the items of the main zone
 * @param {number} perDay
 * @param {string} date «YYYY-MM-DD»
 * @returns {object[]}
 */
export function videosOfDay(queue, perDay, date) {
    const free = queue.filter(function (it) {
        return it.type === 'video' && !(it.when && it.when.days && it.when.days.length && it.when.days.length < 7);
    });
    if (!perDay || free.length <= perDay) {
        return queue;
    }
    const ids = free.map(function (it) {
        return String(it.id);
    }).sort();
    const parts = String(date).split('-');
    const days = Math.floor((Date.UTC(+parts[0], +parts[1] - 1, +parts[2]) - Date.UTC(2024, 0, 1)) / 86400000);
    const week = Math.floor(days / 7);
    const weekday = week * 5 + Math.min(((days % 7) + 7) % 7, 4);
    const start = (weekday * perDay + week) % ids.length;
    const today = {};
    for (let k = 0; k < perDay; k++) {
        today[ids[(start + k) % ids.length]] = true;
    }
    return queue.filter(function (it) {
        return free.indexOf(it) === -1 || today[String(it.id)];
    });
}

export class Composer {
    constructor() {
        this.n = 0;
        this.sinceFull = 9;
        this.sinceWeek = 0;
        this.last = null;
        this.lastId = null;
        this.sameRun = 0;
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
     *     agendaNext: the days after today have something, place: the screen has a place with its hours,
     *     centre: the centre's sentence, when it goes in slides of its own (from 8 m, where there is no ticker),
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
            this.sameRun = comp === this.last ? this.sameRun + 1 : 1;
            this.last = comp;
            this.sinceVideo = items.some(function (it) {
                return it && it.type === 'video';
            }) ? 0 : (this.sinceVideo === undefined ? VIDEO_GAP : this.sinceVideo) + 1;
            if (items.length) {
                this.lastId = items[items.length - 1].id;
            }
            return extra ? {comp, items, seconds, extra} : {comp, items, seconds};
        };
        // The turn of the coming days. From 5 and 8 m, the agenda: «La semana» reads only from close, and there it keeps
        // Mondays and Fridays, when the week is what matters; the other turns are the agenda's.
        const flagDay = !!(o.week && (o.week.weekday === 1 || o.week.weekday === 5));
        // The coming days are always the agenda (Enrique, 2 November 2026: «prefiero el formato agenda»): there is no week table.
        const useAgenda = !!(o.agenda && !o.noToday);
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
            if (useAgenda && this.sinceWeek >= every && (alternate || this.last !== 'solo-hoy') &&
                    this.last !== 'foto-completa') {
                this.sinceWeek = 0;
                return pick('agenda', [], 70);
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
        // What comes by itself has slides of its own: a birthday at once and then one slide in seven, so that nobody passes without
        // seeing their name; the library, one in sixteen. Each turn the next page, which the slide knows how to show.
        this.sinceBirthday = (this.sinceBirthday === undefined ? BIRTHDAY_EVERY : this.sinceBirthday) + 1;
        this.sinceBooks = (this.sinceBooks === undefined ? BOOKS_EVERY / 2 : this.sinceBooks) + 1;
        // The big celebration waits for its photos (o.birthdaysReady, false while some are still on their way), so that
        // nobody gets a creature for a face because the screen had just started.
        if (o.birthdays && birthdaysShow(o.birthdays) && o.birthdaysReady !== false && this.sinceBirthday > BIRTHDAY_EVERY) {
            this.sinceBirthday = 1;
            this.birthdayPage = (this.birthdayPage === undefined ? -1 : this.birthdayPage) + 1;
            return pick('cumple', [], birthdaysSeconds(o.birthdays), {item: o.birthdays, page: this.birthdayPage});
        }
        // Every menu of the day, only when there are several (one is whole in «Today»): often while the canteen serves,
        // now and then the rest of the day. Not right after «Today» with the menu, unless it has waited two slides for it:
        // on a screen with little else, «Today» is every other slide.
        this.sinceMenus = (this.sinceMenus === undefined ? MENUS_EVERY : this.sinceMenus) + 1;
        const menusEvery = o.mealTime ? MENUS_MEAL_EVERY : MENUS_EVERY;
        const afterToday = this.last === 'solo-hoy' && o.menu && this.sinceMenus <= menusEvery + 2;
        if (o.menus && o.menus.menus && o.menus.menus.length > 1 && this.sinceMenus > menusEvery && !afterToday) {
            this.sinceMenus = 1;
            this.menusPage = (this.menusPage === undefined ? -1 : this.menusPage) + 1;
            return pick('menus', [], 15, {item: o.menus, page: this.menusPage});
        }
        if (o.books && this.sinceBooks > BOOKS_EVERY) {
            this.sinceBooks = 1;
            this.bookPage = (this.bookPage === undefined ? -1 : this.bookPage) + 1;
            return pick('biblioteca', [], 15, {item: o.books, page: this.bookPage});
        }
        // What the library celebrates: one moment each time, the next the time after; 12 s, a sentence read standing. Never
        // right after the library's books: two of the library in a row would read as one long slide.
        this.sinceMoments = (this.sinceMoments === undefined ? 0 : this.sinceMoments) + 1;
        if (o.moments && this.sinceMoments > MOMENTS_EVERY && this.last !== 'biblioteca') {
            this.sinceMoments = 1;
            this.momentPage = (this.momentPage === undefined ? -1 : this.momentPage) + 1;
            return pick('celebra', [], 12, {item: o.moments, page: this.momentPage});
        }
        this.sinceChannel = (this.sinceChannel === undefined ? CHANNEL_EVERY - 4 : this.sinceChannel) + 1;
        if (o.channel && this.sinceChannel > CHANNEL_EVERY) {
            this.sinceChannel = 1;
            return pick('canal', [], 15, {item: o.channel});
        }
        this.sinceDeadlines = (this.sinceDeadlines === undefined ? DEADLINES_EVERY / 2 : this.sinceDeadlines) + 1;
        if (o.deadlines && this.sinceDeadlines > DEADLINES_EVERY) {
            this.sinceDeadlines = 1;
            this.deadlinePage = (this.deadlinePage === undefined ? -1 : this.deadlinePage) + 1;
            return pick('plazos', [], 15, {item: o.deadlines, page: this.deadlinePage});
        }
        this.sinceTables = (this.sinceTables === undefined ? TABLES_EVERY / 2 : this.sinceTables) + 1;
        if (o.tables && o.tables.length && this.sinceTables > TABLES_EVERY) {
            this.sinceTables = 1;
            // Each table in turn, and each with its own page.
            this.tableTurn = (this.tableTurn === undefined ? -1 : this.tableTurn) + 1;
            this.tablePages = this.tablePages || {};
            const table = o.tables[this.tableTurn % o.tables.length];
            const page = this.tablePages[table.id] === undefined ? 0 : this.tablePages[table.id] + 1;
            this.tablePages[table.id] = page;
            return pick('tabla', [], 15, {item: table, page});
        }
        // At 8 m the ticker's sentences and the countdown come as slides of their own, one every four. The centre's own
        // sentence is one of them every third time (each time, without others).
        if (far && this.n % 4 === 3) {
            const phrases = o.phrases || [];
            this.sinceType = (this.sinceType || 0) + 1;
            const t = this.sinceType;
            let kind;
            if (phrases.length) {
                kind = o.countdown && t % 3 === 0 ? 'cuenta' : (o.centre && t % 3 === 1 ? 'centro' : 'frase');
            } else if (o.countdown && o.centre) {
                kind = t % 2 ? 'centro' : 'cuenta';
            } else {
                kind = o.countdown ? 'cuenta' : (o.centre ? 'centro' : null);
            }
            if (kind === 'cuenta') {
                return pick('titular', [], 9, {type: 'cuenta'});
            }
            if (kind === 'centro') {
                return pick('titular', [], 9, {type: 'frase', text: o.centre, centre: true});
            }
            if (kind === 'frase') {
                this.phrase = ((this.phrase === undefined ? -1 : this.phrase) + 1) % phrases.length;
                return pick('titular', [], 9, {type: 'frase', text: phrases[this.phrase]});
            }
        }
        // The two zones, now and then and never fixed: a column with its own carousel beside a wide zone (Jujol, 12
        // November 2026). Only when both have something; never on a showcase, never right after what it repeats.
        this.sinceZones = (this.sinceZones === undefined ? 0 : this.sinceZones) + 1;
        if (this.sinceZones > ZONES_EVERY && !o.noToday && this.last !== 'agenda' && this.last !== 'tiempo-tercio') {
            let z = zonesOf(queue, this.position(queue), o);
            if (z) {
                this.sinceZones = 1;
                // A screen with a place gives the wide zone in turns: the picture one time, the place's card the next
                // (the coordinator, 12 November 2026).
                this.zonesTurn = (this.zonesTurn || 0) + 1;
                if (z.wide && o.place && this.zonesTurn % 2 === 0) {
                    z = {items: z.items.slice(1), wide: null, extra: Object.assign({}, z.extra, {wide: false, place: true})};
                }
                const keep = this.lastId;
                const r = pick('zonas', z.items, ZONES_SECONDS, z.extra);
                // The queue goes on after the wide picture; the portraits of the column keep their own turns.
                this.lastId = z.wide ? z.wide.id : keep;
                return r;
            }
        }
        if (!queue.length) {
            const due = weekDue(3, true);
            if (due) {
                return due;
            }
            // Nothing at all to show: a screen at rest, not an empty «Today». Its own QR only until the centre has put anything.
            if (!h && !(o.phrases || []).length) {
                const idle = {qr: o.idleQr || null};
                if (o.idleQrImage) {
                    idle.qrimage = o.idleQrImage;
                }
                return pick('reposo', [], 60, idle);
            }
            return pick('solo-hoy', [], o.menu ? 15 : 12);
        }
        // Mixed: one slide in ten, the wall of an album, from any distance.
        if (o.use === 'mixed' && this.n % 10 === 0) {
            const wall = albumOf(4);
            if (wall) {
                return pick('muro', [], 30, {album: wall.id});
            }
        }
        // Mixed: every other slide, a picture or video with the weather in a third. From 8 m there are no thirds: the
        // weather alone, one slide in four, and the picture keeps its turn instead of going by unseen.
        if (o.use === 'mixed' && o.weather && far && this.n % 4 === 1) {
            return pick('tiempo-tercio', [], WEATHER_ALONE);
        }
        if (o.use === 'mixed' && o.weather && !far && this.n % 2 === 0) {
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
        const theWeek = weekDue(o.week && o.week.things < WEEK_FULL ? 10 : (flagDay ? 5 : 8));
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
        // Portrait pictures are the same shape again and again: three running, with another text, would still look stuck.
        if (this.sameRun >= 2 && h > 0 && this.last === 'vertical-hoy') {
            return pick('solo-hoy', [], o.menu ? 15 : 12);
        }
        let i = this.position(queue);
        // Never two videos close together: one too soon gives its turn to the next thing that is not a video.
        if (queue[i] && queue[i].type === 'video' && this.sinceVideo !== undefined && this.sinceVideo < VIDEO_GAP) {
            for (let k = 1; k < queue.length; k++) {
                if (queue[(i + k) % queue.length].type !== 'video') {
                    i = (i + k) % queue.length;
                    break;
                }
            }
        }
        const it = queue[i];
        const next = queue[(i + 1) % queue.length];
        const a = ratio(it);
        this.sinceFull++;
        // The centre has asked for it: over the whole screen, whatever its shape.
        if (it.layout === 'full') {
            this.sinceFull = 0;
            return pick('foto-completa', [it], it.type === 'video' ? secondsOf(it) : 9);
        }
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
        // Portrait pictures in a row go together, up to three: how many there are says how they load (one beside what leads,
        // two as a pair, three as a row). A video never (one decoder).
        if (isPortrait(it) && it.type === 'image') {
            const run = [it];
            for (let k = 1; k < 3 && k < queue.length; k++) {
                const more = queue[(i + k) % queue.length];
                if (more.type !== 'image' || !isPortrait(more)) {
                    break;
                }
                run.push(more);
            }
            if (run.length === 3) {
                return pick('tres-verticales', run, 14);
            }
            // From afar, on a landscape screen, two portraits are not paired: «Today» has gone, the pair would keep its width
            // and leave half the body empty, and two small captions do not read at 8 m. Each goes on its own, the next turn.
            if (run.length === 2 && !(far && horizontal)) {
                return pick('dos-verticales', run, 12);
            }
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
        return {comp: 'agenda', items: [], seconds: 0};
    }
    if (focus === 'today' || !main.length) {
        return {comp: 'solo-hoy', items: [], seconds: 0};
    }
    return at(main[0]);
}
