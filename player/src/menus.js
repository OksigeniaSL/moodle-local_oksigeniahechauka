// «Los menús de hoy»: every menu of the day on one slide, for the canteen's queue (Jujol, 13 November 2026). Hechauka's «Today»
// leads with the first menu and says the others in a line; at lunch time whoever waits in the queue wants all of them,
// whole. A table: the menus are its columns and the courses its rows, so that each course is read across. A dish two
// menus side by side share is one cell over both, and one shared by every menu of the day a band across the table; one
// shared by menus apart has the same tint in both and says «= A». A course a menu does not have is an empty cell, and
// nothing says «sin primero». The allergens, when the centre has them on, under each dish and once in a legend.
//
// Pages by distance: on a wide screen 4 menus at 3 m and 3 at 5 m; on an upright one 2 menus a table, two tables one over
// the other at 3 m and one at 5 m. At 8 m one menu a page, as the sign of its door: its letter huge beside its dishes (upright, over them). The menus
// are spread evenly over the pages (5 at 3 m: 3 and 2, never 4 and 1), each turn the next page, with its marks (never
// «y N más»). Chromium 56: a <table> (no grid there), flexbox, margins for gaps.
import {PLATE, fitWord, menuKind} from './lead.js';

// How many menus a table holds, and how many tables a page.
const PER_TABLE = {h: {3: 4, 5: 3, 8: 1}, v: {3: 2, 5: 2, 8: 1}};
const TABLES = {h: {3: 1, 5: 1, 8: 1}, v: {3: 2, 5: 1, 8: 1}};
const TINTS = 3;

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) {
        e.className = cls;
    }
    if (text !== undefined && text !== null) {
        e.textContent = text;
    }
    return e;
}

function norm(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * The short name of a menu, for its column and for «= A»: «A» of «Menú A», «C» of «Menú C (vegetariano)», the whole
 * name when it is not a letter or a number («Menú sin gluten» → «sin gluten»).
 *
 * @param {string} name
 * @returns {{word: string, short: string}} word: «Menú» as the name says it, or nothing
 */
export function menuShort(name) {
    const raw = String(name || '').trim();
    const m = /^(men[uú])\s+/i.exec(raw);
    const word = m ? raw.slice(0, m[1].length) : '';
    const rest = (m ? raw.slice(m[0].length) : raw).replace(/\s*\([^)]*\)\s*$/, '').trim();
    return {word, short: rest || raw};
}

/**
 * The day's menus as the slide needs them, from the item of the menu: each menu with its short name and kind, each of its
 * courses as one text (its dishes, «·» between) with its allergens, the courses in the order they first come, and which
 * menus share each dish. Null when there is no canteen.
 *
 * @param {object} item {label, note, closed, menus: [{name, courses: [{label, dishes, allergens}]}], allergennames}
 * @param {string} fallback the label when the item has none («Menú de hoy»)
 * @returns {object|null} {label, note, menus, courses, allergenNames}
 */
export function menusData(item, fallback) {
    if (!item || item.closed || !item.menus || !item.menus.length) {
        return null;
    }
    const courses = [];
    const menus = item.menus.map(function (menu) {
        const names = menuShort(menu.name);
        const by = {};
        (menu.courses || []).forEach(function (course) {
            const label = String(course.label || '').trim();
            const dishes = (course.dishes || []).filter(Boolean);
            if (!dishes.length) {
                return;
            }
            const key = norm(label);
            if (courses.map(function (c) {
                return c.key;
            }).indexOf(key) < 0) {
                courses.push({key, label});
            }
            const allergens = [];
            (course.allergens || []).forEach(function (codes) {
                (codes || []).forEach(function (code) {
                    if (allergens.indexOf(code) < 0) {
                        allergens.push(code);
                    }
                });
            });
            by[key] = {text: dishes.join(' · '), same: norm(dishes.join(' · ')), allergens};
        });
        return {name: menu.name || '', word: names.word, short: names.short, kind: menuKind(menu.name), by};
    });
    return {label: item.label || fallback || '', note: item.note || '', menus, courses,
        allergenNames: item.allergennames || {}};
}

/**
 * The pages: lists of tables, each a list of menu indexes, spread evenly.
 *
 * @param {number} count how many menus
 * @param {boolean} horizontal
 * @param {number} distance 3, 5 or 8
 * @returns {number[][][]}
 */
export function menusPages(count, horizontal, distance) {
    const o = horizontal ? 'h' : 'v';
    const per = PER_TABLE[o][distance] || PER_TABLE[o][3];
    const tables = TABLES[o][distance] || TABLES[o][3];
    const pages = Math.max(1, Math.ceil(count / (per * tables)));
    const out = [];
    let next = 0;
    for (let p = 0; p < pages; p++) {
        const onPage = Math.floor(count / pages) + (p < count % pages ? 1 : 0);
        const nTables = Math.min(tables, Math.max(1, Math.ceil(onPage / per)));
        const page = [];
        for (let t = 0; t < nTables; t++) {
            const inTable = Math.floor(onPage / nTables) + (t < onPage % nTables ? 1 : 0);
            const list = [];
            for (let k = 0; k < inTable; k++) {
                list.push(next++);
            }
            page.push(list);
        }
        out.push(page);
    }
    return out;
}

/**
 * The cells of a row of a table: the menus side by side that share the dish go in one, with its span.
 *
 * @param {object} data from menusData
 * @param {number[]} table the menus of the table
 * @param {string} key the course
 * @returns {object[]} [{menus: [index], dish|null}]
 */
export function rowCells(data, table, key) {
    const cells = [];
    table.forEach(function (i) {
        const dish = data.menus[i].by[key] || null;
        const last = cells[cells.length - 1];
        if (dish && last && last.dish && last.dish.same === dish.same &&
                last.dish.allergens.join() === dish.allergens.join()) {
            last.menus.push(i);
        } else {
            cells.push({menus: [i], dish});
        }
    });
    return cells;
}

/**
 * For each dish shared by menus apart, its tint, by order of first appearance; and who else has it.
 *
 * @param {object} data from menusData
 * @param {string} key the course
 * @param {object} dish the dish, with its allergens (the same words with other allergens are another dish)
 * @returns {number[]} the indexes of every menu with that dish in that course
 */
function sharing(data, key, dish) {
    const out = [];
    data.menus.forEach(function (m, i) {
        const x = m.by[key];
        if (x && x.same === dish.same && x.allergens.join() === dish.allergens.join()) {
            out.push(i);
        }
    });
    return out;
}

function allergenRow(codes) {
    if (!codes.length) {
        return null;
    }
    const d = el('span', 'hk-alergenos hk-menus-alergenos');
    codes.forEach(function (code) {
        d.appendChild(el('i', 'hk-alergeno hk-alergeno-' + code));
    });
    return d;
}

// The menu's name: a letter or a number big on its disc, alone (the slide already says «Menú»); a word on its pill; and
// the kind under it, when it says something.
function nameOf(m, box) {
    const letter = m.short.length <= 3;
    const name = el('div', 'hk-menus-nombre' + (letter ? ' hk-menus-letra' : ' hk-menus-palabra'));
    name.appendChild(el('b', '', m.short));
    if (letter && m.word) {
        // Said, not shown: «Menú A», for whoever cannot see the screen.
        name.setAttribute('aria-label', m.word + ' ' + m.short);
    }
    box.appendChild(name);
    if (m.kind && norm(m.kind) !== norm(m.short)) {
        box.appendChild(el('span', 'hk-menus-tipo', m.kind));
    }
}

// What goes in a dish's cell: the dish, its allergens after it on the same line, and who else has it.
function dishBox(dish, same) {
    const box = el('div', 'hk-menus-celda');
    box.appendChild(el('span', 'hk-menus-texto', dish.text));
    const codes = allergenRow(dish.allergens);
    if (codes) {
        box.appendChild(codes);
    }
    if (same) {
        box.appendChild(el('small', 'hk-menus-igual-dice', '= ' + same));
    }
    return box;
}

// Who else has a dish, by the short names, leaving out those of its cell.
function othersOf(data, key, dish, inCell) {
    return sharing(data, key, dish).filter(function (i) {
        return inCell.indexOf(i) < 0;
    }).map(function (i) {
        return data.menus[i].short;
    }).join(', ');
}

// One menu as the sign of its door (8 m): its letter beside (or over) its courses, one a row.
function buildSign(data, i, tints) {
    const m = data.menus[i];
    const sign = el('div', 'hk-menus-cartel');
    const door = el('div', 'hk-menus-puerta');
    const cell = el('div', 'hk-menus-celda');
    nameOf(m, cell);
    door.appendChild(cell);
    sign.appendChild(door);
    const t = el('table', 'hk-menus-mesa hk-menus-mesa-cartel');
    const body = el('tbody');
    data.courses.forEach(function (course) {
        const dish = m.by[course.key];
        if (!dish) {
            return;
        }
        const tr = el('tr');
        const th = el('th', 'hk-menus-curso');
        th.setAttribute('scope', 'row');
        th.appendChild(el('div', 'hk-menus-celda', course.label));
        tr.appendChild(th);
        const td = el('td', 'hk-menus-plato');
        const others = othersOf(data, course.key, dish, [i]);
        if (others) {
            const k = dish.same + '|' + course.key;
            if (!tints.map[k]) {
                tints.map[k] = (tints.n++ % TINTS) + 1;
            }
            td.className += ' hk-menus-igual hk-menus-igual-' + tints.map[k];
        }
        td.appendChild(dishBox(dish, others));
        tr.appendChild(td);
        body.appendChild(tr);
    });
    t.appendChild(body);
    sign.appendChild(t);
    return sign;
}

function buildTable(data, table, tints) {
    const t = el('table', 'hk-menus-mesa');
    t.setAttribute('data-menus', String(table.length));
    const head = el('thead');
    const hr = el('tr');
    hr.appendChild(el('td', 'hk-menus-esquina'));
    table.forEach(function (i) {
        const m = data.menus[i];
        const th = el('th', 'hk-menus-menu');
        th.setAttribute('scope', 'col');
        // The letter (or number) first and big, as on the canteen's door, which is what a child looks for from afar
        // (Enrique, 13 November 2026); a word, smaller; «Menú» and the kind, small, around it.
        const cell = el('div', 'hk-menus-celda');
        nameOf(m, cell);
        th.appendChild(cell);
        hr.appendChild(th);
    });
    head.appendChild(hr);
    t.appendChild(head);
    const body = el('tbody');
    data.courses.forEach(function (course) {
        // A course no menu of this table has is no row of it.
        const any = table.some(function (i) {
            return data.menus[i].by[course.key];
        });
        if (!any) {
            return;
        }
        const tr = el('tr');
        const th = el('th', 'hk-menus-curso');
        th.setAttribute('scope', 'row');
        th.appendChild(el('div', 'hk-menus-celda', course.label));
        tr.appendChild(th);
        rowCells(data, table, course.key).forEach(function (cell) {
            const td = el('td', 'hk-menus-plato');
            if (cell.menus.length > 1) {
                td.setAttribute('colspan', String(cell.menus.length));
            }
            if (!cell.dish) {
                td.className = 'hk-menus-plato hk-menus-nada';
                tr.appendChild(td);
                return;
            }
            const all = sharing(data, course.key, cell.dish);
            let others = '';
            if (all.length === data.menus.length && data.menus.length > 1 && cell.menus.length === table.length) {
                // Every menu of the day has it: a band across the table (across each table, upright), said by its width.
                td.className += ' hk-menus-todos';
            } else if (all.length > cell.menus.length) {
                // Shared with menus apart: the same tint wherever it is, and who else has it.
                const k = cell.dish.same + '|' + course.key;
                if (!tints.map[k]) {
                    tints.map[k] = (tints.n++ % TINTS) + 1;
                }
                td.className += ' hk-menus-igual hk-menus-igual-' + tints.map[k];
                others = othersOf(data, course.key, cell.dish, cell.menus);
            } else if (cell.menus.length > 1) {
                td.className += ' hk-menus-junto';
            }
            // What is in a cell goes in a box of its own: it is what moves as it comes in (a table's cells do not move
            // well in Chromium 56), over the cell's tint.
            td.appendChild(dishBox(cell.dish, others));
            tr.appendChild(td);
        });
        body.appendChild(tr);
    });
    t.appendChild(body);
    return t;
}

/**
 * The slide, on its layer.
 *
 * @param {HTMLElement} c the layer
 * @param {object} data from menusData
 * @param {number} turn which page, counting from the first time (it goes round)
 * @param {object} o {distance, horizontal, allergensLabel}
 */
export function buildMenus(c, data, turn, o) {
    if (!data || !data.menus || !data.menus.length) {
        return;
    }
    const pages = menusPages(data.menus.length, o.horizontal, o.distance || 3);
    const at = ((turn || 0) % pages.length + pages.length) % pages.length;
    const s = el('section', 'hk-menus');
    s.setAttribute('data-ajuste', '0');
    s.setAttribute('data-paginas', String(pages.length));
    const head = el('div', 'hk-menus-cabeza');
    const plate = el('div', 'hk-menus-pieza hk-mesa');
    plate.innerHTML = PLATE;
    head.appendChild(plate);
    head.appendChild(el('h2', 'hk-menus-etiqueta', data.label));
    if (pages.length > 1) {
        const marks = el('p', 'hk-menus-marcas');
        marks.setAttribute('aria-hidden', 'true');
        pages.forEach(function (p, i) {
            const mark = el('i', i === at ? 'hk-menus-marca-actual' : '');
            mark.setAttribute('data-n', String(i % 4 + 1));
            marks.appendChild(mark);
        });
        head.appendChild(marks);
    }
    s.appendChild(head);
    const tables = el('div', 'hk-menus-mesas');
    const tints = {map: {}, n: 0};
    pages[at].forEach(function (table) {
        tables.appendChild((o.distance || 3) >= 8 && table.length === 1 ? buildSign(data, table[0], tints) :
            buildTable(data, table, tints));
    });
    s.appendChild(tables);
    // The allergens of the page, with their names, once.
    const seen = [];
    pages[at].forEach(function (table) {
        table.forEach(function (i) {
            const by = data.menus[i].by;
            Object.keys(by).forEach(function (k) {
                by[k].allergens.forEach(function (code) {
                    if (seen.indexOf(code) < 0) {
                        seen.push(code);
                    }
                });
            });
        });
    });
    const named = seen.filter(function (code) {
        return data.allergenNames[code];
    });
    if (named.length) {
        const legend = el('p', 'hk-menus-leyenda');
        if (o.allergensLabel) {
            legend.appendChild(el('b', '', o.allergensLabel));
        }
        named.forEach(function (code) {
            const x = el('span', 'hk-menus-leyenda-uno');
            x.appendChild(el('i', 'hk-alergeno hk-alergeno-' + code));
            x.appendChild(document.createTextNode(data.allergenNames[code]));
            legend.appendChild(x);
        });
        s.appendChild(legend);
    }
    if (data.note) {
        s.appendChild(el('p', 'hk-menus-nota', data.note));
    }
    c.appendChild(s);
}

/**
 * Fitted after it is on the screen: the dishes go down by steps (0.9, 0.8 and 0.72 of their size) until the tables fit;
 * then the legend goes; never under the least that is read, and a word wider than its column, alone, smaller.
 *
 * @param {HTMLElement} c the layer
 */
export function fitMenus(c) {
    const s = c.querySelector('.hk-menus');
    if (!s) {
        return;
    }
    const tables = s.querySelector('.hk-menus-mesas');
    s.classList.remove('hk-menus-sin-leyenda');
    const fits = function () {
        return s.scrollHeight <= s.clientHeight + 1 && tables.scrollWidth <= tables.clientWidth + 1;
    };
    const states = [[], ['hk-menus-sin-leyenda']];
    for (let n = 0; n < states.length; n++) {
        s.classList.remove('hk-menus-sin-leyenda');
        states[n].forEach(function (cls) {
            s.classList.add(cls);
        });
        for (let step = 0; step <= 3; step++) {
            s.setAttribute('data-ajuste', String(step));
            if (fits()) {
                return;
            }
        }
    }
    const boxes = s.querySelectorAll('.hk-menus-plato .hk-menus-celda');
    for (let i = 0; i < boxes.length; i++) {
        fitWord(boxes[i]);
    }
}
