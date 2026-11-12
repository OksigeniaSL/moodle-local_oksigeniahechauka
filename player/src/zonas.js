// «zonas»: two zones at once, one more composition of the rotation and never a fixed layout (Jujol, 12 November 2026). A
// column with a carousel of its own (portrait pictures, the weather, the coming days) beside a wide zone (a landscape
// picture or video, or the card of the screen's place). On a vertical screen the wide zone is a 16:9 band on top and the
// column fills the rest under it. What fails goes, and what stays grows: a column item that does not load is skipped, a
// column with nothing left leaves the whole body to the wide zone, and the other way round.
//
//   <div class="hk-cuerpo hk-capa" data-composicion="zonas">
//     <aside class="hk-zonas-col">
//       <div class="hk-zonas-pase">
//         <div class="hk-zonas-item hk-zonas-actual" data-tipo="foto" data-kb="a"><img></div>
//         <div class="hk-zonas-item" data-tipo="tiempo"><aside class="hk-tercio-tiempo">…</aside></div>
//         <div class="hk-zonas-item" data-tipo="agenda"><div class="hk-zonas-agenda"><div class="hk-zonas-dia">…</div></div></div>
//       </div>
//       <div class="hk-zonas-pie"><p class="hk-zonas-marcas"><i data-n="1"></i>…</p>
//         <div class="hk-zonas-titulos"><p class="hk-zonas-titulo">Girasoles del huerto</p>…</div></div>
//     </aside>
//     <section class="hk-medio hk-zonas-ancha">…</section>   or   <section class="hk-sitio-ficha hk-zonas-ancha">…</section>
//   </div>
//
// Chromium 56: transform and opacity only, flexbox with margins; the carousel by timers, never two texts at once.

import {stage} from './today.js';
import {placeLine, placeState, todayHours, weekRows} from './sitio.js';

/** Seconds of each item of the column, at most and at least. */
const STEP_MOST = 9;
const STEP_LEAST = 7;
/** The slide's seconds: about this long, and never less than the second bound. */
const LONG = 45;
const SHORT = 24;
/** A text never crosses another: the old one goes first, in this long. */
const OUT_MS = 450;

function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) {
        n.className = cls;
    }
    if (text !== undefined && text !== null) {
        n.textContent = text;
    }
    return n;
}

function each(list, fn) {
    for (let i = 0; i < list.length; i++) {
        fn(list[i], i);
    }
}

function remove(n) {
    if (n && n.parentNode) {
        n.parentNode.removeChild(n);
    }
}

/**
 * How long each item stays and how long the slide lasts.
 *
 * @param {number} n items of the column
 * @returns {{step: number, seconds: number}}
 */
export function zonesTiming(n) {
    if (n <= 1) {
        return {step: 0, seconds: SHORT};
    }
    const step = Math.max(STEP_LEAST, Math.min(STEP_MOST, LONG / n));
    return {step, seconds: Math.max(SHORT, Math.min(LONG, Math.round(n * step)))};
}

// The coming days, compact: each day its name, and its events with their hour and colour.
function agendaItem(days, words) {
    const box = el('div', 'hk-zonas-agenda');
    each(days, function (d) {
        const day = el('div', 'hk-zonas-dia');
        const head = el('p', 'hk-zonas-dia-nombre');
        head.appendChild(el('b', '', d.label || d.weekday));
        head.appendChild(document.createTextNode(' ' + (d.label ? (words.lower ? d.weekday.toLowerCase() : d.weekday) + ' ' : '') +
            d.day));
        day.appendChild(head);
        if (d.holiday) {
            const h = el('p', 'hk-zonas-ev hk-zonas-festivo');
            const said = [d.holiday.label || words.holiday, d.holiday.name].filter(Boolean).join(' · ');
            h.appendChild(el('span', 'hk-zonas-ev-titulo', said));
            day.appendChild(h);
        }
        each(d.events || [], function (ev) {
            const line = el('div', 'hk-zonas-ev');
            stage(line, ev.color);
            line.appendChild(el('i', 'hk-zonas-ev-color'));
            const words2 = el('p', 'hk-zonas-ev-texto');
            if (ev.time) {
                words2.appendChild(el('time', '', ev.time));
            }
            words2.appendChild(el('span', 'hk-zonas-ev-titulo', ev.title));
            if (ev.group) {
                words2.appendChild(el('small', 'hk-zonas-ev-grupo', ev.group));
            }
            line.appendChild(words2);
            day.appendChild(line);
        });
        box.appendChild(day);
    });
    return box;
}

/**
 * The card of the screen's place: its name big, open or closed now, today's hours and the week's.
 *
 * @param {object} place screen.place
 * @param {{date: string, min: number, dow: number}} wall
 * @param {object} w the place's words (sitio.js placeWords)
 * @param {object} names {days, lower, date}
 * @returns {HTMLElement}
 */
export function buildPlaceCard(place, wall, w, names) {
    const card = el('section', 'hk-sitio-ficha');
    const words = el('div', 'hk-sitio-ficha-cuerpo');
    words.appendChild(el('p', 'hk-sitio-etiqueta', w.place_hours));
    words.appendChild(el('h2', 'hk-sitio-nombre', place.name || ''));
    const line = placeLine(placeState(place, wall), w, names);
    const state = el('p', 'hk-sitio-estado');
    state.appendChild(el('i', 'hk-sitio-punto'));
    state.appendChild(el('b', '', line.state));
    if (line.more) {
        // The separator only between the two on one line: in two, the second starts clean under the first.
        state.appendChild(el('i', 'hk-sitio-sep', ' · '));
        state.appendChild(el('span', '', line.more));
    }
    words.appendChild(state);
    card.setAttribute('data-estado', line.state === w.place_open ? 'abierto' : 'cerrado');
    const week = el('div', 'hk-sitio-semana');
    const today = el('p', 'hk-sitio-fila hk-sitio-fila-hoy');
    today.appendChild(el('b', '', w.place_today));
    today.appendChild(el('span', '', todayHours(place, wall, w)));
    week.appendChild(today);
    each(weekRows(place, w, names, wall.dow), function (r) {
        const row = el('p', 'hk-sitio-fila' + (r.open ? '' : ' hk-sitio-fila-cerrada') + (r.today ? ' hk-sitio-fila-esta' : ''));
        row.appendChild(el('b', '', r.days));
        row.appendChild(el('span', '', r.hours));
        week.appendChild(row);
    });
    words.appendChild(week);
    card.appendChild(words);
    return card;
}

/**
 * Builds the layer.
 *
 * @param {HTMLElement} c the layer
 * @param {object} o {wide: the wide zone (a .hk-medio slot or the place's card) or null, photos: the column's portrait items,
 *     weather: the weather's node or null, agenda: the coming days (agendaOf's days, today left out) or null, media: function
 *     (ref): url, words: {weather, upcoming, holiday, lower: weekdays in lower case in a sentence}, photoFailed: function
 *     (item) when a picture of the column does not load, failed: function () when the layer has nothing left}
 */
export function buildZones(c, o) {
    const col = el('aside', 'hk-zonas-col');
    const pass = el('div', 'hk-zonas-pase');
    const foot = el('div', 'hk-zonas-pie');
    const marks = el('p', 'hk-zonas-marcas');
    const titles = el('div', 'hk-zonas-titulos');
    foot.appendChild(marks);
    foot.appendChild(titles);
    col.appendChild(pass);
    col.appendChild(foot);
    const entries = [];
    const add = function (node, kind, title) {
        const item = el('div', 'hk-zonas-item');
        item.setAttribute('data-tipo', kind);
        item.appendChild(node);
        pass.appendChild(item);
        const t = el('p', 'hk-zonas-titulo', title || '');
        titles.appendChild(t);
        const m = el('i');
        marks.appendChild(m);
        const entry = {item, title: t, mark: m, kind};
        entries.push(entry);
        return entry;
    };
    const photos = (o.photos || []).map(function (it, k) {
        const img = el('img');
        img.alt = '';
        if (it.focus && it.focus.length === 2) {
            img.style.objectPosition = Math.round(it.focus[0] * 100) + '% ' + Math.round(it.focus[1] * 100) + '%';
        }
        const box = el('div', 'hk-zonas-foto');
        box.appendChild(img);
        return {img, box, item: it, kb: k % 2 ? 'b' : 'a', src: o.media(it.media)};
    });
    // A picture first, the weather, another picture, the coming days, and the other pictures: the kinds take turns.
    const order = [];
    if (photos[0]) {
        order.push(['foto', photos[0]]);
    }
    if (o.weather) {
        order.push(['tiempo', o.weather]);
    }
    if (photos[1]) {
        order.push(['foto', photos[1]]);
    }
    if (o.agenda && o.agenda.length) {
        order.push(['agenda', agendaItem(o.agenda, o.words)]);
    }
    photos.slice(2).forEach(function (p) {
        order.push(['foto', p]);
    });
    order.forEach(function (x) {
        if (x[0] === 'foto') {
            const p = x[1];
            const e = add(p.box, 'foto', (p.item.caption && p.item.caption.title) || '');
            e.item.setAttribute('data-kb', p.kb);
            e.photo = p;
            e.source = p.item;
        } else {
            add(x[1], x[0], x[0] === 'tiempo' ? o.words.weather : o.words.upcoming);
        }
    });
    if (entries.length) {
        c.appendChild(col);
    }
    if (o.wide) {
        o.wide.classList.add('hk-zonas-ancha');
        c.appendChild(o.wide);
    }
    marks.style.display = entries.length > 1 ? '' : 'none';
    // Only words in the column (the coming days, or the weather): on a vertical screen it is as high as they are, and the wide
    // zone above takes the rest; never an empty box under them (Gaudí's review, 12 November 2026).
    if (entries.length === 1 && entries[0].kind !== 'foto') {
        col.classList.add('hk-zonas-col-justa');
    }
    each(entries, function (e, k) {
        e.mark.setAttribute('data-n', String(k % 4 + 1));
    });
    c.hkZones = {col, pass, entries, i: 0, failed: o.failed};
    // The pictures load now: one that fails before its turn simply never comes.
    each(entries, function (e) {
        if (e.photo) {
            e.photo.img.onerror = function () {
                dropEntry(c, e);
                if (o.photoFailed) {
                    o.photoFailed(e.source);
                }
            };
            e.photo.img.src = e.photo.src;
        }
    });
}

// An item of the column that failed: it goes, with its title and its mark; the column goes when it has nothing left.
function dropEntry(c, e) {
    const z = c.hkZones;
    const at = z.entries.indexOf(e);
    if (at === -1) {
        return;
    }
    z.entries.splice(at, 1);
    remove(e.item);
    remove(e.title);
    remove(e.mark);
    if (!z.entries.length) {
        remove(z.col);
        if (!c.querySelector('.hk-zonas-ancha') && z.failed) {
            z.failed();
        }
        return;
    }
    each(z.entries, function (x, k) {
        x.mark.setAttribute('data-n', String(k % 4 + 1));
    });
    z.col.querySelector('.hk-zonas-marcas').style.display = z.entries.length > 1 ? '' : 'none';
    if (z.started && at === z.i) {
        // It was on: the next one now, without waiting for its turn.
        z.i = at % z.entries.length;
        showEntry(c, z.i, null);
    } else if (at < z.i) {
        z.i--;
    }
}

// The item of the column in sight: a picture dissolves over a picture; between texts the old one goes first, and the titles
// under them never cross either.
function showEntry(c, i, old) {
    const z = c.hkZones;
    const e = z.entries[i];
    if (!e) {
        return;
    }
    const onItem = function () {
        if (e.photo && !z.still) {
            // Its slow move starts again from the beginning, without a transition back.
            const img = e.photo.img;
            e.item.classList.add('hk-zonas-sin-paso');
            img.style.webkitTransform = '';
            img.style.transform = '';
            void e.item.offsetWidth;
            e.item.classList.remove('hk-zonas-sin-paso');
        }
        e.item.classList.add('hk-zonas-actual');
        e.mark.classList.add('hk-zonas-actual');
    };
    const onTitle = function () {
        e.title.classList.add('hk-zonas-actual');
    };
    clearTimeout(z.enterTimer);
    clearTimeout(z.titleTimer);
    if (!old || old === e) {
        onItem();
        onTitle();
        return;
    }
    // The old picture keeps where its slow move has got to while it fades.
    if (old.photo && !z.still) {
        const t = getComputedStyle(old.photo.img).transform;
        old.photo.img.style.webkitTransform = t;
        old.photo.img.style.transform = t;
    }
    old.item.classList.remove('hk-zonas-actual');
    old.title.classList.remove('hk-zonas-actual');
    old.mark.classList.remove('hk-zonas-actual');
    const cross = old.kind === 'foto' && e.kind === 'foto';
    old.item.classList.toggle('hk-zonas-cruza', cross);
    e.item.classList.toggle('hk-zonas-cruza', cross);
    z.titleTimer = setTimeout(onTitle, OUT_MS + 50);
    if (cross) {
        onItem();
    } else {
        z.enterTimer = setTimeout(onItem, OUT_MS + 50);
    }
}

/**
 * Once in the page: the first item at once, and the next one every few seconds.
 *
 * @param {HTMLElement} c the layer
 * @param {object} o {still, moved: function () each time the column changes}
 * @returns {number} the seconds of the slide
 */
export function startZones(c, o) {
    const z = c.hkZones;
    if (!z) {
        return SHORT;
    }
    z.still = !!(o && o.still);
    z.started = true;
    const timing = zonesTiming(z.entries.length);
    z.i = 0;
    showEntry(c, 0, null);
    if (timing.step) {
        const turn = function () {
            z.timer = setTimeout(function () {
                if (z.entries.length > 1) {
                    const old = z.entries[z.i];
                    z.i = (z.i + 1) % z.entries.length;
                    showEntry(c, z.i, old);
                    if (o && o.moved) {
                        o.moved();
                    }
                }
                turn();
            }, timing.step * 1000);
        };
        turn();
    }
    c.hkStop = function () {
        clearTimeout(z.timer);
        clearTimeout(z.enterTimer);
        clearTimeout(z.titleTimer);
    };
    return timing.seconds;
}

/**
 * Measured in the page: the coming days, as many as fit and never «and n more»; the titles of the column in one or two lines
 * of a size that fits them, the band as high as the longest; the place's card by steps.
 *
 * @param {HTMLElement} c the layer
 */
export function fitZones(c) {
    const z = c.hkZones;
    if (!z) {
        return;
    }
    // A column as high as its words (vertical) may not push the wide zone under its 16:9: that is the most it may take.
    let most = 0;
    if (z.col.classList.contains('hk-zonas-col-justa') && getComputedStyle(c).flexDirection === 'column') {
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
        most = c.clientHeight - rem * 56.25 - (parseFloat(getComputedStyle(z.col).marginTop) || 0);
    }
    const tall = function () {
        return most > 0 && z.col.offsetHeight > most + 1;
    };
    // The titles first (the band's height counts in the column's): one line at their size, or the smaller one; in two lines
    // at the smaller one, or none.
    let highest = 0;
    each(z.entries, function (e) {
        const t = e.title;
        t.removeAttribute('data-ajuste');
        t.style.display = '';
        if (!t.textContent) {
            return;
        }
        const lines = function () {
            const lh = parseFloat(getComputedStyle(t).lineHeight) || 1;
            return Math.round(t.offsetHeight / lh);
        };
        if (lines() > 1) {
            t.setAttribute('data-ajuste', '1');
        }
        if (lines() > 2 || t.scrollWidth > t.clientWidth + 1) {
            t.style.display = 'none';
            return;
        }
        highest = Math.max(highest, t.offsetHeight);
    });
    const box = c.querySelector('.hk-zonas-titulos');
    if (box) {
        box.style.height = highest + 'px';
        box.style.display = highest ? '' : 'none';
        // A band with nothing to say (one item, no title) does not stay as an empty strip.
        box.parentNode.style.display = highest || z.entries.length > 1 ? '' : 'none';
    }
    // The weather: today always; the next days as many as fit, and the sky in words and the rain before today's degrees.
    each(c.querySelectorAll('.hk-zonas-item > .hk-tercio-tiempo'), function (box) {
        const over = function () {
            return overflows(box) || tall();
        };
        const days = box.querySelectorAll('.hk-tercio-dias .hk-dia-tiempo');
        for (let k = days.length - 1; k >= 0 && over(); k--) {
            remove(days[k]);
        }
        // A day whose name does not fit across goes too: never a weekday cut at the edge.
        each(box.querySelectorAll('.hk-tercio-dias .hk-dia-tiempo'), function (d) {
            const name = d.querySelector('.hk-etiqueta');
            if (name && name.scrollWidth > name.clientWidth + 1) {
                remove(d);
            }
        });
        if (!box.querySelector('.hk-tercio-dias .hk-dia-tiempo')) {
            box.classList.add('hk-zonas-sin-dias');
        }
        each(over() ? box.querySelectorAll('.hk-tercio-hoy .hk-dia-tiempo-lluvia') : [], remove);
        each(over() ? box.querySelectorAll('.hk-tercio-hoy .hk-dia-tiempo-cielo') : [], remove);
    });
    each(c.querySelectorAll('.hk-zonas-agenda'), function (box) {
        const over = function () {
            return overflows(box) || tall();
        };
        let days = box.querySelectorAll('.hk-zonas-dia');
        for (let k = days.length - 1; k > 0 && over(); k--) {
            remove(days[k]);
        }
        // One day that does not fit: its groups go, then its last events, never the first.
        each(over() ? box.querySelectorAll('.hk-zonas-ev-grupo') : [], remove);
        days = box.querySelectorAll('.hk-zonas-ev');
        for (let k = days.length - 1; k > 0 && over(); k--) {
            remove(days[k]);
        }
    });
    const card = c.querySelector('.hk-sitio-ficha');
    if (card) {
        fitPlaceCard(card);
    }
}

/**
 * The place's card fits its zone: the week goes first (today's hours stay), then the name a step smaller each time.
 *
 * @param {HTMLElement} card
 */
export function fitPlaceCard(card) {
    const body = card.querySelector('.hk-sitio-ficha-cuerpo');
    const name = card.querySelector('.hk-sitio-nombre');
    const state = card.querySelector('.hk-sitio-estado');
    // The state in one line, or its second part under the first, without the separator.
    const split = function () {
        state.classList.remove('hk-sitio-estado-dos');
        const b = state.querySelector('b');
        const more = state.querySelector('span');
        if (more && more.offsetTop > b.offsetTop + b.offsetHeight / 2) {
            state.classList.add('hk-sitio-estado-dos');
        }
    };
    const over = function () {
        split();
        return overflows(body) || name.scrollWidth > name.clientWidth + 1;
    };
    // The week goes first, then the name a step smaller each time, and at last the label over it.
    const tries = [['', '0'], ['hk-sitio-sin-semana', '0'], ['hk-sitio-sin-semana', '1'], ['hk-sitio-sin-semana', '2'],
        ['hk-sitio-sin-semana', '3'], ['hk-sitio-sin-semana hk-sitio-sin-etiqueta', '3']];
    for (let t = 0; t < tries.length; t++) {
        card.classList.remove('hk-sitio-sin-semana', 'hk-sitio-sin-etiqueta');
        tries[t][0].split(' ').filter(Boolean).forEach(function (cls) {
            card.classList.add(cls);
        });
        card.setAttribute('data-ajuste', tries[t][1]);
        if (!over()) {
            return;
        }
    }
}

// Whether a box's content overflows it, also when it is centred (which would hide what goes over the top).
function overflows(box) {
    const was = box.style.justifyContent;
    box.style.justifyContent = 'flex-start';
    const out = box.scrollHeight > box.clientHeight + 1;
    box.style.justifyContent = was;
    return out;
}
