// «Hoy cumplen años», without a page: who comes out in this slide, how long it lasts and where the next one goes on.
// Nothing here touches the page, so it is tested on its own (test/cumple.test.js). Gaudí, 7 November 2026.
//
// Nobody: no slide. One to three: the stage, each person alone and big, and with two or three a group photo at the end.
// Four or more: the parade, one person at a time in the centre and the rest hanging from the garland; at most PARADE_MOST
// in a slide, and the next time it goes on where it stopped (kept on the device with the date, so that through the day
// everybody has their moment, also after the nightly restart).

/** Seconds of the slide with a single person. */
export const ALONE = 11;
/** Seconds of each person on the stage, with two or three. */
export const STAGE_EACH = 6;
/** Seconds of the group photo that closes the stage. */
export const GROUP = 5.5;
/** Seconds before the first person, while the layer and the garland come in. */
export const STAGE_INTRO = 0.5;
/** Seconds of each person in the parade: down from the garland, read, back up, and the garland moves on. */
export const PARADE_EACH = 4.6;
/** Seconds of the garland coming in before the first one of the parade. */
export const PARADE_INTRO = 1.7;
/** Seconds after the last one of the parade. */
export const PARADE_OUTRO = 0.5;
/** The most people in one slide of the parade (a usual day, all of them; 6 × 4.6 s + 2.2 s ≈ 30 s). */
export const PARADE_MOST = 5;
/** The most people on the stage; from one more, the parade. */
export const STAGE_MOST = 3;

const KEY = 'hk-cumple-turno';

/** The people of the item. */
export function peopleOf(item) {
    return (item && item.people) || [];
}

/** Whether there is a slide at all: with nobody, there is none. */
export function birthdaysShow(item) {
    return peopleOf(item).length > 0;
}

/** «escenario» (one to three), «desfile» (four or more), or null (nobody). */
export function modeOf(n) {
    if (!n) {
        return null;
    }
    return n <= STAGE_MOST ? 'escenario' : 'desfile';
}

/** How many people come out in one slide. */
export function perSlide(n) {
    return modeOf(n) === 'desfile' ? Math.min(n, PARADE_MOST) : n;
}

/**
 * How long the slide lasts, in whole seconds; 0 with nobody. The composer asks for it before the page is built.
 *
 * @param {object} item {people: [...]}
 * @returns {number}
 */
export function birthdaysSeconds(item) {
    const n = peopleOf(item).length;
    const mode = modeOf(n);
    if (!mode) {
        return 0;
    }
    if (mode === 'escenario') {
        return Math.round(n === 1 ? ALONE : STAGE_INTRO + n * STAGE_EACH + GROUP);
    }
    return Math.round(PARADE_INTRO + perSlide(n) * PARADE_EACH + PARADE_OUTRO);
}

/** What tells a person apart in the list: the id when there is one, else the name and the group. */
export function keyOf(p) {
    if (p && p.id !== undefined && p.id !== null && p.id !== '') {
        return 'i' + p.id;
    }
    return 'n' + String((p && p.name) || '').trim().toLowerCase() + '|' + String((p && p.group) || '').trim().toLowerCase();
}

/** The local day as YYYY-MM-DD. */
export function dayOf(date) {
    const d = date || new Date();
    const two = function (n) {
        return (n < 10 ? '0' : '') + n;
    };
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
}

/**
 * Where the point is kept: the device's localStorage, and in memory when it cannot be used (a private window, a full
 * disk, a browser that refuses it). Either way, the same three calls.
 *
 * @param {object} [ls] a Storage; by default window.localStorage
 * @returns {{get: function(): (object|null), set: function(object), clear: function()}}
 */
export function storeOf(ls) {
    let memory = null;
    const storage = function () {
        try {
            return ls || (typeof window !== 'undefined' ? window.localStorage : null);
        } catch (e) {
            return null;
        }
    };
    return {
        get: function () {
            try {
                const s = storage();
                const raw = s ? s.getItem(KEY) : null;
                if (raw) {
                    return JSON.parse(raw);
                }
            } catch (e) {
                // A broken value is as good as none.
            }
            return memory;
        },
        set: function (v) {
            memory = v;
            try {
                const s = storage();
                if (s) {
                    s.setItem(KEY, JSON.stringify(v));
                }
            } catch (e) {
                // Kept in memory: it lasts until the page reloads.
            }
        },
        clear: function () {
            memory = null;
            try {
                const s = storage();
                if (s) {
                    s.removeItem(KEY);
                }
            } catch (e) {
                // Nothing to clear.
            }
        },
    };
}

/**
 * Where this slide starts: the person the last one left next, if it is still today and still in the list; if not in
 * the list any more, the same place; another day, the first. Without anything kept, the composer's page.
 *
 * @param {Array} people
 * @param {string} today YYYY-MM-DD
 * @param {object} store from storeOf()
 * @param {number} [page] the composer's turn, used only when nothing is kept
 * @returns {number}
 */
export function startOf(people, today, store, page) {
    const n = people.length;
    if (modeOf(n) !== 'desfile') {
        return 0;
    }
    const kept = store ? store.get() : null;
    if (kept && kept.day === today) {
        for (let i = 0; i < n; i++) {
            if (keyOf(people[i]) === kept.next) {
                return i;
            }
        }
        if (typeof kept.at === 'number' && kept.at >= 0) {
            return kept.at % n;
        }
    }
    if (kept && kept.day !== today) {
        return 0;
    }
    return ((page || 0) * perSlide(n)) % n;
}

/**
 * Who comes out in this slide, in order: indices of the list, from where it starts, round the list if it has to.
 *
 * @param {number} n how many people
 * @param {number} from
 * @returns {number[]}
 */
export function orderOf(n, from) {
    const out = [];
    const k = perSlide(n);
    for (let i = 0; i < k; i++) {
        out.push((from + i) % n);
    }
    return out;
}

/**
 * Once a person has had their moment, the next one is kept, so that a slide cut short (an urgent notice, a restart)
 * gives their moment again to whoever did not finish it.
 *
 * @param {Array} people
 * @param {string} today
 * @param {object} store
 * @param {number} done the index of the one who has just had their moment
 */
export function keepNext(people, today, store, done) {
    const n = people.length;
    if (!store || !n) {
        return;
    }
    const at = (done + 1) % n;
    store.set({day: today, next: keyOf(people[at]), at: at, n: n});
}
