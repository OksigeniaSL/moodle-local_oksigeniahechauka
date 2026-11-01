// «Today»: the menu, the notices, the events of the day, the coming days and, in the moment of «Today», the weather.
// In two columns (the 1, the menu; the 2, notices and events) that fill their slot: each column takes the largest scale
// at which nothing overflows and nothing takes three lines; when nothing fits even at scale 0, notices and then events
// turn pages. The coming days only take what is left. From the compositions of the art direction (Gaudí, 31 October
// 2026, «ajustarHoy»).

const MAX_SCALE = 7;
const PAGE_SECONDS = 12;

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

function each(list, fn) {
    for (let i = 0; i < list.length; i++) {
        fn(list[i], i);
    }
}

const DROP = '<svg viewBox="0 0 16 21" aria-hidden="true"><path d="M8 0C9.5 3.6 16 9.6 16 13a8 8 0 0 1-16 0C0 9.6 ' +
    '6.5 3.6 8 0z"/></svg>';

export function stage(node, color) {
    if (color >= 1 && color <= 6) {
        node.style.setProperty('--hk-ev', 'var(--hk-marca-' + color + ')');
        node.style.setProperty('--hk-sobre-ev', 'var(--hk-sobre-marca-' + color + ')');
        node.style.setProperty('--hk-ev-oscuro', 'var(--hk-marca-' + color + '-oscuro)');
    } else {
        // For everyone, or of no category: a neutral grey (the primary colour of a centre may be one of its categories).
        node.style.setProperty('--hk-ev', 'var(--hk-texto-suave)');
        node.style.setProperty('--hk-sobre-ev', 'var(--hk-superficie)');
    }
}

function block(cls, label, color, dark) {
    const b = el('section', 'hk-bloque' + (cls ? ' ' + cls : ''));
    b.style.setProperty('--hk-color', 'var(--hk-' + color + ')');
    b.style.setProperty('--hk-color-oscuro', 'var(--hk-' + dark + ')');
    if (label) {
        b.appendChild(el('h3', 'hk-etiqueta', label));
    }
    return b;
}

function menuBlock(m, labels) {
    const label = m.label + (m.name ? ' · ' + m.name : '');
    const b = block('hk-bloque-menu', label, 'marca-2', 'marca-2-oscuro');
    if (!m.courses) {
        b.appendChild(el('p', 'hk-nota', m.closed || ''));
        return b;
    }
    each(m.courses, function (c) {
        const p = el('p', 'hk-plato');
        p.appendChild(el('small', '', c.label || ''));
        p.appendChild(el('span', '', (c.dishes || []).join(', ')));
        b.appendChild(p);
    });
    if (m.note) {
        b.appendChild(el('p', 'hk-nota', m.note));
    }
    return b;
}

function notice(n) {
    const d = el('div', 'hk-aviso' + (n.tone === 'important' ? ' hk-aviso-importante' : ''));
    d.appendChild(el('h3', '', n.title || ''));
    if (n.body) {
        d.appendChild(el('p', '', n.body));
    }
    return d;
}

function todayEvent(ev) {
    const p = el('p', 'hk-evento');
    stage(p, ev.color);
    p.appendChild(el('time', '', ev.time));
    const s = el('span', '', ev.title);
    if (ev.group) {
        s.appendChild(el('small', '', ev.group));
    }
    p.appendChild(s);
    return p;
}

function listBlock(cls, label, color, dark, list, make) {
    const b = block(cls, label, color, dark);
    b.hkList = list;
    b.hkMake = make;
    each(list, function (x) {
        b.appendChild(make(x));
    });
    return b;
}

function weatherDay(label, d, sky) {
    const x = el('div', 'hk-dia-tiempo');
    const icon = el('span', 'hk-tiempo-icono');
    icon.innerHTML = sky.svg(d.symbol);
    x.appendChild(icon);
    const t = el('div', 'hk-dia-tiempo-texto');
    t.appendChild(el('h3', 'hk-etiqueta', label));
    const g = el('p', 'hk-dia-tiempo-grados', d.max + '°');
    g.appendChild(el('small', '', ' / ' + d.min + '°'));
    t.appendChild(g);
    t.appendChild(el('p', 'hk-dia-tiempo-cielo', d.text || sky.texto(d.symbol)));
    if (d.rain !== undefined && d.rain !== null) {
        const r = el('p', 'hk-dia-tiempo-lluvia');
        r.innerHTML = DROP;
        r.appendChild(document.createTextNode(d.rain + ' %'));
        t.appendChild(r);
    }
    x.appendChild(t);
    return x;
}

function weatherBlock(w, labels, sky) {
    const b = block('hk-bloque-tiempo', null, 'primario', 'texto');
    b.appendChild(weatherDay(labels.today, w.today, sky));
    if (w.tomorrow) {
        b.appendChild(weatherDay(labels.tomorrow, w.tomorrow, sky));
    }
    return b;
}

/**
 * The «Today» of a layer, not yet measured. Column 1: the menu (without a menu, the notices); column 2: notices and
 * events. In the moment of «Today» the weather goes in column 1 too, under the menu on a horizontal screen and on top
 * on a vertical one.
 *
 * @param {object} data {menu, notices, events, upcoming, countdown, weather}
 * @param {object} labels the titles of the blocks
 * @param {boolean} moment the moment of «Today» (solo-hoy)
 * @param {boolean} horizontal
 * @param {object|null} sky the weather icons (HK_TIEMPO), when there is weather
 * @returns {HTMLElement|null}
 */
export function buildToday(data, labels, moment, horizontal, sky) {
    const aside = el('aside', 'hk-hoy');
    const col1 = [];
    const col2 = [];
    if (data.menu) {
        col1.push(menuBlock(data.menu, labels));
    }
    if (data.notices.length) {
        (col1.length ? col2 : col1).push(listBlock('hk-bloque-avisos', labels.notices, 'acento-texto', 'acento',
            data.notices, notice));
    }
    if (data.events.length) {
        col2.push(listBlock('hk-bloque-eventos', labels.events, 'marca-3', 'marca-3-oscuro', data.events, todayEvent));
    }
    if (moment && data.weather && sky) {
        if (horizontal) {
            col1.push(weatherBlock(data.weather, labels, sky));
        } else {
            col1.unshift(weatherBlock(data.weather, labels, sky));
        }
    }
    const comingCol = col2.length || !col1.length ? col2 : col1;
    const hasComing = (data.upcoming && data.upcoming.length) || data.countdown;
    each([col1, col2], function (blocks, i) {
        if (!blocks.length && !(hasComing && blocks === comingCol)) {
            return;
        }
        const col = el('div', 'hk-hoy-col hk-hoy-col-' + (i + 1));
        each(blocks, function (b) {
            col.appendChild(b);
        });
        if (hasComing && blocks === comingCol) {
            col.hkComing = true;
        }
        aside.appendChild(col);
    });
    aside.hkData = data;
    aside.hkLabels = labels;
    return aside.childNodes.length ? aside : null;
}

// --- Measuring ---------------------------------------------------------------------------------------------------

function overflows(col) {
    const blocks = col.childNodes;
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1) {
            return true;
        }
    }
    return col.scrollHeight > col.clientHeight + 1;
}

function anyOverflows(cols) {
    for (let i = 0; i < cols.length; i++) {
        if (overflows(cols[i])) {
            return true;
        }
    }
    return false;
}

// How many lines the title of an event takes: its own text, without the small line of its group under it.
function titleLines(span) {
    const text = span.firstChild;
    if (!text || text.nodeType !== 3 || !document.createRange) {
        return 1;
    }
    const range = document.createRange();
    range.selectNodeContents(text);
    const rects = range.getClientRects();
    const tops = {};
    let n = 0;
    for (let i = 0; i < rects.length; i++) {
        const top = Math.round(rects[i].top);
        if (rects[i].width > 0 && !tops[top]) {
            tops[top] = true;
            n++;
        }
    }
    return n;
}

// A title of an event (of today or of the coming days) in three lines or more.
function longTitles(col, selector) {
    const spans = col.querySelectorAll(selector);
    for (let i = 0; i < spans.length; i++) {
        if (titleLines(spans[i]) > 2) {
            return true;
        }
    }
    return false;
}

// Bigger letters are worth it only while a dish, a notice or the title of an event keeps to two lines.
function threeLines(cols) {
    for (let i = 0; i < cols.length; i++) {
        const lines = cols[i].querySelectorAll('.hk-plato span, .hk-aviso h3');
        for (let j = 0; j < lines.length; j++) {
            const height = parseFloat(window.getComputedStyle(lines[j]).lineHeight);
            if (lines[j].offsetHeight > height * 2.5) {
                return true;
            }
        }
        if (longTitles(cols[i], '.hk-evento:not(.hk-proximo) > span')) {
            return true;
        }
    }
    return false;
}

function largestScale(cols) {
    for (let s = MAX_SCALE; s >= 0; s--) {
        each(cols, function (c) {
            c.setAttribute('data-escala', String(s));
        });
        if (!anyOverflows(cols) && (s === 0 || !threeLines(cols))) {
            return s;
        }
    }
    return -1;
}

function showPage(b, page) {
    const per = b.hkPer;
    while (b.childNodes.length > 1) {
        b.removeChild(b.lastChild);
    }
    each(b.hkList.slice(page * per, page * per + per), function (x) {
        b.appendChild(b.hkMake(x));
    });
    const label = b.firstChild;
    const old = label.querySelector('.hk-paginas');
    if (old) {
        label.removeChild(old);
    }
    if (b.hkPages > 1) {
        const dots = el('span', 'hk-paginas');
        for (let i = 0; i < b.hkPages; i++) {
            dots.appendChild(el('i', i === page ? 'hk-pagina-actual' : ''));
        }
        label.appendChild(dots);
    }
    b.hkPage = page;
}

// A block that still does not fit at scale 0 turns pages: as many per page as fit, in even pages (four where three
// fit go as two and two).
function paginate(cols, b) {
    const list = b.hkList;
    if (!list || list.length < 2) {
        return;
    }
    let per = list.length;
    b.hkPer = per;
    b.hkPages = 1;
    while (per > 1 && anyOverflows(cols)) {
        per--;
        b.hkPer = per;
        showPage(b, 0);
    }
    const pages = Math.ceil(list.length / per);
    b.hkPer = Math.ceil(list.length / pages);
    b.hkPages = pages;
    showPage(b, 0);
}

function comingRow(r) {
    const d = el('div', 'hk-evento hk-proximo' + (r.sameDay ? ' hk-mismo-dia' : ''));
    stage(d, r.color);
    d.appendChild(el('time', '', r.day));
    const s = el('span', '', r.title);
    if (r.group) {
        s.appendChild(el('small', '', r.group));
    }
    d.appendChild(s);
    return d;
}

// The coming days take what is left at the scale already chosen: the countdown first, then the days from the
// nearest, while nothing overflows. They never turn pages; if nothing fits, the block is not there.
function addComing(col, cols, data, labels) {
    const b = el('section', 'hk-bloque hk-proximos');
    b.appendChild(el('h2', 'hk-etiqueta', labels.upcoming));
    col.appendChild(b);
    let rows = 0;
    if (data.countdown) {
        const c = el('div', 'hk-cuenta');
        stage(c, data.countdown.color);
        c.appendChild(el('b', '', String(data.countdown.days)));
        c.appendChild(el('small', '', labels.days));
        // Its day and its group under the title: «2 days» says nothing without which Thursday and whose.
        const t = el('span', '', data.countdown.title);
        t.appendChild(el('small', '', data.countdown.day + (data.countdown.group ? ' · ' + data.countdown.group : '')));
        c.appendChild(t);
        b.appendChild(c);
        if (anyOverflows(cols)) {
            b.removeChild(c);
        } else {
            rows++;
        }
    }
    const list = data.upcoming || [];
    for (let i = 0; i < list.length; i++) {
        const r = comingRow(list[i]);
        b.appendChild(r);
        if (anyOverflows(cols)) {
            b.removeChild(r);
            break;
        }
        rows++;
    }
    return {block: b, rows};
}

function dropComing(col, b) {
    col.removeChild(b);
    if (!col.childNodes.length && col.parentNode) {
        col.parentNode.removeChild(col);
    }
}

/**
 * Fits «Today» to its slot, once the layer is in the page (it measures). Returns the blocks that turn pages, for the
 * caller's timer.
 *
 * @param {HTMLElement|null} aside
 * @returns {HTMLElement[]}
 */
export function fitToday(aside) {
    if (!aside) {
        return [];
    }
    const cols = [];
    each(aside.childNodes, function (c) {
        cols.push(c);
    });
    const comingCol = cols.filter(function (c) {
        return c.hkComing;
    })[0];
    // A column that is only there for the coming days is measured after the rest.
    const measured = cols.filter(function (c) {
        return c.childNodes.length;
    });
    const inRow = window.getComputedStyle(aside).flexDirection === 'row';
    const groups = inRow ? measured.map(function (c) {
        return [c];
    }) : (measured.length ? [measured] : []);
    const paging = [];
    each(groups, function (g) {
        if (largestScale(g) >= 0) {
            return;
        }
        each(['hk-bloque-avisos', 'hk-bloque-eventos'], function (cls) {
            if (!anyOverflows(g)) {
                return;
            }
            each(g, function (col) {
                const b = col.querySelector('.' + cls);
                if (b) {
                    paginate(g, b);
                    if (b.hkPages > 1) {
                        paging.push(b);
                    }
                }
            });
        });
        largestScale(g);
        if (anyOverflows(g)) {
            each(g, function (c) {
                c.setAttribute('data-escala', '0');
            });
        }
    });
    if (comingCol) {
        if (!comingCol.getAttribute('data-escala')) {
            // Alone: as big as the other column, or the biggest that lets one day in.
            const other = measured[0];
            comingCol.setAttribute('data-escala', other ? other.getAttribute('data-escala') : String(MAX_SCALE));
        }
        // An agenda is there to see what is coming: at least three of them (or all there are), so their column comes
        // down a step at a time until they fit.
        const group = inRow ? [comingCol] : cols;
        const data = aside.hkData;
        const want = Math.min(3, (data.countdown ? 1 : 0) + (data.upcoming || []).length);
        let scale = parseInt(comingCol.getAttribute('data-escala'), 10) || 0;
        for (;;) {
            const got = addComing(comingCol, group, data, aside.hkLabels);
            // Enough of them, and none of their titles in three lines; else a step down.
            if ((got.rows >= want && !longTitles(comingCol, '.hk-proximo > span')) || scale === 0) {
                if (!got.rows) {
                    dropComing(comingCol, got.block);
                }
                break;
            }
            comingCol.removeChild(got.block);
            scale--;
            each(group, function (c) {
                c.setAttribute('data-escala', String(Math.min(scale, parseInt(c.getAttribute('data-escala'), 10) || 0)));
            });
        }
    }
    return paging;
}

/** Turns the pages of the blocks that need it; returns the timer, to stop it when the layer goes. */
export function turnPages(blocks) {
    if (!blocks.length) {
        return null;
    }
    return setInterval(function () {
        each(blocks, function (b) {
            showPage(b, (b.hkPage + 1) % b.hkPages);
        });
    }, PAGE_SECONDS * 1000);
}

/** How many things «Today» has: the menu counts as one, each notice and each event as one; the weather does not. */
export function countToday(data) {
    return (data.menu ? 1 : 0) + data.notices.length + data.events.length;
}
