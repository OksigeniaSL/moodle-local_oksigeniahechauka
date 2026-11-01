// The agenda that goes up (the art direction's «agenda.css», Gaudí, 1 November 2026): the month with its days marked and
// a diary of the next thirty days. It rises by stretches and stops to be read: what moves is what reads worst. From 8 m,
// and 5 m behind glass, the month and the diary take turns over the whole body. Nothing is ever cut: at a stop, what does
// not fit whole does not show. From the art direction's demo: construirMes, construirAgenda, partirDias, paradasAgenda,
// calendarioEnParada, irAParada, arrancarAgenda. Measured with the layer in the page.

import {stage} from './today.js';

/** The most events by the distance it is read from. */
export const AGENDA_TOP = {3: 24, 5: 16, 8: 10};

/** How many days ahead the diary looks. */
export const AGENDA_DAYS = 30;

const FEW = 3;

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

function clear(n) {
    while (n.firstChild) {
        n.removeChild(n.firstChild);
    }
}

function capital(t) {
    return t.charAt(0).toUpperCase() + t.slice(1);
}

// --- The month ---------------------------------------------------------------------------------------------------

function buildMonth(m, s) {
    const x = el('div', 'hk-mes');
    x.setAttribute('data-mes', m.year + '-' + (m.month < 10 ? '0' : '') + m.month);
    const t = el('h3', 'hk-mes-titulo', capital((s.months || [])[m.month - 1] || ''));
    t.appendChild(el('small', '', String(m.year)));
    x.appendChild(t);
    const names = el('div', 'hk-mes-nombres');
    each(s.letters || [], function (l, i) {
        const n = el('span', '', l);
        if (i >= 5) {
            n.setAttribute('data-finde', '');
        }
        names.appendChild(n);
    });
    x.appendChild(names);
    const weeks = el('div', 'hk-mes-semanas');
    each(m.weeks, function (week) {
        const row = el('div', 'hk-mes-semana');
        each(week, function (d, i) {
            const c = el('span', 'hk-mes-dia' + (d ? '' : ' hk-mes-vacio'));
            if (d) {
                c.setAttribute('data-fecha', d.date);
                if (i >= 5) {
                    c.setAttribute('data-finde', '');
                }
                if (d.today) {
                    c.setAttribute('data-hoy', '');
                }
                if (d.past) {
                    c.setAttribute('data-pasado', '');
                }
                if (d.holiday) {
                    c.setAttribute('data-festivo', '');
                }
                c.appendChild(el('b', '', String(d.day)));
                const marks = el('span', 'hk-mes-marcas');
                each(d.marks, function (color) {
                    const dot = el('i');
                    stage(dot, color);
                    marks.appendChild(dot);
                });
                if (d.marks.length) {
                    c.classList.add('hk-mes-con-algo');
                }
                c.appendChild(marks);
            }
            row.appendChild(c);
        });
        weeks.appendChild(row);
    });
    weeks.appendChild(el('i', 'hk-mes-foco'));
    x.appendChild(weeks);
    return x;
}

// --- The diary ---------------------------------------------------------------------------------------------------

function buildEvent(e) {
    if (e.time && !e.until) {
        const d = el('div', 'hk-linea');
        d.appendChild(el('b', 'hk-linea-cuando', e.time));
        stage(d, e.color);
        const t = el('span', 'hk-linea-texto');
        t.appendChild(el('span', 'hk-linea-titulo', e.title));
        if (e.group) {
            t.appendChild(el('small', '', e.group));
        }
        d.appendChild(t);
        return d;
    }
    const b = el('div', 'hk-agenda-banda');
    stage(b, e.color);
    if (e.until) {
        b.setAttribute('data-sigue', '');
    }
    b.appendChild(el('b', '', e.title));
    const said = [e.group, e.time && e.until ? e.time : '', e.until].filter(Boolean).join(' · ');
    if (said) {
        b.appendChild(el('small', '', said));
    }
    return b;
}

function buildDay(d, few, s) {
    const a = el('article', 'hk-agenda-dia');
    a.setAttribute('data-fecha', d.date);
    if (d.today) {
        a.setAttribute('data-hoy', '');
    }
    const h = el('header', 'hk-agenda-cabeza');
    h.appendChild(el('b', 'hk-agenda-num', String(d.day)));
    const name = el('p', 'hk-agenda-nombre');
    if (d.label) {
        name.appendChild(el('span', 'hk-agenda-marca', d.label));
    } else {
        name.appendChild(document.createTextNode(d.weekday));
    }
    if (few && d.far > 1 && s.agenda_in) {
        name.appendChild(el('small', '', s.agenda_in.replace('%d', String(d.far))));
    }
    h.appendChild(name);
    a.appendChild(h);
    const list = el('div', 'hk-agenda-eventos');
    if (d.holiday) {
        const r = el('div', 'hk-agenda-rayas');
        const p = el('p');
        if (d.holiday.label) {
            p.appendChild(el('small', '', d.holiday.label));
        }
        p.appendChild(el('b', '', d.holiday.name));
        if (d.holiday.until) {
            p.appendChild(el('em', '', d.holiday.until));
        }
        r.appendChild(p);
        list.appendChild(r);
    }
    each(d.events, function (e) {
        list.appendChild(buildEvent(e));
    });
    a.appendChild(list);
    return a;
}

/**
 * Fills an agenda's layer.
 *
 * @param {HTMLElement} c the layer
 * @param {object} data {agenda: agendaOf(), monthOf: function («YYYY-MM-DD»), today}
 * @param {object} s the screen's words
 */
export function buildAgenda(c, data, s) {
    const a = data.agenda;
    const few = a.count <= FEW;
    if (few) {
        c.setAttribute('data-densidad', 'poca');
    }
    const panel = el('section', 'hk-agenda-mes');
    const months = [data.today];
    each(a.days, function (d) {
        if (d.date.slice(0, 7) !== months[months.length - 1].slice(0, 7)) {
            months.push(d.date);
        }
    });
    each(months, function (m, i) {
        const x = buildMonth(data.monthOf(m), s);
        if (i === 0) {
            x.classList.add('hk-mes-activo');
        }
        panel.appendChild(x);
    });
    c.appendChild(panel);
    const list = el('section', 'hk-agenda-lista');
    if (!a.days.length) {
        const none = el('div', 'hk-agenda-nada');
        none.appendChild(el('h3', '', s.agenda_quiet_title || ''));
        none.appendChild(el('p', '', s.agenda_quiet || ''));
        list.appendChild(none);
        c.appendChild(list);
        return;
    }
    const track = el('div', 'hk-agenda-pista');
    each(a.days, function (d, i) {
        const b = el('div', 'hk-agenda-bloque');
        // The first month is the calendar's title; a month's name only where it changes.
        if (d.month && i > 0) {
            b.appendChild(el('p', 'hk-agenda-cambio', capital(d.month)));
        }
        b.appendChild(buildDay(d, few, s));
        track.appendChild(b);
    });
    let foot = '';
    if (a.more > 0 && s.agenda_more) {
        foot = s.agenda_more.replace('%d', String(a.more));
    } else if (few && s.agenda_nomore) {
        const month = parseInt(a.last.slice(5, 7), 10) - 1;
        const written = (s.date_format || '{d} {m}').replace('{d}', parseInt(a.last.slice(8, 10), 10))
            .replace('{m}', (s.months || [])[month] || '');
        foot = s.agenda_nomore.replace('%s', written);
    }
    if (foot) {
        track.appendChild(el('p', 'hk-agenda-pie', foot));
    }
    list.appendChild(track);
    c.appendChild(list);
}

// --- Its stops ---------------------------------------------------------------------------------------------------

// A day that does not fit whole in the window goes on in another block under the same header: no line is cut.
function splitDays(track, high) {
    each(track.querySelectorAll('.hk-agenda-bloque'), function (block) {
        let b = block;
        let day = b.querySelector('.hk-agenda-dia');
        while (b.offsetHeight > high) {
            const events = day.querySelector('.hk-agenda-eventos');
            const kids = events.children;
            const rest = document.createDocumentFragment();
            const fresh = el('div', 'hk-agenda-bloque');
            const copy = day.cloneNode(true);
            const events2 = copy.querySelector('.hk-agenda-eventos');
            clear(events2);
            fresh.appendChild(copy);
            const going = [];
            for (let i = kids.length - 1; i > 0 && b.offsetHeight > high; i--) {
                going.unshift(kids[i]);
                events.removeChild(kids[i]);
            }
            if (!going.length) {
                return;
            }
            each(going, function (x) {
                rest.appendChild(x);
            });
            events2.appendChild(rest);
            track.insertBefore(fresh, b.nextSibling);
            b = fresh;
            day = copy;
        }
    });
}

function linesOfBlock(b) {
    return b.querySelectorAll('.hk-linea, .hk-agenda-banda, .hk-agenda-rayas');
}

// getBoundingClientRect is scaled when a screen is drawn smaller (the panel's preview); offsets are not.
function scaleOf(e) {
    return e.getBoundingClientRect().height / (e.offsetHeight || 1) || 1;
}

/* The stops. Rising (3 and 5 m), each one goes up to the first block past half the window and keeps the blocks that were
   below, so whoever is reading does not lose the thread. By pages (8 m, and still at any distance) each one is a new page,
   by a fade. At a stop, what does not fit whole is hidden, line by line. The hold grows with what is new. */
function stopsOf(track, high, byPage, distance) {
    const blocks = track.children;
    const stops = [];
    let i = 0;
    let seen = 0;
    const base = distance === 3 ? 4 : 5;
    const perLine = distance === 3 ? 0.8 : 1;
    let order = 0;
    each(blocks, function (b) {
        each(linesOfBlock(b), function (l) {
            order++;
            l.hkOrder = order;
        });
    });
    while (i < blocks.length) {
        const top = blocks[i].offsetTop;
        let last = i;
        let part = null;
        let farthest = 0;
        for (let k = i; k < blocks.length; k++) {
            const fits = blocks[k].offsetTop + blocks[k].offsetHeight - top <= high + 1;
            const ls = linesOfBlock(blocks[k]);
            if (fits) {
                last = k;
                if (ls.length) {
                    farthest = ls[ls.length - 1].hkOrder;
                }
                continue;
            }
            // The day that does not fit: as many of its lines as do, if at least one. The closing line, whole or not at all.
            if (!ls.length) {
                break;
            }
            let n = 0;
            const box = blocks[k].getBoundingClientRect();
            const scale = scaleOf(blocks[k]);
            const head = blocks[k].querySelector('.hk-agenda-cabeza').getBoundingClientRect();
            const air = 1.6 * parseFloat(window.getComputedStyle(document.documentElement).fontSize);
            for (let q = 0; q < ls.length; q++) {
                const r = ls[q].getBoundingClientRect();
                const under = blocks[k].offsetTop + (Math.max(r.bottom, head.bottom) - box.top) / scale;
                if (under - top <= high - air) {
                    n = q + 1;
                    farthest = ls[q].hkOrder;
                } else {
                    break;
                }
            }
            if (n > 0) {
                part = {block: k, lines: n};
            }
            break;
        }
        stops.push({y: top, from: i, to: last, part,
            hold: distance === 8 ? 9 : Math.min(10, base + perLine * Math.max(0, farthest - seen))});
        seen = Math.max(seen, farthest);
        if (last >= blocks.length - 1) {
            break;
        }
        if (byPage) {
            i = part && part.block > i ? part.block : last + 1;
        } else {
            const limit = part ? part.block : last + 1;
            let next = i + 1;
            while (next < limit && blocks[next].offsetTop - top < high * 0.45) {
                next++;
            }
            i = next;
        }
    }
    if (stops.length) {
        stops[0].hold += 2;
    }
    return stops;
}

// The ring on the day at the top of the list, and the tint on the days the list is showing; the month turns.
function calendarAtStop(c, stop) {
    const track = c.querySelector('.hk-agenda-pista');
    const dates = [];
    for (let i = stop.from; i <= stop.to; i++) {
        const day = track.children[i].querySelector('.hk-agenda-dia');
        if (day) {
            dates.push(day.getAttribute('data-fecha'));
        }
    }
    if (stop.part) {
        dates.push(track.children[stop.part.block].querySelector('.hk-agenda-dia').getAttribute('data-fecha'));
    }
    if (!dates.length) {
        return;
    }
    const month = dates[0].slice(0, 7);
    each(c.querySelectorAll('.hk-mes'), function (m) {
        const active = m.getAttribute('data-mes') === month;
        m.classList.toggle('hk-mes-activo', active);
        if (!active) {
            return;
        }
        each(m.querySelectorAll('.hk-mes-dia[data-fecha]'), function (x) {
            x.classList.toggle('hk-mes-en-lista', dates.indexOf(x.getAttribute('data-fecha')) !== -1);
        });
        const cell = m.querySelector('.hk-mes-dia[data-fecha="' + dates[0] + '"]');
        const ring = m.querySelector('.hk-mes-foco');
        if (cell && ring) {
            const gap = 3;
            const firstTime = !ring.getAttribute('style');
            ring.style.width = (cell.offsetWidth + gap * 2) + 'px';
            ring.style.height = (cell.offsetHeight + gap * 2) + 'px';
            const tr = 'translate3d(' + (cell.offsetLeft - gap) + 'px,' + (cell.offsetTop - gap) + 'px,0)';
            // Its first place in a month: there at once, it does not fly in from the corner.
            if (firstTime) {
                ring.style.webkitTransition = 'none';
                ring.style.transition = 'none';
            }
            ring.style.webkitTransform = tr;
            ring.style.transform = tr;
            if (firstTime) {
                void ring.offsetWidth;
                ring.style.webkitTransition = '';
                ring.style.transition = '';
            }
        }
    });
}

function placeTrack(track, y, travel) {
    const tr = 'translate3d(0,' + (-y) + 'px,0)';
    track.classList.toggle('hk-agenda-sin-viaje', !travel);
    void track.offsetWidth;
    track.style.webkitTransform = tr;
    track.style.transform = tr;
}

function goToStop(c, n, animated) {
    const A = c.hkAgenda;
    const p = A.stops[n];
    if (p.view) {
        c.setAttribute('data-vista', p.view);
        if (p.view === 'mes') {
            return;
        }
    }
    const track = A.track;
    const setBlocks = function () {
        for (let i = 0; i < track.children.length; i++) {
            const inPart = p.part && p.part.block === i;
            track.children[i].classList.toggle('hk-agenda-oculto', !((i >= p.from && i <= p.to) || inPart));
            const ls = linesOfBlock(track.children[i]);
            for (let j = 0; j < ls.length; j++) {
                ls[j].classList.toggle('hk-agenda-oculta', !!(inPart && j >= p.part.lines));
            }
        }
    };
    const back = n === A.firstList && A.current > n;
    if (!animated || (!A.byPage && !back)) {
        placeTrack(track, p.y, animated);
        setBlocks();
    } else {
        track.classList.add('hk-agenda-cambiando');
        setTimeout(function () {
            placeTrack(track, p.y, false);
            setBlocks();
            track.classList.remove('hk-agenda-cambiando');
        }, 500);
    }
    calendarAtStop(c, p);
    A.current = n;
}

/**
 * Once the layer is in the page: the first stop, and it runs. c.hkStop stops it.
 *
 * @param {HTMLElement} c the layer
 * @param {object} o {distance, glass, still}
 * @returns {number} the seconds the slide should last: one whole pass, up to its top
 */
export function startAgenda(c, o) {
    const track = c.querySelector('.hk-agenda-pista');
    const turns = o.distance === 8 || (o.distance === 5 && !!o.glass);
    if (turns) {
        c.setAttribute('data-vista', 'lista');
    }
    if (!track) {
        return 12;
    }
    const list = c.querySelector('.hk-agenda-lista');
    // A thin month that does not fit large goes on as any other.
    if (c.getAttribute('data-densidad') === 'poca' && track.offsetHeight > list.clientHeight) {
        c.removeAttribute('data-densidad');
    }
    if (c.getAttribute('data-densidad') === 'poca') {
        const foot = track.lastChild.classList.contains('hk-agenda-pie') ? 1 : 0;
        calendarAtStop(c, {from: 0, to: track.children.length - 1 - foot});
        return 14;
    }
    const byPage = o.distance === 8 || !!o.still;
    splitDays(track, list.clientHeight);
    const stops = stopsOf(track, list.clientHeight, byPage, o.distance);
    const A = {track, stops, byPage, firstList: 0, current: 0};
    if (turns) {
        stops.unshift({view: 'mes', hold: 8});
        each(stops, function (p, i) {
            if (i > 0) {
                p.view = 'lista';
            }
        });
        A.firstList = 1;
    }
    c.hkAgenda = A;
    goToStop(c, A.firstList, false);
    if (turns) {
        goToStop(c, 0, false);
    }
    let total = 0;
    each(stops, function (p) {
        total += p.hold + (byPage ? 1 : 1.6);
    });
    if (stops.length > 1) {
        let n = 0;
        let timer = null;
        const turn = function () {
            timer = setTimeout(function () {
                n = (n + 1) % stops.length;
                goToStop(c, n, true);
                turn();
            }, stops[n].hold * 1000);
        };
        turn();
        c.hkStop = function () {
            clearTimeout(timer);
        };
    }
    return Math.min(70, Math.round(total));
}
