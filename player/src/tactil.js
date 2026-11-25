// Oksigenia Hechauka: the touch screen, the way of the doors (chosen on 18 November 2026: «Vamos con las
// puertas»). Only on a screen that can be touched (the manifest's screen.touch); without it the screen is the one of
// always and none of this is built.
//
// Two distances. From afar, the rotation of always, with the doors' front under it: four arched doors in the colours of
// the centre, ajar, a thread of warm light in each gap; now and then one opens a little more, as if somebody were
// coming. An hour before a visit of Eguahe, at the top, «¿Vienen a la visita de las 11:00? Los recibe Ana Martín», with
// her face: a question, so that only whoever comes takes it as theirs. Near: the doors of the families and of the
// visitors, and each door its room, with what is looked at on top and what is touched at the foot, between 0.9 and
// 1.4 m from the floor. «Atrás» and «Inicio» always at the foot. Without a touch for screen.touch.idle seconds (60), the
// last ten say so, and the screen goes back to the rotation.
//
// The first touch opens what was touched: a photo of an album opens that album at that photo; the menu, the agenda,
// the open acts, the networks or the library open their door; the welcome opens the visit; anything else, the doors.
// One finger: only the first pointer counts, and nothing is pinched, held or double-touched. What is touched sinks at
// once. Nothing on the screen can be selected, and there is no context menu.
//
// The counts go through played (src/played.js), as what the screen shows: door-<door> once a door closes, with the
// seconds it was open; touch when the screen goes back to the rotation, with how long somebody touched.
//
// Chrome 56 (Tizen 4): no CSS Grid, no gap, and never a flex box inside a <button> (Chrome 56 lays its content out as a
// block and gives it the width of its text): inside a button, written widths and the order of the page.

import {allergenNode, drawn} from './alergenos.js';
import {FOOD} from './comida.js';
import {here} from './zone.js';

/** The doors, in the order of the contract, each with the colour of the skin it wears and its audience. */
export const DOORS = [
    {key: 'menu', group: 'families', colour: 'menu'},
    {key: 'agenda', group: 'families', colour: 'evento'},
    {key: 'photos', group: 'families', colour: 'marca-1'},
    {key: 'notices', group: 'families', colour: 'marca-4'},
    {key: 'library', group: 'families', colour: 'marca-2'},
    {key: 'networks', group: 'families', colour: 'marca-3'},
    {key: 'about', group: 'visitors', colour: 'marca-1'},
    {key: 'visit', group: 'visitors', colour: 'marca-4'},
    {key: 'openacts', group: 'visitors', colour: 'evento'},
    {key: 'centre', group: 'visitors', colour: 'marca-2'},
];

/** The words of the touch screen, in Spanish, for what the site has not sent yet. */
export const WORDS = {
    touch_invite: 'Toquen una puerta y entren',
    touch_more: 'Más puertas',
    touch_title: '¿Qué puerta abren?',
    touch_help: 'Toquen una. Con «Inicio», vuelve lo de siempre.',
    touch_families: 'Del día a día',
    touch_visitors: 'Si nos visitan',
    touch_back: 'Atrás',
    touch_home: 'Inicio',
    touch_still: '¿Siguen ahí? Toquen la pantalla para quedarse',
    touch_back_in: 'Vuelve al inicio en {n} s',
    touch_take: 'Llévenselo al móvil',
    touch_door_menu: 'El comedor',
    touch_door_agenda: 'La agenda',
    touch_door_photos: 'Las fotos',
    touch_door_notices: 'Avisos',
    touch_door_library: 'La biblioteca',
    touch_door_networks: 'Nuestras redes',
    touch_door_about: 'Conoce el centro',
    touch_door_visit: 'La visita de hoy',
    touch_door_openacts: 'Puertas abiertas',
    touch_door_centre: 'Cómo llegar',
    touch_short_menu: 'Comedor',
    touch_short_agenda: 'Agenda',
    touch_short_photos: 'Fotos',
    touch_short_notices: 'Avisos',
    touch_short_library: 'Biblioteca',
    touch_short_networks: 'Redes',
    touch_short_about: 'Conoce el centro',
    touch_short_visit: 'La visita de hoy',
    touch_short_openacts: 'Puertas abiertas',
    touch_short_centre: 'Cómo llegar',
    touch_today: 'Hoy',
    touch_in_canteen: 'En el comedor',
    touch_tap_dish: 'Toquen un plato para ver sus alérgenos',
    touch_has: 'Lleva:',
    touch_has_none: 'No tiene alérgenos anotados.',
    touch_close: 'Cerrar',
    touch_no_canteen: 'Ese día no hay comedor',
    touch_next: 'Lo próximo',
    touch_all_day: 'Todo el día',
    touch_photos_one: '1 foto',
    touch_photos_n: '{n} fotos',
    touch_of: '{n} de {m}',
    touch_day_here: 'Un día aquí',
    touch_see_it: '¿Les apetece verlo?',
    touch_ask_visit: 'Pidan una visita con el móvil: les enseñamos el centro.',
    touch_welcome: '¿Vienen a la visita de las {t}? Los recibe',
    touch_welcome_in: 'Si vienen a la visita de las {t}, los recibe',
    touch_visit_how: 'Cómo será la visita',
    touch_from_to: 'de {a} a {b}',
    touch_turns: 'Turnos',
    touch_signup: 'Inscríbanse con el móvil',
    touch_hours: 'Horario de atención',
    touch_take_me: 'Ábranlo en el móvil y los lleva hasta aquí',
    touch_previous: 'Anterior',
    touch_following: 'Siguiente',
};

const WARN_S = 10;
const WELCOME_BEFORE_MS = 3600000;
const FACE_DOORS = 4;

function el(tag, cls, text) {
    const n = document.createElement(tag);
    // Every button of the touch screen starts from the same blank (.hk-tc-b), one class, so that its own wins.
    if (tag === 'button') {
        cls = 'hk-tc-b' + (cls ? ' ' + cls : '');
    }
    if (cls) {
        n.className = cls;
    }
    if (text !== undefined && text !== null) {
        n.textContent = text;
    }
    return n;
}

function clear(n) {
    while (n.firstChild) {
        n.removeChild(n.firstChild);
    }
}

function capital(w) {
    w = String(w || '');
    return w.charAt(0).toUpperCase() + w.slice(1);
}

function two(n) {
    return (n < 10 ? '0' : '') + n;
}

/** «11:00» of a moment in seconds, by the clocks of the centre. */
export function hourOf(seconds) {
    const d = here(seconds * 1000);
    return two(d.getHours()) + ':' + two(d.getMinutes());
}

/** A word of the screen, with its blanks filled ({n}, {m}, {t}, {a}, {b}). */
export function say(s, key, fill) {
    let w = String((s && s[key]) || WORDS[key] || '');
    Object.keys(fill || {}).forEach(function (k) {
        w = w.split('{' + k + '}').join(String(fill[k]));
    });
    return w;
}

/** The calendar day of a moment (ms), «2026-11-02», by the clocks of the centre. */
export function dayOf(ms) {
    const d = here(ms);
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
}

/**
 * The menus of the coming days, from today: each day its menus, every course with its dishes, each dish with its
 * allergens and the key of its drawing (courses[].icons, from the server; '' or missing for none). Pure.
 *
 * @param {object[]} items the manifest's items
 * @param {string} today «2026-11-02»
 * @param {number} [most] how many days (5)
 * @returns {object[]} [{date, menus: [{name, courses: [{label, dishes: [{text, allergens, icon}]}]}], names, closed}]
 */
export function menuWeek(items, today, most) {
    const byDate = {};
    (items || []).forEach(function (it) {
        if (it.type !== 'menu' || !it.date || it.date < today) {
            return;
        }
        if (byDate[it.date] && (byDate[it.date].order || 0) <= (it.order || 0)) {
            return;
        }
        byDate[it.date] = it;
    });
    return Object.keys(byDate).sort().slice(0, most || 5).map(function (date) {
        const it = byDate[date];
        const menus = (it.menus || []).map(function (m) {
            return {name: m.name || '', courses: (m.courses || []).map(function (c) {
                return {label: c.label || '', dishes: (c.dishes || []).map(function (text, i) {
                    return {text: text, allergens: (c.allergens && c.allergens[i]) || [],
                        icon: (c.icons && c.icons[i]) || ''};
                }).filter(function (d) {
                    return String(d.text).trim();
                })};
            }).filter(function (c) {
                return c.dishes.length;
            })};
        }).filter(function (m) {
            return m.courses.length;
        });
        return {date: date, menus: menus, names: it.allergennames || {}, closed: !!it.closed || !menus.length};
    });
}

/**
 * The visit to welcome now: of today's, the first whose welcome is on (from an hour before it starts until it ends). Pure.
 *
 * @param {object|null} item the manifest's {type: 'visit', visits: [...]}, times in seconds
 * @param {number} now ms
 * @returns {object|null} the visit
 */
export function visitToWelcome(item, now) {
    const list = ((item && item.visits) || []).filter(function (v) {
        const start = (v.timestart || 0) * 1000;
        const end = (v.timeend || 0) * 1000 || start + (v.minutes || 60) * 60000;
        return start && v.hosts && v.hosts.length && now >= start - WELCOME_BEFORE_MS && now < end;
    }).sort(function (a, b) {
        return a.timestart - b.timestart;
    });
    return list[0] || null;
}

/**
 * Today's visits still to come or going on, for the door «La visita de hoy». Pure.
 *
 * @param {object|null} item
 * @param {number} now ms
 * @returns {object[]}
 */
export function visitsLeft(item, now) {
    return ((item && item.visits) || []).filter(function (v) {
        const start = (v.timestart || 0) * 1000;
        const end = (v.timeend || 0) * 1000 || start + (v.minutes || 60) * 60000;
        return start && dayOf(start) === dayOf(now) && now < end;
    }).sort(function (a, b) {
        return a.timestart - b.timestart;
    });
}

/** Whether «Cómo llegar» has anything to say. Pure. */
export function contactHas(contact) {
    return !!(contact && ['address', 'hours', 'phone', 'email', 'web'].some(function (k) {
        return String(contact[k] || '').trim();
    }) || (contact && contact.map && contact.map.url));
}

/** Whether «Conoce el centro» has anything to say. Pure. */
export function aboutHas(about) {
    return !!(about && (String(about.words || '').trim() || (about.day && about.day.length)));
}

/** The address of a web, or '' when it is not one. */
function webOf(url) {
    return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url) ? url : '';
}

/**
 * The address «Llévenselo al móvil» takes to, for a door: screen.touch.links first; for those that carry their own in
 * the contract, theirs (the act's web, the network's, the map's or the centre's web). Pure.
 *
 * @param {string} key
 * @param {object} d the data of the doors (doorData)
 * @returns {string}
 */
export function linkOf(key, d) {
    const links = (d.touch && d.touch.links) || {};
    if (webOf(links[key])) {
        return links[key];
    }
    const contact = d.contact || {};
    if (key === 'openacts') {
        const first = d.openacts && d.openacts.acts && d.openacts.acts[0];
        return webOf(first && first.act.web);
    }
    if (key === 'networks') {
        const channel = (d.channels || [])[0];
        return webOf(d.instagram && d.instagram.web) || webOf(channel && (channel.web || channel.url));
    }
    if (key === 'centre') {
        return webOf(contact.geo) || webOf(contact.web);
    }
    if (key === 'about') {
        return webOf(contact.web);
    }
    return '';
}

/**
 * The doors that come out: those of screen.touch.doors, in its order, that have something to show. Pure.
 *
 * @param {object} d the data of the doors: {touch, menuWeek, agenda, albums, notices, books, channels, instagram, about,
 *     visit, openacts, contact, now}
 * @returns {object[]} the DOORS that come out
 */
export function doorsShown(d) {
    const wanted = (d.touch && d.touch.doors) || [];
    const has = {
        menu: !!(d.menuWeek && d.menuWeek.some(function (day) {
            return !day.closed;
        })),
        agenda: !!(d.agenda && d.agenda.days && d.agenda.days.some(function (day) {
            return day.events.length;
        })),
        photos: !!(d.albums && d.albums.some(function (a) {
            return a.photos.some(function (p) {
                return p.url;
            });
        })),
        notices: !!(d.notices && d.notices.length),
        library: !!(d.books && d.books.books && d.books.books.length),
        networks: !!((d.instagram && d.instagram.posts && d.instagram.posts.length) || (d.channels && d.channels.length)),
        about: aboutHas(d.about),
        visit: visitsLeft(d.visit, d.now).length > 0,
        openacts: !!(d.openacts && d.openacts.acts && d.openacts.acts.length),
        centre: contactHas(d.contact),
    };
    return DOORS.filter(function (door) {
        return wanted.indexOf(door.key) >= 0 && has[door.key];
    }).sort(function (a, b) {
        return wanted.indexOf(a.key) - wanted.indexOf(b.key);
    });
}

// A name on its plate: two lines at most and no word wider than it, smaller to be so.
function fitPlate(sign) {
    sign.style.fontSize = '';
    const cs = window.getComputedStyle(sign);
    const size = parseFloat(cs.fontSize);
    const air = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    for (let k = 1; k >= 0.7; k -= 0.05) {
        sign.style.fontSize = k === 1 ? '' : Math.floor(size * k) + 'px';
        if (sign.scrollWidth <= sign.clientWidth + 1 && sign.offsetHeight <= size * k * 2.3 + air) {
            return;
        }
    }
}

/**
 * The doors of the front, from afar: up to three, the first two of the families and the first of the visitors (or
 * whatever there is), and «Más puertas» when more are left. Pure.
 *
 * @param {object[]} shown doorsShown
 * @returns {{doors: object[], more: boolean}}
 */
export function frontDoors(shown) {
    if (shown.length <= FACE_DOORS) {
        return {doors: shown.slice(), more: false};
    }
    const families = shown.filter(function (x) {
        return x.group === 'families';
    }).slice(0, 2);
    const visitors = shown.filter(function (x) {
        return x.group === 'visitors';
    }).slice(0, 1);
    let out = families.concat(visitors);
    shown.forEach(function (x) {
        if (out.length < FACE_DOORS - 1 && out.indexOf(x) < 0) {
            out.push(x);
        }
    });
    out = shown.filter(function (x) {
        return out.indexOf(x) >= 0;
    });
    return {doors: out, more: true};
}

/**
 * The door a slide of the rotation opens when it is touched, and what with: a photo of an album, its album at that
 * photo. Pure.
 *
 * @param {object|null} choice the slide on screen ({comp, items, extra})
 * @param {object[]} shown doorsShown
 * @returns {{key: string, album?: string, photo?: number}|null}
 */
export function doorOfSlide(choice, shown) {
    if (!choice) {
        return null;
    }
    const keys = shown.map(function (x) {
        return x.key;
    });
    const open = function (key, more) {
        return keys.indexOf(key) >= 0 ? Object.assign({key: key}, more || {}) : null;
    };
    const comp = choice.comp || '';
    const extra = choice.extra || {};
    const item = (choice.items || [])[0];
    if (item && item.album) {
        return open('photos', {album: item.album.id, media: item.media || null});
    }
    if (comp === 'agenda') {
        return open('agenda');
    }
    if (comp === 'menus' || extra.menus) {
        return open('menu');
    }
    if (comp === 'jornadas' || extra.openact || extra.act) {
        return open('openacts');
    }
    if (comp === 'canal' || comp === 'instagram') {
        return open('networks');
    }
    if (comp === 'biblioteca' || extra.books) {
        return open('library');
    }
    return null;
}

/**
 * What comes next in the agenda: today, the first that has not started yet (one that has, or one of all day, is not «next»);
 * after today, the first of the next day with something. If nothing is left, the first there is. Pure.
 *
 * @param {object[]} days the agenda's days (src/agenda.js: {date, today, events: [{time, title, group}]})
 * @param {number} now ms
 * @returns {{day: object, ev: object}|null}
 */
export function nextOf(days, now) {
    const d = here(now);
    const hm = two(d.getHours()) + ':' + two(d.getMinutes());
    for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const events = day.today ? day.events.filter(function (ev) {
            return ev.time && ev.time >= hm;
        }) : day.events;
        if (events.length) {
            return {day: day, ev: events[0]};
        }
    }
    for (let i = 0; i < days.length; i++) {
        if (days[i].events.length) {
            return {day: days[i], ev: days[i].events[0]};
        }
    }
    return null;
}

/**
 * The clock of the touches: near since the first, warning in the last WARN_S seconds, back when idle has gone by. Pure.
 */
export class IdleClock {
    constructor(idle) {
        this.idle = idle > 0 ? idle : 60;
        this.started = null;
        this.last = null;
    }

    touched(now) {
        if (this.started === null) {
            this.started = now;
        }
        this.last = now;
    }

    /** far, near, warn (with the seconds left) or back. */
    state(now) {
        if (this.started === null) {
            return {state: 'far'};
        }
        const left = this.idle - (now - this.last) / 1000;
        if (left <= 0) {
            return {state: 'back'};
        }
        const warn = Math.min(WARN_S, this.idle / 3);
        return left <= warn ? {state: 'warn', left: Math.ceil(left), share: left / warn} : {state: 'near'};
    }

    /** How long somebody touched, in seconds, and the clock at rest again. */
    end(now) {
        const s = this.started !== null ? Math.max(0, Math.round((now - this.started) / 1000)) : 0;
        this.started = null;
        this.last = null;
        return s;
    }
}

/** How far a finger may go between down and up and still be a tap, as a share of the screen's shorter side: some 4 cm on 55". */
const TAP_SHARE = 0.06;

/** After a tap, how long the click the browser makes of it may take: that one is the same finger. */
const SAME_FINGER_MS = 700;

/**
 * Whether a finger that went down and up was a tap, however long it stayed. The browser's own click is stricter: a finger on an
 * infrared frame shakes and is held, and most of its taps gave none. Pure.
 *
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} to
 * @param {number} side the shorter side of the screen, in the same pixels
 * @returns {boolean}
 */
export function isTap(from, to, side) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy) <= side * TAP_SHARE;
}

// ---------- The icons of the doors: a line of 2 on 24 x 24, as the rest of the screen ----------
const ICON = {
    menu: '<circle cx="12" cy="13" r="6.5"/><circle cx="12" cy="13" r="3.2"/><path d="M3 4v5.5a1.5 1.5 0 0 0 3 0V4M4.5 9.5V20M21 4c-1.8 1.2-2.5 3.5-2.5 6v2H21V20"/>',
    agenda: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><rect x="7" y="13" width="3.5" height="3" rx=".6"/>',
    photos: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 3.5 3.5L16 13l4 4"/>',
    notices: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5zM10 20.5a2 2 0 0 0 4 0"/>',
    library: '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>',
    networks: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.6" cy="7.4" r=".9"/>',
    about: '<path d="M3 20.5h18M5 20.5V10l7-5.5 7 5.5v10.5M10 20.5v-5h4v5"/><path d="M12 4.5V2.5l3 1"/>',
    visit: '<circle cx="9" cy="7.5" r="3.2"/><path d="M3.5 20v-1.5A5.5 5.5 0 0 1 9 13a5.5 5.5 0 0 1 5.5 5.5V20"/><path d="M17 8.5c1.5-.2 2.5-1 3-2.5M16.5 12c1.8 0 3.2-.5 4-1.5"/>',
    openacts: '<path d="M6 21V5.5A2.5 2.5 0 0 1 8.5 3h7A2.5 2.5 0 0 1 18 5.5V21M3.5 21h17"/><circle cx="14.5" cy="12.5" r="1"/>',
    centre: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    more: '<path d="M4 11.5L12 4l8 7.5M6.5 9.5V20h11V9.5"/>',
    back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    home: '<path d="M4 11.5L12 4l8 7.5M6.5 9.5V20h11V9.5"/>',
    next: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
    hours: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    email: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
    web: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.4 3.6 5.2 3.6 8.5s-1.1 6.1-3.6 8.5c-2.5-2.4-3.6-5.2-3.6-8.5S9.5 5.9 12 3.5z"/>',
    address: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
};

function icon(key, cls) {
    const span = el('span', 'hk-tc-ic' + (cls ? ' ' + cls : ''));
    span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
        'stroke-linejoin="round" aria-hidden="true">' + (ICON[key] || '') + '</svg>';
    return span;
}


/**
 * The touch screen on the player.
 */
export class Tactil {
    /**
     * @param {object} o {frame, header, stage, after: the node the front goes before, s: the screen's words, media: (ref)
     *     => url or null, qr: (url) => node, played: src/played.js, data: () => the data of the doors, near: () => void
     *     (the rotation stops), far: () => void (it goes on), food: string[] the drawings there are}
     */
    constructor(o) {
        this.o = o;
        this.s = o.s || {};
        this.touch = null;
        this.clock = null;
        this.door = null;
        this.doorSince = 0;
        this.shown = [];
        this.food = o.food || FOOD;
        this.built = false;
    }

    /** The screen's touch, or null: without it, nothing of this is on the screen. */
    configure(touch) {
        this.touch = touch && touch.doors && touch.doors.length ? touch : null;
        if (!this.touch) {
            this.remove();
            return;
        }
        if (!this.built) {
            this.build();
        }
        if (!this.clock || this.clock.idle !== (this.touch.idle || 60)) {
            // Another wait from the panel while somebody touches: the touch so far still counts.
            const before = this.clock;
            this.clock = new IdleClock(this.touch.idle || 60);
            if (before) {
                this.clock.started = before.started;
                this.clock.last = before.last;
            }
        }
        this.refresh();
    }

    get near() {
        return !!(this.built && this.frame.classList.contains('hk-tc-de-cerca'));
    }

    remove() {
        if (!this.built) {
            return;
        }
        // Taken off while somebody touches: the turns, stopped for them, go on.
        const wasNear = this.near;
        [this.welcome, this.front, this.layer].forEach(function (n) {
            if (n && n.parentNode) {
                n.parentNode.removeChild(n);
            }
        });
        this.frame.classList.remove('hk-tactil', 'hk-tc-de-cerca');
        this.built = false;
        if (wasNear && this.o.far) {
            this.o.far();
        }
    }

    build() {
        const o = this.o;
        const self = this;
        this.frame = o.frame;
        this.frame.classList.add('hk-tactil');
        // On the screen every finger is ours: the browser would take one that slides for itself, and it would do nothing. In the
        // panel's preview the page around goes on moving with it.
        this.frame.style.touchAction = this.o.fingers ? 'none' : '';
        this.welcome = el('section', 'hk-tc-bienvenida');
        this.welcome.setAttribute('data-ir', 'visit');
        o.header.parentNode.insertBefore(this.welcome, o.header.nextSibling);
        this.front = el('section', 'hk-tc-fachada');
        o.after.parentNode.insertBefore(this.front, o.after);
        this.layer = el('div', 'hk-tc-cerca');
        this.home = el('div', 'hk-tc-casa');
        this.rooms = el('div', 'hk-tc-salas');
        this.warning = el('div', 'hk-tc-vuelta');
        this.warningWords = el('small');
        this.warningBar = el('i');
        const bar = el('div', 'hk-tc-vuelta-barra');
        bar.appendChild(this.warningBar);
        this.warning.appendChild(document.createTextNode(say(this.s, 'touch_still')));
        this.warning.appendChild(this.warningWords);
        this.warning.appendChild(bar);
        this.bar = el('nav', 'hk-tc-barra');
        const back = el('button', 'hk-tc-boton');
        back.setAttribute('data-atras', '');
        back.appendChild(icon('back'));
        back.appendChild(el('span', '', say(this.s, 'touch_back')));
        const home = el('button', 'hk-tc-boton hk-tc-principal');
        home.setAttribute('data-inicio', '');
        home.appendChild(icon('home'));
        home.appendChild(el('span', '', say(this.s, 'touch_home')));
        this.bar.appendChild(back);
        this.bar.appendChild(home);
        this.layer.appendChild(this.home);
        this.layer.appendChild(this.rooms);
        this.layer.appendChild(this.warning);
        this.layer.appendChild(this.bar);
        this.frame.appendChild(this.layer);
        if (!this.listening) {
            this.listening = true;
            this.frame.addEventListener('pointerdown', function (e) {
                self.down(e);
            });
            this.frame.addEventListener('click', function (e) {
                self.click(e);
            });
            this.frame.addEventListener('pointerup', function (e) {
                self.up(e);
            });
            this.frame.addEventListener('pointercancel', function () {
                self.press = null;
                self.swipeFrom = null;
            });
            this.frame.addEventListener('contextmenu', function (e) {
                if (self.touch) {
                    e.preventDefault();
                }
            });
            // Now and then a door of the front opens a little more, as if somebody were coming.
            this.coming = 0;
            setInterval(function () {
                if (!self.built || self.near) {
                    return;
                }
                const doors = self.front.querySelectorAll('.hk-tc-puerta');
                if (!doors.length) {
                    return;
                }
                const d = doors[self.coming % doors.length];
                self.coming++;
                d.classList.add('hk-tc-asoma');
                setTimeout(function () {
                    d.classList.remove('hk-tc-asoma');
                }, 1300);
            }, 6000);
        }
        this.built = true;
    }

    /** What is new on the front and in the welcome: every turn of the rotation, and every minute. */
    refresh() {
        if (!this.touch) {
            return;
        }
        const d = this.data();
        this.shown = doorsShown(d);
        this.paintWelcome(d);
        this.paintFront(d);
        if (this.near && !this.door) {
            this.paintHome(d);
        }
    }

    data() {
        const d = this.o.data() || {};
        d.touch = this.touch;
        return d;
    }

    word(key, fill) {
        return say(this.s, key, fill);
    }

    // ---------- From afar ----------
    paintWelcome(d) {
        const v = visitToWelcome(d.visit, d.now);
        const host = v && v.hosts[0];
        const key = v ? v.id + '|' + host.name + '|' + v.timestart : '';
        this.welcome.classList.toggle('hk-tc-ve', !!v);
        if (key === this.welcomeKey) {
            return;
        }
        this.welcomeKey = key;
        clear(this.welcome);
        if (!v) {
            return;
        }
        const face = host.img ? this.o.media(host.img) : null;
        if (face) {
            const im = el('img', 'hk-tc-cara');
            im.alt = '';
            im.src = face;
            this.welcome.appendChild(im);
        }
        const words = el('div', 'hk-tc-bienvenida-texto');
        // «Los recibe» stays together: never a word alone on a line.
        words.appendChild(el('small', '', this.word('touch_welcome', {t: hourOf(v.timestart)}).replace(/ (\S+)$/, ' $1')));
        words.appendChild(el('b', '', host.name));
        if (host.role) {
            words.appendChild(el('span', '', host.role));
        }
        this.welcome.appendChild(words);
    }

    doorNode(door, attr) {
        const b = el('button', 'hk-tc-puerta');
        b.setAttribute(attr, door.key);
        b.setAttribute('data-c', door.colour);
        const sign = el('span', 'hk-tc-cartel', door.more ? this.word('touch_more') : this.word('touch_short_' + door.key));
        const portal = el('span', 'hk-tc-portal');
        const leaf = el('span', 'hk-tc-hoja');
        const pane = el('span', 'hk-tc-ventanuco');
        pane.appendChild(icon(door.more ? 'more' : door.key));
        leaf.appendChild(pane);
        leaf.appendChild(el('span', 'hk-tc-pomo'));
        portal.appendChild(leaf);
        portal.appendChild(el('span', 'hk-tc-luz'));
        // From afar the name hangs over the door (upright, it is the plate of a low one); in the corridors it goes under it.
        if (attr === 'data-ir') {
            b.appendChild(portal);
            b.appendChild(sign);
        } else if (this.frame.classList.contains('hk-vertical')) {
            leaf.appendChild(sign);
            b.appendChild(portal);
        } else {
            b.appendChild(sign);
            b.appendChild(portal);
        }
        return b;
    }

    paintFront(d) {
        const f = frontDoors(this.shown);
        const key = f.doors.map(function (x) {
            return x.key;
        }).join(',') + (f.more ? '+' : '');
        if (key === this.frontKey) {
            return;
        }
        this.frontKey = key;
        clear(this.front);
        this.front.appendChild(el('p', 'hk-tc-invita', this.word('touch_invite')));
        const row = el('div', 'hk-tc-puertas');
        const self = this;
        f.doors.forEach(function (door) {
            row.appendChild(self.doorNode(door, 'data-abre'));
        });
        if (f.more) {
            row.appendChild(this.doorNode({key: 'puertas', more: true, colour: 'mas'}, 'data-abre'));
        }
        this.front.appendChild(row);
        if (this.frame.classList.contains('hk-vertical')) {
            Array.prototype.forEach.call(row.querySelectorAll('.hk-tc-cartel'), fitPlate);
        }
        this.front.setAttribute('data-n', String(f.doors.length + (f.more ? 1 : 0)));
    }

    // ---------- Near ----------
    paintHome(d) {
        clear(this.home);
        this.home.appendChild(el('h1', '', this.word('touch_title')));
        this.home.appendChild(el('p', 'hk-tc-ayuda', this.word('touch_help')));
        const today = this.todayCard(d);
        if (today) {
            this.home.appendChild(today);
        }
        const halls = el('div', 'hk-tc-pasillos');
        const self = this;
        [['families', 'touch_families'], ['visitors', 'touch_visitors']].forEach(function (g) {
            const doors = self.shown.filter(function (x) {
                return x.group === g[0];
            });
            if (!doors.length) {
                return;
            }
            const hall = el('div', 'hk-tc-pasillo');
            hall.appendChild(el('p', 'hk-tc-pasillo-rotulo', self.word(g[1])));
            const row = el('div', 'hk-tc-puertas');
            doors.forEach(function (door) {
                row.appendChild(self.doorNode(door, 'data-ir'));
            });
            hall.appendChild(row);
            halls.appendChild(hall);
        });
        this.home.appendChild(halls);
    }

    // Today in three lines, to look at: the first dish, what comes next, the important notice.
    todayCard(d) {
        const lines = [];
        const day = (d.menuWeek || [])[0];
        if (day && day.date === dayOf(d.now) && !day.closed) {
            const dish = day.menus[0].courses[0].dishes[0];
            lines.push([this.word('touch_in_canteen') + ', ', dish.text, '.']);
        }
        const next = this.nextEvent(d);
        // «Today» heads the card only while all it says is today's: with the next event on another day, the date alone.
        const later = !!(next && !next.day.today);
        if (next) {
            lines.push([capital(next.day.label || next.day.weekday) + (next.ev.time ? ', ' + next.ev.time : '') + ': ', next.ev.title,
                next.ev.group ? ' · ' + next.ev.group : '']);
        }
        const important = (d.notices || []).filter(function (n) {
            return n.tone === 'important';
        })[0] || (d.notices || [])[0];
        if (important) {
            lines.push(['', important.title, '']);
        }
        if (!lines.length) {
            return null;
        }
        const card = el('div', 'hk-tc-tarjeta hk-tc-hoy');
        const date = here(d.now);
        const weekday = ((d.s || this.s).days || [])[date.getDay()];
        card.appendChild(el('h2', '', later && weekday ? capital(String(weekday).toLowerCase()) + ' ' + date.getDate() :
            this.word('touch_today') + (weekday ? ', ' + String(weekday).toLowerCase() + ' ' + date.getDate() : '')));
        lines.forEach(function (l) {
            const p = el('p');
            p.appendChild(document.createTextNode(l[0]));
            p.appendChild(el('b', '', l[1]));
            p.appendChild(document.createTextNode(l[2]));
            card.appendChild(p);
        });
        return card;
    }

    nextEvent(d) {
        return nextOf((d.agenda && d.agenda.days) || [], d.now);
    }

    goNear() {
        if (this.near) {
            return;
        }
        // Opened without a finger (the OK key of a remote, a keyboard): the doors still go back by themselves.
        if (this.clock && this.clock.started === null) {
            this.clock.touched(Date.now());
        }
        this.frame.classList.add('hk-tc-de-cerca');
        if (this.o.near) {
            this.o.near();
        }
    }

    /** The doors, near (from afar, or back from a door). */
    openHome() {
        this.closeDoor();
        this.goNear();
        this.paintHome(this.data());
        this.home.classList.add('hk-tc-ve');
    }

    /** A door, with what it was touched for. */
    open(key, what) {
        const d = this.data();
        this.shown = doorsShown(d);
        if (!this.shown.some(function (x) {
            return x.key === key;
        })) {
            this.openHome();
            return;
        }
        this.closeDoor();
        this.goNear();
        this.home.classList.remove('hk-tc-ve');
        const door = DOORS.filter(function (x) {
            return x.key === key;
        })[0];
        const room = el('section', 'hk-tc-sala');
        room.setAttribute('data-sala', key);
        room.setAttribute('data-c', door.colour);
        room.appendChild(this.roomHead(key, d));
        this.fill(room, key, d, what || {});
        clear(this.rooms);
        this.rooms.appendChild(room);
        this.room = room;
        this.door = key;
        this.doorSince = Date.now();
    }

    /** A door that closes counts, once, with the seconds it was open. */
    closeDoor() {
        if (this.door && this.o.played) {
            this.o.played.add(['door-' + this.door], Math.max(1, (Date.now() - this.doorSince) / 1000));
        }
        this.door = null;
        this.room = null;
        if (this.rooms) {
            clear(this.rooms);
        }
    }

    /** Back to the rotation: what somebody touched counts, with how long. */
    goFar() {
        if (!this.near) {
            return;
        }
        this.closeDoor();
        const seconds = this.clock.end(Date.now());
        if (this.o.played) {
            this.o.played.add(['touch'], Math.max(1, seconds));
        }
        this.home.classList.remove('hk-tc-ve');
        this.frame.classList.remove('hk-tc-de-cerca');
        this.warn(null);
        if (this.o.far) {
            this.o.far();
        }
    }

    roomHead(key, d) {
        const head = el('div', 'hk-tc-sala-cabeza');
        const title = this.word('touch_door_' + key);
        const h1 = el('h1');
        h1.appendChild(icon(key, 'hk-tc-insignia'));
        // A title of three words or more never leaves its last one alone on the second line.
        h1.appendChild(document.createTextNode(title.split(' ').length > 2 ? title.replace(/ (\S+)$/, ' $1') : title));
        head.appendChild(h1);
        let link = linkOf(key, d);
        // «Cómo llegar» without a map carries the code of the way here large in the room: not twice.
        if (key === 'centre' && this.wayHere(d)) {
            link = '';
        }
        if (link) {
            const take = el('div', 'hk-tc-llevar');
            take.appendChild(el('span', '', this.word('touch_take')));
            take.appendChild(this.o.qr(link));
            head.appendChild(take);
        }
        return head;
    }

    // ---------- Each room ----------
    fill(room, key, d, what) {
        const fill = {
            menu: this.menuRoom, agenda: this.agendaRoom, photos: this.photosRoom, notices: this.noticesRoom,
            library: this.libraryRoom, networks: this.networksRoom, about: this.aboutRoom, visit: this.visitRoom,
            openacts: this.openactsRoom, centre: this.centreRoom,
        }[key];
        fill.call(this, room, d, what);
    }

    menuRoom(room, d) {
        const week = (d.menuWeek || []).filter(function (day) {
            return !day.closed;
        });
        const big = el('div', 'hk-tc-tarjeta hk-tc-llena hk-tc-plato-hoy');
        const list = el('div', 'hk-tc-tarjeta hk-tc-platos');
        const pop = el('div', 'hk-tc-tarjeta hk-tc-alergia');
        const days = el('div', 'hk-tc-dias');
        room.appendChild(big);
        room.appendChild(list);
        room.appendChild(days);
        room.appendChild(pop);
        const self = this;
        const s = d.s || this.s;
        const dayName = function (day) {
            if (day.date === dayOf(d.now)) {
                return self.word('touch_today') + ', ' + String((s.days || [])[new Date(day.date + 'T12:00').getDay()] || '').toLowerCase() + ' ' +
                    parseInt(day.date.slice(8, 10), 10);
            }
            return capital((s.days || [])[new Date(day.date + 'T12:00').getDay()]) + ' ' + parseInt(day.date.slice(8, 10), 10);
        };
        const show = function (i) {
            const day = week[i];
            const m = day.menus[0];
            clear(big);
            big.appendChild(el('h2', '', dayName(day)));
            const row = el('div', 'hk-tc-platos-grandes');
            m.courses.forEach(function (c) {
                const p = el('div', 'hk-tc-plato-grande');
                const drawing = c.dishes[0].icon;
                if (drawing && self.food.indexOf(drawing) >= 0) {
                    p.appendChild(el('i', 'hk-tc-comida hk-tc-comida-' + drawing));
                }
                p.appendChild(el('small', '', c.label));
                p.appendChild(el('b', '', c.dishes.map(function (x) {
                    return x.text;
                }).join(' · ')));
                row.appendChild(p);
            });
            big.appendChild(row);
            clear(list);
            list.appendChild(el('h2', '', self.word('touch_tap_dish')));
            m.courses.forEach(function (c, ci) {
                c.dishes.forEach(function (dish, di) {
                    const b = el('button', 'hk-tc-plato');
                    b.setAttribute('data-plato', i + ':' + ci + ':' + di);
                    b.appendChild(el('span', 'hk-tc-plato-que', c.label));
                    b.appendChild(el('span', 'hk-tc-plato-nombre', dish.text));
                    const al = el('span', 'hk-alergenos hk-tc-alergenos');
                    dish.allergens.forEach(function (code) {
                        al.appendChild(allergenNode(code, day.names));
                    });
                    b.appendChild(al);
                    b.appendChild(icon('next', 'hk-tc-flecha'));
                    list.appendChild(b);
                });
            });
            [].forEach.call(days.querySelectorAll('button'), function (b) {
                b.classList.toggle('hk-tc-elegido', Number(b.getAttribute('data-dia')) === i);
            });
            pop.classList.remove('hk-tc-ve');
        };
        week.forEach(function (day, i) {
            const b = el('button', 'hk-tc-dia');
            b.setAttribute('data-dia', String(i));
            b.appendChild(el('b', '', capital((s.days_short || [])[new Date(day.date + 'T12:00').getDay()])));
            b.appendChild(el('small', '', String(parseInt(day.date.slice(8, 10), 10))));
            days.appendChild(b);
        });
        this.menuShow = show;
        this.menuDish = function (key) {
            const k = key.split(':').map(Number);
            const day = week[k[0]];
            const dish = day.menus[0].courses[k[1]].dishes[k[2]];
            clear(pop);
            pop.appendChild(el('h2', '', dish.text));
            if (dish.allergens.length) {
                pop.appendChild(el('p', '', self.word('touch_has')));
                const ul = el('ul');
                dish.allergens.forEach(function (code) {
                    const li = el('li');
                    if (drawn(code)) {
                        li.appendChild(allergenNode(code));
                    }
                    li.appendChild(el('span', '', day.names[code] || code));
                    ul.appendChild(li);
                });
                pop.appendChild(ul);
            } else {
                pop.appendChild(el('p', '', self.word('touch_has_none')));
            }
            const close = el('button', 'hk-tc-boton hk-tc-principal hk-tc-cerrar', self.word('touch_close'));
            close.setAttribute('data-cierra', '');
            pop.appendChild(close);
            pop.classList.add('hk-tc-ve');
        };
        show(0);
    }

    agendaRoom(room, d) {
        const self = this;
        const days = ((d.agenda && d.agenda.days) || []).filter(function (day) {
            return day.events.length;
        }).slice(0, 6);
        const next = this.nextEvent(d);
        const big = el('div', 'hk-tc-tarjeta hk-tc-llena hk-tc-proximo');
        big.appendChild(el('small', 'hk-tc-proximo-rotulo', this.word('touch_next')));
        const leaf = el('div', 'hk-tc-hoja-cal');
        leaf.appendChild(el('b', '', capital(((d.s || this.s).days_short || [])[new Date(next.day.date + 'T12:00').getDay()])));
        leaf.appendChild(el('span', '', String(next.day.day)));
        big.appendChild(leaf);
        const words = el('div', 'hk-tc-proximo-que');
        words.appendChild(el('em', '', capital(next.day.label || next.day.weekday) + (next.ev.time ? ', ' + next.ev.time : '')));
        words.appendChild(el('strong', '', next.ev.title));
        if (next.ev.group) {
            words.appendChild(el('span', '', next.ev.group));
        }
        big.appendChild(words);
        const card = el('div', 'hk-tc-tarjeta hk-tc-agenda-dia');
        const row = el('div', 'hk-tc-dias');
        room.appendChild(big);
        room.appendChild(card);
        room.appendChild(row);
        const show = function (i) {
            const day = days[i];
            clear(card);
            card.appendChild(el('h2', '', day.label ? day.label + ', ' + String(day.weekday).toLowerCase() + ' ' + day.day :
                capital(day.weekday) + ' ' + day.day));
            // What is already large above is not read twice: the day's list goes on from the next.
            const others = day.events.filter(function (ev) {
                return ev !== next.ev;
            });
            (others.length ? others : day.events).forEach(function (ev) {
                const r = el('div', 'hk-tc-acto');
                r.appendChild(el('b', '', ev.time || self.word('touch_all_day')));
                const w = el('span', '', ev.title);
                if (ev.group) {
                    w.appendChild(el('small', '', ev.group));
                }
                r.appendChild(w);
                card.appendChild(r);
            });
            [].forEach.call(row.querySelectorAll('button'), function (b) {
                b.classList.toggle('hk-tc-elegido', Number(b.getAttribute('data-dia')) === i);
            });
        };
        days.forEach(function (day, i) {
            const b = el('button', 'hk-tc-dia');
            b.setAttribute('data-dia', String(i));
            b.appendChild(el('b', '', capital(day.weekday).slice(0, 3)));
            b.appendChild(el('small', '', String(day.day)));
            row.appendChild(b);
        });
        this.agendaShow = show;
        show(0);
    }

    photosRoom(room, d, what) {
        const self = this;
        const albums = (d.albums || []).map(function (a) {
            return Object.assign({}, a, {photos: a.photos.filter(function (p) {
                return p.url;
            })});
        }).filter(function (a) {
            return a.photos.length;
        });
        const grid = el('div', 'hk-tc-llena hk-tc-albumes');
        albums.forEach(function (a) {
            const b = el('button', 'hk-tc-tarjeta hk-tc-album');
            b.setAttribute('data-album', a.id);
            const im = el('img');
            im.alt = '';
            im.src = a.photos[0].url;
            b.appendChild(im);
            const name = el('span', 'hk-tc-album-nombre', a.name || a.headline || '');
            name.appendChild(el('small', '', a.photos.length === 1 ? self.word('touch_photos_one') : self.word('touch_photos_n', {n: a.photos.length})));
            b.appendChild(name);
            grid.appendChild(b);
        });
        const viewer = el('div', 'hk-tc-llena hk-tc-visor');
        const frame = el('div', 'hk-tc-tarjeta hk-tc-visor-foto');
        const img = el('img');
        img.alt = '';
        frame.appendChild(img);
        const foot = el('div', 'hk-tc-visor-pie');
        const prev = el('button', 'hk-tc-flecha-t');
        prev.setAttribute('data-paso', '-1');
        prev.setAttribute('aria-label', this.word('touch_previous'));
        prev.appendChild(icon('back'));
        const count = el('div', 'hk-tc-visor-cuenta');
        const nextB = el('button', 'hk-tc-flecha-t');
        nextB.setAttribute('data-paso', '1');
        nextB.setAttribute('aria-label', this.word('touch_following'));
        nextB.appendChild(icon('next'));
        foot.appendChild(prev);
        foot.appendChild(count);
        foot.appendChild(nextB);
        viewer.appendChild(frame);
        viewer.appendChild(foot);
        room.appendChild(grid);
        room.appendChild(viewer);
        this.album = null;
        this.photo = 0;
        this.photoShow = function (id, k) {
            const a = albums.filter(function (x) {
                return String(x.id) === String(id);
            })[0];
            if (!a) {
                return;
            }
            self.album = a;
            self.photo = (k + a.photos.length) % a.photos.length;
            grid.style.display = 'none';
            viewer.style.display = '';
            img.src = a.photos[self.photo].url;
            clear(count);
            count.appendChild(el('b', '', a.name || a.headline || ''));
            count.appendChild(el('small', '', self.word('touch_of', {n: self.photo + 1, m: a.photos.length})));
        };
        this.albumsShow = function () {
            self.album = null;
            grid.style.display = '';
            viewer.style.display = 'none';
        };
        if (what.album) {
            // The photo that was passing: its album, at that photo.
            const a = albums.filter(function (x) {
                return String(x.id) === String(what.album);
            })[0];
            let k = 0;
            if (a && what.media) {
                const u = this.o.media(what.media);
                a.photos.forEach(function (p, i) {
                    if (p.url === u) {
                        k = i;
                    }
                });
            }
            this.photoShow(what.album, k);
        } else {
            this.albumsShow();
        }
    }

    noticesRoom(room, d) {
        const ul = el('ul', 'hk-tc-llena hk-tc-avisos');
        (d.notices || []).slice(0, 5).forEach(function (n) {
            const li = el('li', 'hk-tc-tarjeta' + (n.tone === 'important' ? ' hk-tc-importante' : ''));
            li.appendChild(el('b', '', n.title));
            if (n.body) {
                li.appendChild(el('small', '', n.body));
            }
            ul.appendChild(li);
        });
        room.appendChild(ul);
    }

    libraryRoom(room, d) {
        const self = this;
        const shelf = el('div', 'hk-tc-llena hk-tc-estante');
        if (d.books.label) {
            shelf.appendChild(el('h2', '', d.books.label));
        }
        const row = el('div', 'hk-tc-portadas');
        row.setAttribute('data-n', String(Math.min(6, d.books.books.length)));
        d.books.books.slice(0, 6).forEach(function (b, i) {
            const book = el('div', 'hk-tc-libro');
            const src = b.cover ? self.o.media(b.cover) : null;
            if (src) {
                const im = el('img');
                im.alt = '';
                im.src = src;
                book.appendChild(im);
            } else {
                const spine = el('b', 'hk-tc-lomo', b.title);
                spine.setAttribute('data-c', ['marca-1', 'marca-2', 'marca-3', 'marca-4'][i % 4]);
                book.appendChild(spine);
            }
            const t = el('span', '', b.title);
            if (b.authors) {
                t.appendChild(el('small', '', b.authors));
            }
            book.appendChild(t);
            row.appendChild(book);
        });
        shelf.appendChild(row);
        room.appendChild(shelf);
    }

    networksRoom(room, d) {
        const self = this;
        const box = el('div', 'hk-tc-llena hk-tc-redes');
        // Nine posts, or six when the networks' cards come under them: all whole, nothing squeezed.
        const posts = ((d.instagram && d.instagram.posts) || []).slice(0, (d.channels || []).length ? 6 : 9);
        if (posts.length) {
            const grid = el('div', 'hk-tc-posts');
            posts.forEach(function (p) {
                const m = (p.media || [])[0];
                const src = m ? self.o.media(m) : null;
                if (!src) {
                    return;
                }
                const card = el('div', 'hk-tc-tarjeta hk-tc-post');
                const im = el('img');
                im.alt = '';
                im.src = src;
                card.appendChild(im);
                if (p.caption) {
                    card.appendChild(el('span', '', String(p.caption).split('\n')[0]));
                }
                grid.appendChild(card);
            });
            box.appendChild(grid);
        }
        (d.channels || []).slice(0, 3).forEach(function (c) {
            const card = el('div', 'hk-tc-tarjeta hk-tc-canal');
            card.appendChild(el('b', '', c.name || c.title || ''));
            if (c.text || c.words) {
                card.appendChild(el('small', '', c.text || c.words));
            }
            box.appendChild(card);
        });
        room.appendChild(box);
    }

    aboutRoom(room, d) {
        const self = this;
        const a = d.about;
        if (String(a.words || '').trim() || (a.stages && a.stages.length)) {
            const card = el('div', 'hk-tc-tarjeta hk-tc-conoce');
            if (a.words) {
                card.appendChild(el('p', '', a.words));
            }
            if (a.stages && a.stages.length) {
                const pills = el('div', 'hk-tc-etapas');
                a.stages.forEach(function (st) {
                    const pill = el('span', '', st.name + (st.line ? ' · ' + st.line : ''));
                    pill.setAttribute('data-n', String(st.color || ''));
                    pills.appendChild(pill);
                });
                card.appendChild(pills);
            }
            room.appendChild(card);
        }
        const moments = (a.day || []).filter(function (m) {
            return m.title || m.words;
        });
        if (!moments.length) {
            return;
        }
        const link = linkOf('about', d);
        const steps = moments.length + (link ? 1 : 0);
        const block = el('div', 'hk-tc-llena hk-tc-dia-aqui');
        block.appendChild(el('h2', '', this.word('touch_day_here')));
        const pic = el('div', 'hk-tc-tarjeta hk-tc-momento');
        block.appendChild(pic);
        const foot = el('div', 'hk-tc-visor-pie');
        const prev = el('button', 'hk-tc-flecha-t');
        prev.setAttribute('data-momento', '-1');
        prev.setAttribute('aria-label', this.word('touch_previous'));
        prev.appendChild(icon('back'));
        const count = el('div', 'hk-tc-visor-cuenta');
        const nextB = el('button', 'hk-tc-flecha-t');
        nextB.setAttribute('data-momento', '1');
        nextB.setAttribute('aria-label', this.word('touch_following'));
        nextB.appendChild(icon('next'));
        foot.appendChild(prev);
        foot.appendChild(count);
        foot.appendChild(nextB);
        block.appendChild(foot);
        room.appendChild(block);
        this.moment = 0;
        this.momentShow = function (k) {
            self.moment = (k + steps) % steps;
            clear(pic);
            const m = moments[self.moment];
            if (m) {
                const src = m.media ? self.o.media(m.media) : null;
                pic.classList.toggle('hk-tc-sin-foto', !src);
                if (src) {
                    const im = el('img');
                    im.alt = '';
                    im.src = src;
                    pic.appendChild(im);
                }
                const words = el('div', 'hk-tc-momento-pie');
                words.appendChild(el('b', '', (m.time ? m.time + ' · ' : '') + (m.title || '')));
                if (m.words) {
                    words.appendChild(el('span', '', m.words));
                }
                pic.appendChild(words);
            } else {
                // The last step: to see it for real.
                pic.classList.add('hk-tc-sin-foto');
                pic.appendChild(self.o.qr(link));
                const words = el('div', 'hk-tc-momento-pie');
                words.appendChild(el('b', '', self.word('touch_see_it')));
                words.appendChild(el('span', '', self.word('touch_ask_visit')));
                pic.appendChild(words);
            }
            clear(count);
            count.appendChild(el('b', '', self.word('touch_of', {n: self.moment + 1, m: steps})));
            count.appendChild(el('small', '', self.word('touch_day_here')));
        };
        this.momentShow(0);
    }

    visitRoom(room, d) {
        const v = visitsLeft(d.visit, d.now)[0];
        const host = (v.hosts || [])[0];
        if (host) {
            const who = el('div', 'hk-tc-tarjeta hk-tc-quien');
            const face = host.img ? this.o.media(host.img) : null;
            if (face) {
                const im = el('img');
                im.alt = '';
                im.src = face;
                who.appendChild(im);
            }
            const words = el('div');
            words.appendChild(el('small', '', this.word('touch_welcome_in', {t: hourOf(v.timestart)}).replace(/ (\S+)$/, ' $1')));
            words.appendChild(el('b', '', host.name));
            if (host.role) {
                words.appendChild(el('span', '', host.role));
            }
            if (host.says) {
                words.appendChild(el('q', '', host.says));
            }
            who.appendChild(words);
            room.appendChild(who);
        }
        const how = el('div', 'hk-tc-tarjeta hk-tc-llena hk-tc-como');
        const h2 = el('h2', '', this.word('touch_visit_how'));
        const end = v.timeend || (v.timestart + (v.minutes || 60) * 60);
        h2.appendChild(el('small', '', ' · ' + this.word('touch_from_to', {a: hourOf(v.timestart), b: hourOf(end)})));
        how.appendChild(h2);
        const plan = v.plan ? this.o.media(v.plan) : null;
        if (plan) {
            const im = el('img', 'hk-tc-plano');
            im.alt = '';
            im.src = plan;
            how.appendChild(im);
        }
        if (v.where) {
            how.appendChild(el('p', '', v.where));
        }
        if (v.turns && v.turns.length > 1) {
            const t = el('p', 'hk-tc-turnos', this.word('touch_turns') + ': ' + v.turns.map(function (x) {
                return hourOf(x.timestart);
            }).join(' · '));
            how.appendChild(t);
        }
        room.appendChild(how);
    }

    openactsRoom(room, d) {
        const s = d.s || this.s;
        const acts = d.openacts.acts.map(function (x) {
            return x.act;
        });
        const first = acts[0];
        const web = webOf(first.web);
        // The leaf of the day, as on the slide: with nothing to sign up to, it fills the card.
        const leafOf = function (act) {
            const date = here(act.timestart * 1000);
            const leaf = el('div', 'hk-tc-acto-hoja');
            leaf.appendChild(el('span', '', ((s.days_short || [])[date.getDay()] || '').toUpperCase()));
            leaf.appendChild(el('b', '', String(date.getDate())));
            leaf.appendChild(el('small', '', ((s.months_short || [])[date.getMonth()] || '').toUpperCase()));
            return leaf;
        };
        const whenOf = function (act) {
            return hourOf(act.timestart) + (act.timeend > act.timestart ? ' – ' + hourOf(act.timeend) : '');
        };
        const dayOfIt = function (act) {
            const date = here(act.timestart * 1000);
            return capital((s.days || [])[date.getDay()]) + ' ' + date.getDate();
        };
        const placeOf = function (act) {
            const p = el('p', 'hk-tc-acto-donde');
            p.appendChild(icon('centre'));
            p.appendChild(document.createTextNode(act.place));
            return p;
        };
        const place = el('div', 'hk-tc-llena hk-tc-acto-sitio' + (acts.length > 1 ? ' hk-tc-con-mas' : ''));
        const card = el('div', 'hk-tc-tarjeta hk-tc-acto-grande' + (web ? '' : ' hk-tc-acto-suelto'));
        card.appendChild(leafOf(first));
        const words = el('div', 'hk-tc-acto-texto');
        words.appendChild(el('span', 'hk-tc-cuando', dayOfIt(first) + ' · ' + whenOf(first)));
        // A word of a letter or two never ends a line, nor a dash starts one.
        words.appendChild(el('h2', '', first.name.replace(/\s([-–—])\s/g, '\u00a0$1 ').replace(/(\s[^\s–—-]{1,2})\s/g,
            '$1\u00a0')));
        if (first.place) {
            words.appendChild(placeOf(first));
        }
        card.appendChild(words);
        if (web) {
            const qr = el('div', 'hk-tc-qr-grande');
            qr.appendChild(this.o.qr(first.web));
            qr.appendChild(el('b', '', this.word('touch_signup')));
            card.appendChild(qr);
        }
        place.appendChild(card);
        // The next ones, up to three, each with its leaf.
        if (acts.length > 1) {
            const next = el('div', 'hk-tc-actos');
            acts.slice(1, 4).forEach(function (act) {
                const one = el('div', 'hk-tc-tarjeta hk-tc-acto-otro');
                one.appendChild(leafOf(act));
                const says = el('div');
                says.appendChild(el('b', '', act.name));
                says.appendChild(el('span', '', dayOfIt(act) + ' · ' + whenOf(act)));
                if (act.place) {
                    says.appendChild(el('span', '', act.place));
                }
                one.appendChild(says);
                next.appendChild(one);
            });
            place.appendChild(next);
        }
        room.appendChild(place);
    }

    /** Without a map of its own, the address of the way here (contact.geo), for its code large in the room. */
    wayHere(d) {
        const c = d.contact || {};
        return c.map && this.o.media(c.map) ? '' : webOf(c.geo);
    }

    centreRoom(room, d) {
        const c = d.contact;
        const map = c.map ? this.o.media(c.map) : null;
        const way = this.wayHere(d);
        if (map) {
            const fig = el('div', 'hk-tc-tarjeta hk-tc-llena hk-tc-mapa');
            const im = el('img');
            im.alt = '';
            im.src = map;
            fig.appendChild(im);
            room.appendChild(fig);
        } else if (way) {
            // The way here, on a phone: the code large, and what it does.
            const go = el('div', 'hk-tc-tarjeta hk-tc-llena hk-tc-llevame');
            go.appendChild(this.o.qr(way));
            go.appendChild(el('b', '', this.word('touch_take_me').replace(/ (\S+)$/, '\u00a0$1')));
            room.appendChild(go);
        }
        const card = el('div', 'hk-tc-tarjeta hk-tc-datos' + (map || way ? '' : ' hk-tc-llena'));
        [['address', c.address], ['hours', c.hours, this.word('touch_hours')], ['phone', c.phone], ['email', c.email],
            ['web', c.web ? String(c.web).replace(/^https?:\/\//, '').replace(/\/$/, '') : '']].forEach(function (row) {
            if (!String(row[1] || '').trim()) {
                return;
            }
            const line = el('div', 'hk-tc-dato');
            line.appendChild(icon(row[0]));
            const w = el('span', '', row[1]);
            if (row[2]) {
                w.appendChild(el('small', '', row[2]));
            }
            line.appendChild(w);
            card.appendChild(line);
        });
        room.appendChild(card);
    }

    // ---------- The touches ----------
    down(e) {
        if (!this.touch || !e.isPrimary) {
            return;
        }
        if (!this.near) {
            this.clock.end(Date.now());
        }
        this.clock.touched(Date.now());
        this.warn(null);
        const b = e.target.closest ? e.target.closest('button, [data-ir]') : null;
        if (b) {
            b.classList.add('hk-tc-pulsado');
            setTimeout(function () {
                b.classList.remove('hk-tc-pulsado');
            }, 180);
        }
        this.swiped = false;
        this.press = e.button > 0 ? null : {id: e.pointerId, x: e.clientX, y: e.clientY, target: e.target};
        // A finger on the photo or on a day here may swipe.
        this.swipeFrom = (e.target.closest('.hk-tc-visor-foto') || e.target.closest('.hk-tc-momento')) ? e.clientX : null;
    }

    up(e) {
        if (!this.touch || !e.isPrimary) {
            return;
        }
        const press = this.press;
        const from = this.swipeFrom;
        this.press = null;
        this.swipeFrom = null;
        const dx = from === null || from === undefined ? 0 : e.clientX - from;
        if (Math.abs(dx) < 60) {
            if (press && press.id === e.pointerId && isTap(press, {x: e.clientX, y: e.clientY},
                    Math.min(this.frame.clientWidth, this.frame.clientHeight))) {
                this.tappedAt = Date.now();
                this.tap(press.target);
            }
            return;
        }
        this.swiped = true;
        if (this.album && this.photoShow) {
            this.photoShow(this.album.id, this.photo + (dx < 0 ? 1 : -1));
        } else if (this.momentShow && this.door === 'about') {
            this.momentShow(this.moment + (dx < 0 ? 1 : -1));
        }
    }

    click(e) {
        if (!this.touch) {
            return;
        }
        // The click of a finger that was already attended to when it went up.
        if (this.tappedAt && Date.now() - this.tappedAt < SAME_FINGER_MS) {
            return;
        }
        // The OK key of a remote clicks without a finger down: it is somebody there too, and the doors stay open.
        if (this.near && this.clock) {
            this.clock.touched(Date.now());
        }
        if (this.swiped) {
            this.swiped = false;
            return;
        }
        this.tap(e.target);
    }

    /** What was touched does its thing. */
    tap(t) {
        const at = function (sel) {
            return t.closest ? t.closest(sel) : null;
        };
        let n;
        if (!this.near) {
            if ((n = at('[data-abre]'))) {
                const key = n.getAttribute('data-abre');
                if (key === 'puertas') {
                    this.openHome();
                } else {
                    this.open(key);
                }
                return;
            }
            if (at('.hk-tc-bienvenida')) {
                this.open('visit');
                return;
            }
            // The first touch opens what was touched.
            const choice = this.o.showing ? this.o.showing() : null;
            const slide = doorOfSlide(choice, doorsShown(this.data()));
            if (slide) {
                this.open(slide.key, slide);
            } else {
                this.openHome();
            }
            return;
        }
        if (at('[data-inicio]')) {
            this.goFar();
            return;
        }
        if (at('[data-atras]')) {
            this.back();
            return;
        }
        if ((n = at('[data-ir]'))) {
            this.open(n.getAttribute('data-ir'));
            return;
        }
        if ((n = at('[data-dia]')) && this.door === 'menu') {
            this.menuShow(Number(n.getAttribute('data-dia')));
            return;
        }
        if ((n = at('[data-dia]')) && this.door === 'agenda') {
            this.agendaShow(Number(n.getAttribute('data-dia')));
            return;
        }
        if ((n = at('[data-plato]'))) {
            this.menuDish(n.getAttribute('data-plato'));
            return;
        }
        if (at('[data-cierra]')) {
            this.room.querySelector('.hk-tc-alergia').classList.remove('hk-tc-ve');
            return;
        }
        if ((n = at('[data-album]'))) {
            this.photoShow(n.getAttribute('data-album'), 0);
            return;
        }
        if ((n = at('[data-paso]')) && this.album) {
            this.photoShow(this.album.id, this.photo + Number(n.getAttribute('data-paso')));
            return;
        }
        if ((n = at('[data-momento]'))) {
            this.momentShow(this.moment + Number(n.getAttribute('data-momento')));
        }
    }

    /** «Atrás» undoes the last thing: the allergens, the photo viewer, the door, the doors. */
    back() {
        const pop = this.room && this.room.querySelector('.hk-tc-alergia.hk-tc-ve');
        if (pop) {
            pop.classList.remove('hk-tc-ve');
            return;
        }
        if (this.door === 'photos' && this.album) {
            this.albumsShow();
            return;
        }
        if (this.door) {
            this.openHome();
            return;
        }
        this.goFar();
    }

    /** Every second: the clock of the touches, and the welcome once a minute. */
    tick(now) {
        if (!this.touch || !this.built) {
            return;
        }
        if (this.near) {
            const st = this.clock.state(now);
            if (st.state === 'back') {
                this.goFar();
            } else {
                this.warn(st.state === 'warn' ? st : null);
            }
        }
        const minute = Math.floor(now / 60000);
        if (minute !== this.minute) {
            this.minute = minute;
            this.refresh();
        }
    }

    warn(st) {
        if (!this.warning) {
            return;
        }
        this.warning.classList.toggle('hk-tc-ve', !!st);
        if (st) {
            this.warningWords.textContent = this.word('touch_back_in', {n: st.left});
            this.warningBar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, st.share)).toFixed(3) + ')';
        }
    }
}

