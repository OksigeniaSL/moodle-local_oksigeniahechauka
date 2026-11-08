// One thing big in each slide (the art direction's 0.7.0, «jerarquia.css»): what leads (.hk-lider: the menu, a notice,
// the important notice, an event or the countdown, a different one each time) and the rest in a third (.hk-resto: the
// important notice fixed on top, then the other things of «Today» as lines under their group, a page with each slide).
// From the art direction's demo (Gaudí, 1 November 2026: construirLider, construirResto, paginarResto, mostrarPagina,
// ajustarTitular, equilibrar), on the data of «Today» as the player makes it (todayOf in main.js).

import {dayNumber, weekdayOf} from './rules.js';
import {stage} from './today.js';

const IMPORTANT_EVERY = 12;

export const MARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 1a11 11 0 1 0 0 22 ' +
    '11 11 0 0 0 0-22zm-1.7 4.6h3.4l-.6 9h-2.2zM12 16.3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>';

const MAX_PAGES = 6;

// The plate of a menu: a plate seen from above, with its fork and knife on it (Gaudí, 2 November 2026). One geometry for
// every centre; its colours come from the sheet (lideres.css).
const PLATE = '<svg viewBox="0 0 200 200" aria-hidden="true">' +
    '<circle class="hk-plato-sombra" cx="100" cy="104" r="96"/>' +
    '<circle class="hk-plato-borde" cx="100" cy="100" r="96"/>' +
    '<circle class="hk-plato-ala" cx="100" cy="100" r="68"/>' +
    '<path class="hk-plato-cubierto" d="M67 42c2 0 3 1 3 3v22h4V45c0-2 1-3 3-3s3 1 3 3v22h4V45c0-2 1-3 3-3s3 1 3 3v30c0 ' +
    '8-4 13-10 15v62c0 3-2 6-5 6s-5-3-5-6V90c-6-2-10-7-10-15V45c0-2 1-3 3-3z"/>' +
    '<path class="hk-plato-cubierto" d="M128 42c9 5 15 21 15 42 0 12-3 21-9 24v46c0 3-2 5-5 5s-5-2-5-5V46c0-3 2-5 4-4z"/>' +
    '</svg>';

// The rings of a calendar's sheet.
const RINGS = '<i></i><i></i>';

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

function clear(n) {
    while (n.firstChild) {
        n.removeChild(n.firstChild);
    }
}

// The colour of a part, in both themes: «marca-2» and «marca-2-oscuro», as the sheets name them.
function colour(node, light, dark) {
    node.style.setProperty('--hk-color', 'var(--hk-' + light + ')');
    node.style.setProperty('--hk-color-oscuro', 'var(--hk-' + dark + ')');
}

// The accent as text on a dark surface: the one the server makes readable for the centre's accent; else the accent.
const ACCENT_DARK = 'acento-oscuro, var(--hk-acento)';

// --- Which things can lead --------------------------------------------------------------------------------------

/**
 * The things of «Today» that can lead, in the order they take the lead: an important notice, the menu, the next event,
 * the countdown, the other notices. At midday the menu goes first.
 *
 * @param {object} today the data of «Today» (todayOf)
 * @param {boolean} [noon] the menu first
 * @returns {object[]} {type: notice|menu|event|countdown, notice?, event?}
 */
/**
 * What leads in a turn.
 *
 * @param {object[]} all from leadsOf()
 * @param {number} turn from 1
 * @returns {object}
 */
export function leadOfTurn(all, turn) {
    const rest = all.filter(function (lead) {
        return !(lead.type === 'notice' && lead.notice.tone === 'important');
    });
    if (!rest.length || rest.length === all.length) {
        return all[(turn - 1) % all.length];
    }
    // The important one is always in sight, in the third or the ticker: it leads only now and then, which is what makes it count.
    if (turn % IMPORTANT_EVERY === 0) {
        const notices = all.filter(function (lead) {
            return rest.indexOf(lead) === -1;
        });
        return notices[(turn / IMPORTANT_EVERY - 1) % notices.length];
    }
    return rest[(turn - 1) % rest.length];
}

export function leadsOf(today, noon) {
    const out = [];
    const notices = today.notices || [];
    notices.forEach(function (n) {
        if (n.tone === 'important') {
            out.push({type: 'notice', notice: n});
        }
    });
    if (today.menu) {
        if (noon) {
            out.unshift({type: 'menu'});
        } else {
            out.push({type: 'menu'});
        }
    }
    if (today.events && today.events.length) {
        out.push({type: 'event', event: today.events[0]});
    }
    if (today.countdown) {
        out.push({type: 'countdown'});
    }
    notices.forEach(function (n) {
        if (n.tone !== 'important') {
            out.push({type: 'notice', notice: n});
        }
    });
    return out;
}

/**
 * Whether one of today's events says the centre is closed: «Festivo - …», «No lectivo - …», «Vacaciones - …», or a title «Festivo».
 *
 * @param {object} e {holiday, group, title}
 * @returns {boolean}
 */
export function isHoliday(e) {
    return e.holiday === true || /^(festivo|no lectivo|vacaciones)$/i.test(e.group || '') ||
        (!e.group && /^(festivo|no lectivo)$/i.test(e.title || ''));
}

/**
 * The main dish of a menu and the other courses: the second course leads (the first when there is one).
 *
 * @param {object} menu {courses: [{label, dishes}]}
 * @returns {{main: string, others: Array<{label: string, text: string}>}}
 */
export function menuParts(menu) {
    const courses = (menu && menu.courses) || [];
    const main = courses[1] || courses[0];
    return {
        main: main ? (main.dishes || []).join(' · ') : '',
        mainAllergens: allergensOf(main),
        others: courses.filter(function (c) {
            return c !== main;
        }).map(function (c) {
            return {label: c.label, text: (c.dishes || []).join(' · '), allergens: allergensOf(c)};
        }),
    };
}

/**
 * The allergens of a course: all those of its dishes, once. A dish without codes says nothing, never «without allergens».
 *
 * @param {object} [course] {dishes, allergens: [[code]], aligned with its dishes}
 * @returns {string[]}
 */
export function allergensOf(course) {
    const out = [];
    ((course && course.allergens) || []).forEach(function (list) {
        (list || []).forEach(function (code) {
            if (/^[a-z]+$/.test(code) && out.indexOf(code) < 0) {
                out.push(code);
            }
        });
    });
    return out;
}

// A row of allergens, each its drawing on a white disc (alergenos.css). Null when there are none.
function allergensRow(codes, cls, label) {
    if (!codes || !codes.length) {
        return null;
    }
    const d = el('div', 'hk-alergenos ' + cls);
    if (label) {
        d.appendChild(el('span', 'hk-alergenos-rotulo', label));
    }
    codes.forEach(function (code) {
        d.appendChild(el('i', 'hk-alergeno hk-alergeno-' + code));
    });
    return d;
}

// An icon by kind of activity, inline so its colours follow the theme. Null with none, or without the icons' script.
function activityIcon(icon, cls) {
    const set = window.HK_ACTIVIDAD;
    const svg = icon && icon !== 'none' && set ? set.svg(icon) : '';
    if (!svg) {
        return null;
    }
    const d = el('span', cls);
    d.innerHTML = svg;
    return d;
}

/**
 * What a menu is called on the screen: with its own name when a day has several, so the dishes of one are not taken for
 * those of another («Menú de hoy · Infantil»), and without saying the same word twice («Menú de hoy · D», of «Menú D»).
 *
 * @param {object} menu {label, name}
 * @returns {string}
 */
export function menuLabel(menu) {
    const label = menu.label || '';
    let name = menu.name || '';
    const first = label.split(' ')[0].toLowerCase();
    if (first && name.toLowerCase().indexOf(first + ' ') === 0) {
        name = name.slice(first.length + 1);
    }
    return [label, name].filter(Boolean).join(' · ');
}

/**
 * The kind of a menu, when it says something: «Vegetariano» from «C (Vegetariano)»; nothing from «Menú D» or «2».
 *
 * @param {string} name
 * @returns {string}
 */
export function menuKind(name) {
    const n = String(name || '').replace(/^men[uú]\s*/i, '').trim();
    const inside = /\(([^)]+)\)/.exec(n);
    const kind = inside ? inside[1].trim() : n;
    if (/^[\w.º°-]{1,2}$/.test(kind) || /^\d+$/.test(kind)) {
        return '';
    }
    return kind === kind.toUpperCase() ? kind.toLowerCase() : kind.charAt(0).toLowerCase() + kind.slice(1);
}

/**
 * What the week's strip says: what comes next and matters, «Jueves 5: Día del deporte». A big event of the next days
 * (the countdown's) before the nearest one. Empty when nothing comes.
 *
 * @param {object} today the data of «Today»
 * @param {string[]} days the weekdays' names, Sunday first
 * @returns {string}
 */
export function weekHeadline(today, days) {
    const big = today.countdown && today.countdown.days <= 5 ? today.countdown : null;
    const next = big || (today.upcoming && today.upcoming[0]);
    if (!next || !next.date) {
        return '';
    }
    const n = dayNumber(next.date);
    const name = days && days[weekdayOf(n) % 7];
    const d = parseInt(next.date.slice(8, 10), 10);
    return (name ? name + ' ' + d : next.date) + ': ' + next.title;
}

// --- What leads -------------------------------------------------------------------------------------------------

/**
 * @param {object} p a lead of leadsOf()
 * @param {object} today
 * @param {object} l labels: important, notice, events, countdown, daysfor
 * @returns {HTMLElement}
 */
export function buildLead(p, today, l) {
    const s = el('section', 'hk-lider');
    const holiday = p.type === 'event' && isHoliday(p.event);
    s.setAttribute('data-tipo', p.type === 'notice' ? 'aviso' : (holiday ? 'festivo' : (p.type === 'event' ? 'evento' :
        (p.type === 'countdown' ? 'cuenta' : 'menu'))));
    s.setAttribute('data-ajuste', '0');
    const b = el('div', 'hk-lider-cuerpo');
    if (p.type === 'menu') {
        const m = today.menu;
        // The skin's colour for the menu: the marca-* are the centre's categories, and mean something else.
        s.style.setProperty('--hk-ev', 'var(--hk-menu)');
        s.style.setProperty('--hk-sobre-ev', 'var(--hk-sobre-menu)');
        const table = el('div', 'hk-lider-pieza hk-mesa');
        table.innerHTML = PLATE;
        b.appendChild(el('p', 'hk-lider-etiqueta', m.label || ''));
        if (m.closed) {
            b.appendChild(el('h2', 'hk-lider-titular', m.closed));
        } else {
            const parts = menuParts(m);
            b.appendChild(el('h2', 'hk-lider-titular', parts.main));
            const inMain = allergensRow(parts.mainAllergens, 'hk-lider-alergenos', l.allergens);
            if (inMain) {
                b.appendChild(inMain);
            }
            if (parts.others.length) {
                const dishes = el('div', 'hk-lider-platos');
                parts.others.forEach(function (o) {
                    const x = el('div', 'hk-lider-plato');
                    x.appendChild(el('small', '', o.label));
                    // In the same line of text: they flow after the dish, and the dish does not wrap to leave them a column.
                    const dish = el('span', 'hk-plato-texto', o.text);
                    const inDish = allergensRow(o.allergens, 'hk-plato-alergenos');
                    if (inDish) {
                        dish.appendChild(inDish);
                    }
                    x.appendChild(dish);
                    dishes.appendChild(x);
                });
                b.appendChild(dishes);
            }
            if (m.also && m.also.length) {
                const also = el('p', 'hk-lider-tambien');
                also.appendChild(el('small', '', l.also || ''));
                also.appendChild(document.createTextNode(m.also.join(' · ')));
                also.hkList = m.also;
                also.hkKinds = m.alsoKinds || [];
                b.appendChild(also);
            }
        }
        s.appendChild(b);
        s.appendChild(table);
    } else if (p.type === 'notice') {
        const tag = el('p', 'hk-lider-etiqueta');
        if (p.notice.tone === 'important') {
            s.classList.add('hk-lider-importante');
            const sign = el('div', 'hk-lider-pieza hk-senal');
            sign.innerHTML = MARK;
            tag.textContent = l.important;
            b.appendChild(tag);
            b.appendChild(el('h2', 'hk-lider-titular', p.notice.title));
            if (p.notice.body) {
                b.appendChild(el('p', 'hk-lider-entrada', p.notice.body));
            }
            s.appendChild(b);
            s.appendChild(sign);
        } else {
            tag.textContent = l.notice;
            b.appendChild(tag);
            b.appendChild(el('h2', 'hk-lider-titular', p.notice.title));
            if (p.notice.body) {
                b.appendChild(el('p', 'hk-lider-entrada', p.notice.body));
            }
            s.appendChild(b);
        }
    } else if (holiday) {
        // The sheet of a tear-off calendar: today's date, in the words of the screen.
        const e = p.event;
        const d = today.dateWords || {};
        const sheet = el('div', 'hk-lider-pieza hk-hoja');
        const rings = el('div', 'hk-hoja-anillas');
        rings.innerHTML = RINGS;
        sheet.appendChild(rings);
        sheet.appendChild(el('p', 'hk-hoja-mes', d.month || ''));
        sheet.appendChild(el('p', 'hk-hoja-dia', d.day ? String(d.day) : ''));
        sheet.appendChild(el('p', 'hk-hoja-semana', d.weekday || ''));
        s.appendChild(sheet);
        b.appendChild(el('p', 'hk-lider-etiqueta', e.group || ''));
        b.appendChild(el('h2', 'hk-lider-titular', e.title));
        s.appendChild(b);
    } else if (p.type === 'event') {
        const e = p.event;
        const n = e.color || 0;
        stage(s, n);
        if (!n) {
            s.setAttribute('data-sin-categoria', '');
        }
        const stub = el('div', 'hk-lider-pieza hk-talon');
        stub.appendChild(el('p', 'hk-talon-cuando', today.eventsLabel || l.events));
        if (e.time && e.time !== '·') {
            // The colon apart, like the clock's: some letters give it the width of a figure in tabular numbers.
            const hour = el('p', 'hk-talon-hora');
            const bits = e.time.split(':');
            hour.appendChild(document.createTextNode(bits[0]));
            hour.appendChild(el('span', '', ':'));
            hour.appendChild(document.createTextNode(bits[1] || ''));
            stub.appendChild(hour);
        }
        s.appendChild(stub);
        b.appendChild(el('h2', 'hk-lider-titular', e.title));
        if (e.group) {
            b.appendChild(el('p', 'hk-lider-entrada', e.group));
        }
        s.appendChild(b);
        const stamp = activityIcon(e.icon, 'hk-lider-sello');
        if (stamp) {
            s.appendChild(stamp);
        }
    } else {
        const c = today.countdown;
        const n = c.color || 0;
        stage(s, n);
        const board = el('div', 'hk-lider-pieza hk-marcador');
        board.appendChild(el('p', 'hk-marcador-faltan', l.countdown));
        const flaps = el('div', 'hk-paletas');
        String(c.days).split('').forEach(function (digit) {
            flaps.appendChild(el('b', 'hk-paleta', digit));
        });
        board.appendChild(flaps);
        s.appendChild(board);
        b.appendChild(el('p', 'hk-lider-etiqueta', l.daysfor));
        b.appendChild(el('h2', 'hk-lider-titular', c.title));
        const foot = [c.day, c.group].filter(Boolean).join(' · ');
        if (foot) {
            b.appendChild(el('p', 'hk-lider-entrada', foot));
        }
        s.appendChild(b);
        const stamp = activityIcon(c.icon, 'hk-lider-sello');
        if (stamp) {
            s.appendChild(stamp);
        }
    }
    s.hkLead = p;
    return s;
}

// --- The rest ---------------------------------------------------------------------------------------------------

function line(when, title, detail, n, coming, icon) {
    const d = el('div', 'hk-linea' + (coming ? ' hk-linea-proxima' : ''));
    if (when) {
        d.appendChild(el('b', 'hk-linea-cuando', when));
        stage(d, n || 0);
    }
    const mark = activityIcon(icon, 'hk-linea-icono');
    if (mark) {
        d.appendChild(mark);
    }
    const t = el('span', 'hk-linea-texto', title);
    if (detail) {
        t.appendChild(el('small', '', detail));
    }
    d.appendChild(t);
    return d;
}

function fixedNotice(n, l) {
    const f = el('div', 'hk-aviso-fijo');
    const inside = el('div');
    const mark = el('p', 'hk-aviso-fijo-marca');
    mark.innerHTML = MARK;
    mark.appendChild(document.createTextNode(l.important));
    inside.appendChild(mark);
    inside.appendChild(el('h3', '', n.title));
    if (n.body) {
        inside.appendChild(el('p', '', n.body));
    }
    f.appendChild(inside);
    return f;
}

/**
 * The rest of «Today» in a third: the important notice on top (they take turns there, one per slide), then the other
 * things as lines under their group. What leads is not repeated. Null when there is nothing.
 *
 * @param {object} today
 * @param {object|null} lead what leads, from leadsOf()
 * @param {object} l labels: important, notices, events, upcoming
 * @param {number} turn the slide's number, for which important notice
 * @returns {HTMLElement|null}
 */
export function buildRest(today, lead, l, turn) {
    const a = el('aside', 'hk-resto');
    const leadNotice = lead && lead.type === 'notice' ? lead.notice : null;
    const notices = today.notices || [];
    const important = notices.filter(function (x) {
        return x.tone === 'important' && x !== leadNotice;
    });
    if (important.length) {
        a.appendChild(fixedNotice(important[turn % important.length], l));
        a.hkImportant = important;
    }
    const items = [];
    if (today.menu && !(lead && lead.type === 'menu')) {
        const m = today.menu;
        const main = m.closed ? m.closed : menuParts(m).main;
        if (main) {
            items.push({group: m.label || '', colour: ['menu', 'menu'], make: function () {
                const row = line(null, main, null);
                // Those of the dish it names: the menu's whole list under one dish would say what is not so.
                const codes = allergensRow(m.closed ? [] : menuParts(m).mainAllergens, 'hk-linea-alergenos');
                if (codes) {
                    row.querySelector('.hk-linea-texto').appendChild(codes);
                }
                return row;
            }});
        }
    }
    notices.forEach(function (x) {
        if (x.tone !== 'important' && x !== leadNotice) {
            items.push({group: l.notices, colour: ['acento-texto', ACCENT_DARK], make: function (short) {
                return line(null, x.title, short ? null : x.body);
            }});
        }
    });
    (today.events || []).forEach(function (e) {
        if (!(lead && lead.type === 'event' && lead.event === e)) {
            items.push({group: today.eventsLabel || l.events, colour: ['evento', 'evento'], make: function (short) {
                return line(e.time && e.time !== '·' ? e.time : null, e.title, short ? null : e.group, e.color, false, e.icon);
            }});
        }
    });
    (today.upcoming || []).forEach(function (e) {
        items.push({group: l.upcoming, colour: ['texto-suave', 'texto-suave'], make: function (short) {
            return line(e.day, e.title, short ? null : e.group, e.color, true, e.icon);
        }});
    });
    if (!items.length && !important.length) {
        return null;
    }
    a.hkItems = items;
    if (items.length) {
        a.appendChild(el('div', 'hk-resto-pagina'));
        a.appendChild(el('p', 'hk-resto-paginas'));
    }
    return a;
}

function fillPage(page, items, from, to) {
    clear(page);
    let group = null;
    for (let k = from; k < to; k++) {
        if (items[k].group !== group) {
            group = items[k].group;
            const g = el('p', 'hk-resto-grupo', group);
            colour(g, items[k].colour[0], items[k].colour[1]);
            page.appendChild(g);
        }
        items[k].node = items[k].make(items[k].short);
        page.appendChild(items[k].node);
    }
}

/**
 * The pages of the rest, measured with the layer in the page: as many whole lines as fit, and the next page starts
 * there; at most six. Then the page of this slide.
 *
 * @param {HTMLElement|null} a the rest
 * @param {number} turn the slide's number
 */
export function paginateRest(a, turn) {
    if (!a || !a.hkItems || !a.hkItems.length) {
        return;
    }
    const page = a.querySelector('.hk-resto-pagina');
    const items = a.hkItems;
    const pages = [];
    let i = 0;
    // Measured with the page dots in place, so the page does not shrink once they appear.
    const dots = a.querySelector('.hk-resto-paginas');
    clear(dots);
    dots.appendChild(el('i'));
    dots.style.display = '';
    while (i < items.length && pages.length < MAX_PAGES) {
        fillPage(page, items, i, items.length);
        const high = page.clientHeight;
        const wide = page.clientWidth;
        let last = i - 1;
        for (let k = i; k < items.length; k++) {
            const n = items[k].node;
            if (n.offsetTop + n.offsetHeight <= high + 1 && n.offsetLeft + n.offsetWidth <= wide + 1) {
                last = k;
            } else {
                break;
            }
        }
        if (last < i) {
            // Not even one line fits whole: without its second line; if not even so, the page does not show (what does
            // not fit at a readable size does not come out).
            items[i].short = true;
            fillPage(page, items, i, i + 1);
            const n1 = items[i].node;
            if (n1.offsetTop + n1.offsetHeight > high + 1) {
                page.style.display = 'none';
                dots.style.display = 'none';
                a.hkPages = null;
                return;
            }
            last = i;
        }
        // Whole, also with the margin of its last line.
        fillPage(page, items, i, last + 1);
        const over = function () {
            return page.scrollHeight > page.clientHeight + 1 || page.scrollWidth > page.clientWidth + 1;
        };
        while (last > i && over()) {
            last--;
            fillPage(page, items, i, last + 1);
        }
        if (over() && !items[i].short) {
            // Alone and still over: without its second line.
            items[i].short = true;
            fillPage(page, items, i, i + 1);
        }
        if (over()) {
            // What does not fit at a readable size does not come out.
            if (!pages.length) {
                page.style.display = 'none';
                dots.style.display = 'none';
                a.hkPages = null;
                return;
            }
            break;
        }
        pages.push([i, last + 1]);
        i = last + 1;
    }
    a.hkPages = pages;
    showRestPage(a, turn, false);
}

/**
 * One page of the rest; with a fade when the layer stays from one slide to the next.
 *
 * @param {HTMLElement|null} a
 * @param {number} n
 * @param {boolean} fade
 */
export function showRestPage(a, n, fade) {
    if (!a || !a.hkPages) {
        return;
    }
    const page = a.querySelector('.hk-resto-pagina');
    const p = a.hkPages[n % a.hkPages.length];
    const paint = function () {
        fillPage(page, a.hkItems, p[0], p[1]);
        const dots = a.querySelector('.hk-resto-paginas');
        clear(dots);
        if (a.hkPages.length > 1) {
            a.hkPages.forEach(function (x) {
                dots.appendChild(el('i', x === p ? 'hk-pagina-actual' : ''));
            });
        }
        dots.style.display = a.hkPages.length > 1 ? '' : 'none';
    };
    if (!fade || a.hkPages.length < 2) {
        paint();
        return;
    }
    page.classList.add('hk-cambiando');
    setTimeout(function () {
        paint();
        page.classList.remove('hk-cambiando');
    }, 450);
}

/**
 * The next important notice in the fixed place, with its fade (when the layer stays from one slide to the next).
 *
 * @param {HTMLElement|null} a
 * @param {number} turn
 * @param {object} l
 */
export function turnFixed(a, turn, l) {
    if (!a || !a.hkImportant || a.hkImportant.length < 2) {
        return;
    }
    const old = a.querySelector('.hk-aviso-fijo');
    old.classList.add('hk-cambiando');
    setTimeout(function () {
        const fresh = fixedNotice(a.hkImportant[turn % a.hkImportant.length], l);
        fresh.classList.add('hk-cambiando');
        a.replaceChild(fresh, old);
        void fresh.offsetWidth;
        fresh.classList.remove('hk-cambiando');
    }, 450);
}

/**
 * «También» takes two lines at most, and says every other menu or none: all of them by name; if they do not fit, all of them by
 * their kind («vegetariano · sin gluten»), when each one has a kind; else the line goes. Never «and 2 more»: nobody can ask a
 * screen which. It goes before the headline's fit, which then has its room.
 *
 * @param {HTMLElement} lead
 */
export function fitAlso(lead) {
    const box = lead.querySelector('.hk-lider-tambien');
    if (!box || !box.hkList) {
        return;
    }
    const list = box.hkList;
    const kinds = box.hkKinds;
    const text = box.lastChild;
    const tall = function () {
        const cs = window.getComputedStyle(box);
        const inside = box.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.borderTopWidth);
        return Math.round(inside / parseFloat(cs.lineHeight)) > 2;
    };
    box.style.display = '';
    text.nodeValue = list.join(' · ');
    if (!tall()) {
        return;
    }
    if (kinds.length && kinds.length === list.length) {
        text.nodeValue = kinds.join(' · ');
        if (!tall()) {
            return;
        }
    }
    box.style.display = 'none';
}

// --- Headlines --------------------------------------------------------------------------------------------------

/** How many lines a block takes, by its height and its line height. */
export function linesOf(e) {
    const lh = parseFloat(window.getComputedStyle(e).lineHeight);
    return lh > 0 ? Math.round(e.offsetHeight / lh) : 1;
}

/**
 * A word too long for its box whatever the step: the letter that makes it fit, rather than cutting it at the screen's edge.
 *
 * @param {HTMLElement} headline
 */
export function fitWord(headline) {
    if (headline.scrollWidth > headline.clientWidth + 1) {
        const size = parseFloat(getComputedStyle(headline).fontSize);
        headline.style.fontSize = Math.floor(size * headline.clientWidth / headline.scrollWidth) + 'px';
    }
}

/**
 * Whether a lead's words have paid for what sits beside them: its title on its last step or under it, its second line
 * gone, or its label broken in two.
 *
 * @param {HTMLElement} lead
 * @param {HTMLElement} headline
 * @returns {boolean}
 */
export function wordsCramped(lead, headline) {
    const label = lead.querySelector('.hk-lider-etiqueta');
    return lead.classList.contains('hk-lider-corto') || !!headline.style.fontSize ||
        Number(lead.getAttribute('data-ajuste')) >= 3 || !!(label && linesOf(label) > 1);
}

/**
 * A headline in steps (data-ajuste 0 to 3 on its box: 100, 88, 76 and 64 % of --hk-t-titular; the sheets keep the last
 * over the distance's minimum title) until it takes no more than maxLines and its box does not overflow. If even the
 * last step does not fit, the box loses its second line (box.hkShort, the class) and tries again.
 *
 * @param {HTMLElement} box
 * @param {HTMLElement} headline
 * @param {number} maxLines
 * @param {function(): boolean} [overflows]
 */
export function fitHeadline(box, headline, maxLines, overflows) {
    const last = box.hkSteps || 3;
    const tryAll = function () {
        for (let s = 0; s <= last; s++) {
            box.setAttribute('data-ajuste', String(s));
            if (linesOf(headline) <= maxLines && !(overflows && overflows())) {
                return true;
            }
        }
        return false;
    };
    headline.style.fontSize = '';
    if (tryAll()) {
        return;
    }
    if (box.hkShort) {
        box.classList.add(box.hkShort);
        if (tryAll()) {
            return;
        }
    }
    // Last resort, a very long title from afar: smaller than the minimum rather than cut at the edge of its box.
    if (overflows) {
        const size = parseFloat(getComputedStyle(headline).fontSize);
        for (let k = 1; k <= 14 && overflows(); k++) {
            headline.style.fontSize = Math.round(size * (1 - k * 0.05)) + 'px';
        }
    }
}
