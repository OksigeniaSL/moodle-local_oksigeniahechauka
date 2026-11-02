// «La tabla»: a sheet or a JSON of the centre on the screen (timetables, shifts, results, rooms…), of which nothing is known beforehand:
// one column or six, two rows or a hundred, numbers, hours or words, and cells of any length side by side. So nothing here is decided by
// counting: it is laid out with the real letter of the real screen and measured. A proper table while it reads as one; if it does not
// fit, or its cells would go to too many lines, each row becomes a card, with its column's name beside each value. Only if a card does
// not fit on the sheet even so, from afar, it keeps its first columns. No word is cut. Gaudí, 2 November 2026.

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

// A long word breaks only at its own joints (an address, a code), never in the middle.
function fill(node, text) {
    String(text).split(/(\s+)/).forEach(function (part) {
        if (part.length < 16 || !/[/._\-@]/.test(part)) {
            node.appendChild(document.createTextNode(part));
            return;
        }
        part.split(/([/._\-@]+)/).forEach(function (bit, i) {
            if (bit) {
                node.appendChild(document.createTextNode(bit));
            }
            if (i % 2) {
                node.appendChild(el('wbr'));
            }
        });
    });
    return node;
}

const MAX_COLUMNS = 6;
const MAX_LINES = 3;
// What reads as a figure, an hour or a range of them: it goes to the right, in figures of one width, and in one line.
const FIGURE = /^[\s\d.,:;%+\-–—€$£/()hHº°]+$/;

/**
 * The table as it will be drawn: as many columns as it has, six at most, none of them empty, and only the rows with something in them.
 *
 * @param {object} [item] {title, head: [string], rows: [[string]]}
 * @returns {{title: string, head: string[], rows: string[][], figures: boolean[]}}
 */
export function tableShape(item) {
    const text = function (v) {
        return v === null || v === undefined ? '' : String(v).trim();
    };
    const head = ((item && item.head) || []).map(text);
    const rows = ((item && item.rows) || []).map(function (r) {
        return (r || []).map(text);
    }).filter(function (r) {
        return r.some(Boolean);
    });
    const width = Math.min(MAX_COLUMNS, rows.reduce(function (n, r) {
        return Math.max(n, r.length);
    }, head.length));
    const keep = [];
    for (let k = 0; k < width; k++) {
        if (head[k] || rows.some(function (r) {
            return r[k];
        })) {
            keep.push(k);
        }
    }
    const figures = keep.map(function (k) {
        const cells = rows.map(function (r) {
            return r[k] || '';
        }).filter(Boolean);
        const good = cells.filter(function (c) {
            return FIGURE.test(c) && /\d/.test(c);
        });
        return cells.length > 0 && good.length / cells.length >= .8;
    });
    const hasHead = keep.some(function (k) {
        return head[k];
    });
    return {
        title: text(item && item.title),
        head: hasHead ? keep.map(function (k) {
            return head[k] || '';
        }) : [],
        rows: rows.map(function (r) {
            return keep.map(function (k) {
                return r[k] || '';
            });
        }),
        figures,
    };
}

/**
 * Pages out of what each row or card measures: at least one on each, as full as they can be, and evened out if the last one would be
 * left with a row alone.
 *
 * @param {number[]} heights
 * @param {number} room
 * @returns {number[][]} the indexes on each page
 */
export function pagesOf(heights, room) {
    const cut = function (limit) {
        const pages = [];
        let page = [];
        let used = 0;
        heights.forEach(function (h, i) {
            if (page.length && used + h > limit + 1) {
                pages.push(page);
                page = [];
                used = 0;
            }
            page.push(i);
            used += h;
        });
        if (page.length) {
            pages.push(page);
        }
        return pages;
    };
    const most = cut(room);
    if (!most.length) {
        return [[]];
    }
    const sumOf = function (page) {
        return page.reduce(function (a, i) {
            return a + heights[i];
        }, 0);
    };
    // Full pages read best: they are only evened out when the last one would be left nearly bare.
    if (most.length === 1 || sumOf(most[most.length - 1]) >= room / 2) {
        return most;
    }
    const total = heights.reduce(function (a, h) {
        return a + h;
    }, 0);
    let low = Math.max(total / most.length, Math.max.apply(null, heights));
    let high = room;
    if (low >= high) {
        return most;
    }
    for (let k = 0; k < 14; k++) {
        const mid = (low + high) / 2;
        if (cut(mid).length <= most.length) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return cut(high);
}

/**
 * The slide, empty: it is filled once it is on the page, when there is something to measure against (fitTable).
 *
 * @param {HTMLElement} c the layer
 * @param {object} [item]
 * @param {number} page any number: the turn comes round by the pages that result
 */
export function buildTable(c, item, page) {
    const shape = tableShape(item);
    const s = el('section', 'hk-tabla');
    const head = el('header', 'hk-tabla-cabeza');
    head.appendChild(el('h2', 'hk-tabla-titulo', shape.title));
    const count = el('p', 'hk-tabla-pagina');
    head.appendChild(count);
    s.appendChild(head);
    const room = el('div', 'hk-tabla-cuerpo');
    s.appendChild(room);
    s.hkTable = {shape, page: page || 0, room, count, head, title: head.firstChild};
    c.appendChild(s);
}

function drawTable(t) {
    const table = el('table', 'hk-tabla-t');
    // The first column names its row: on the left, also if it is an hour. Figures in the others go to the right, to be compared.
    const kind = function (k) {
        if (!t.shape.figures[k]) {
            return '';
        }
        return k === 0 ? 'hk-tabla-hora' : 'hk-tabla-cifra';
    };
    if (t.shape.head.length) {
        const thead = el('thead');
        const tr = el('tr');
        t.shape.head.forEach(function (h, k) {
            const th = fill(el('th', kind(k)), h);
            th.setAttribute('scope', 'col');
            tr.appendChild(th);
        });
        thead.appendChild(tr);
        table.appendChild(thead);
    }
    const tbody = el('tbody');
    t.shape.rows.forEach(function (r) {
        const tr = el('tr');
        r.forEach(function (cell, k) {
            const td = fill(el(k === 0 ? 'th' : 'td', kind(k)), cell);
            if (k === 0) {
                td.setAttribute('scope', 'row');
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    clear(t.room);
    t.room.appendChild(table);
    return table;
}

function roomOf(room) {
    const style = getComputedStyle(room);
    return {width: room.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), height: room.clientHeight};
}

// How the table comes out at this letter: wide enough? how many lines does its fullest row take? all of it at once?
function measureTable(t, table) {
    const room = roomOf(t.room);
    let lines = 0;
    Array.prototype.forEach.call(table.tBodies[0].rows, function (tr) {
        Array.prototype.forEach.call(tr.cells, function (cell) {
            const style = getComputedStyle(cell);
            const lh = parseFloat(style.lineHeight) || 1;
            const inner = cell.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
            lines = Math.max(lines, Math.round(inner / lh));
        });
    });
    return {fits: table.offsetWidth <= room.width + 1, lines, whole: table.offsetHeight <= room.height + 1};
}

function showTable(t, table, s) {
    // The widths with all the rows in, kept from page to page, so the columns do not jump.
    const first = table.rows[0];
    const widths = Array.prototype.map.call(first.cells, function (cell) {
        return cell.getBoundingClientRect().width;
    });
    const cols = el('colgroup');
    widths.forEach(function (w) {
        const col = el('col');
        col.style.width = w + 'px';
        cols.appendChild(col);
    });
    table.insertBefore(cols, table.firstChild);
    table.style.tableLayout = 'fixed';
    const body = table.tBodies[0];
    const headHeight = table.tHead ? table.tHead.offsetHeight : 0;
    const rows = Array.prototype.slice.call(body.rows);
    const room = roomOf(t.room).height;
    const heights = rows.map(function (tr) {
        return tr.getBoundingClientRect().height;
    });
    const pages = pagesOf(heights, room - headHeight);
    const at = ((t.page % pages.length) + pages.length) % pages.length;
    const sumOf = function (page) {
        return page.reduce(function (a, i) {
            return a + heights[i];
        }, 0);
    };
    rows.forEach(function (tr, i) {
        if (pages[at].indexOf(i) < 0) {
            body.removeChild(tr);
        }
    });
    paintCount(t, at, pages.length, s);
    // What is left of the sheet goes to the rows, up to a point: a table, not a poster. The same on every page, by the fullest one.
    const grow = Math.min(1.8, (room - headHeight) / Math.max.apply(null, pages.map(sumOf)));
    if (grow > 1.01) {
        table.style.height = Math.floor(headHeight + sumOf(pages[at]) * grow) + 'px';
        table.setAttribute('data-estirada', '');
    }
}

function drawCards(t, columns) {
    const list = el('div', 'hk-tabla-fichas');
    t.shape.rows.forEach(function (r) {
        const card = el('article', 'hk-tabla-ficha');
        const lead = r.findIndex(Boolean);
        card.appendChild(fill(el('h3', 'hk-tabla-ficha-titulo'), r[lead]));
        const pairs = el('div', 'hk-tabla-pares');
        r.forEach(function (cell, k) {
            if (k === lead || !cell || k >= columns) {
                return;
            }
            const pair = el('div', 'hk-tabla-par hk-tabla-col-' + k);
            if (t.shape.head[k]) {
                pair.appendChild(fill(el('span', 'hk-tabla-par-nombre'), t.shape.head[k]));
            }
            pair.appendChild(fill(el('span', 'hk-tabla-par-valor'), cell));
            pairs.appendChild(pair);
        });
        if (pairs.firstChild) {
            card.appendChild(pairs);
        }
        list.appendChild(card);
    });
    clear(t.room);
    t.room.appendChild(list);
    return list;
}

// Each column, one width in every card: read down, as in the table they come from. On a wide screen with a card to itself, a name
// beside each value instead, in a column as wide as the longest of them: it takes half the height.
function alignPairs(list, s) {
    if (s.getAttribute('data-fichas') === 'una' && s.getAttribute('data-ancha') === 'si') {
        const names = list.querySelectorAll('.hk-tabla-par-nombre');
        let widest = 0;
        Array.prototype.forEach.call(names, function (n) {
            widest = Math.max(widest, Math.ceil(n.getBoundingClientRect().width));
        });
        if (widest <= list.clientWidth * .3) {
            list.style.setProperty('--hk-tabla-nombre', widest + 'px');
            return;
        }
        // A name too long to go beside its value would have to shrink under the least that is read: each name over its value.
        s.setAttribute('data-ancha', 'no');
    }
    for (let k = 0; k < MAX_COLUMNS; k++) {
        const pairs = list.querySelectorAll('.hk-tabla-col-' + k);
        let most = 0;
        Array.prototype.forEach.call(pairs, function (p) {
            most = Math.max(most, Math.ceil(p.getBoundingClientRect().width));
        });
        Array.prototype.forEach.call(pairs, function (p) {
            p.style.width = most + 'px';
        });
    }
}

function roomForCards(t, list) {
    return t.room.clientHeight - parseFloat(getComputedStyle(list).paddingTop);
}

function cardsFit(list, room) {
    return !Array.prototype.some.call(list.children, function (card) {
        return card.offsetHeight > room;
    });
}

function showCards(t, list, s) {
    const room = roomForCards(t, list);
    // Only a word wider than the whole card goes under the letter it should have: there is no other way of not cutting it.
    Array.prototype.forEach.call(list.querySelectorAll('.hk-tabla-ficha-titulo, .hk-tabla-par-valor, .hk-tabla-par-nombre'), function (x) {
        if (x.scrollWidth > x.clientWidth + 1) {
            x.style.fontSize = Math.floor(parseFloat(getComputedStyle(x).fontSize) * x.clientWidth / x.scrollWidth) + 'px';
        }
    });
    // Cards side by side go down in rows: a row takes what its tallest card takes.
    const rows = [];
    Array.prototype.forEach.call(list.children, function (card) {
        const top = card.offsetTop;
        const last = rows[rows.length - 1];
        if (last && last.top === top) {
            last.cards.push(card);
        } else {
            rows.push({top, cards: [card]});
        }
    });
    const heights = rows.map(function (r, i) {
        return (i + 1 < rows.length ? rows[i + 1].top : list.scrollHeight) - r.top;
    });
    const pages = pagesOf(heights, room);
    const at = ((t.page % pages.length) + pages.length) % pages.length;
    rows.forEach(function (r, i) {
        if (pages[at].indexOf(i) < 0) {
            r.cards.forEach(function (card) {
                list.removeChild(card);
            });
        }
    });
    paintCount(t, at, pages.length, s);
}

function paintCount(t, at, of, s) {
    clear(t.count);
    if (of > 1) {
        t.count.appendChild(el('b', '', String(at + 1)));
        t.count.appendChild(document.createTextNode('/' + of));
    }
    s.setAttribute('data-sin-cabeza', t.shape.title || of > 1 ? 'no' : 'si');
}

/**
 * The letter and the form the table takes on this screen, by measuring. As large as lets all of it fit at once; if it cannot, at the size
 * of a list, or of the least that is read, by pages. If not even that (wider than the sheet, or a cell in more than three lines), cards.
 * It can be run again: it starts from the data each time.
 *
 * @param {HTMLElement} c the layer
 */
export function fitTable(c) {
    const s = c.querySelector('.hk-tabla');
    if (!s || !s.hkTable) {
        return;
    }
    const t = s.hkTable;
    s.removeAttribute('data-fichas');
    s.removeAttribute('data-columnas');
    // With a page count in place, the title has the room it will have, and one in more than a line goes a size down: it is the rows that matter.
    paintCount(t, 0, 2, s);
    s.removeAttribute('data-titulo');
    const lh = parseFloat(getComputedStyle(t.title).lineHeight) || 1;
    if (t.title.offsetHeight / lh > 1.2) {
        s.setAttribute('data-titulo', 'largo');
    }
    const ask = function (size) {
        s.setAttribute('data-modo', 'tabla');
        s.setAttribute('data-letra', size);
        const table = drawTable(t);
        return {table, m: measureTable(t, table)};
    };
    // A long list cannot go in one page at any letter: no need to try.
    const sizes = t.shape.rows.length > 30 ? [] : ['enorme', 'grande', 'normal', 'justa'];
    for (let k = 0; k < sizes.length; k++) {
        const r = ask(sizes[k]);
        if (r.m.fits && r.m.whole && r.m.lines <= MAX_LINES) {
            showTable(t, r.table, s);
            return;
        }
    }
    const paged = ['normal', 'justa'];
    for (let k = 0; k < paged.length; k++) {
        const r = ask(paged[k]);
        if (r.m.fits && r.m.lines <= MAX_LINES) {
            showTable(t, r.table, s);
            return;
        }
    }
    // Cards, each whole on its page: side by side, one under another, at the least that is read.
    const all = MAX_COLUMNS;
    s.setAttribute('data-modo', 'fichas');
    const tries = [['normal', 'dos'], ['justa', 'dos'], ['normal', 'una'], ['justa', 'una']];
    const wide = t.room.clientWidth > t.room.clientHeight ? 'si' : 'no';
    for (let k = 0; k < tries.length; k++) {
        s.setAttribute('data-ancha', wide);
        s.setAttribute('data-letra', tries[k][0]);
        s.setAttribute('data-fichas', tries[k][1]);
        const list = drawCards(t, all);
        alignPairs(list, s);
        if (cardsFit(list, roomForCards(t, list))) {
            showCards(t, list, s);
            return;
        }
    }
    // A card that does not fit on the sheet even so: from afar, its first columns, the ones a sheet puts first. Better a card read whole
    // than a row in pieces over many turns, or letters nobody can read from there.
    for (let n = t.shape.rows[0] ? t.shape.rows[0].length - 1 : 1; n >= 2; n--) {
        s.setAttribute('data-ancha', wide);
        const list = drawCards(t, n);
        alignPairs(list, s);
        if (cardsFit(list, roomForCards(t, list)) || n === 2) {
            s.setAttribute('data-columnas', String(n));
            showCards(t, list, s);
            return;
        }
    }
    showCards(t, drawCards(t, all), s);
}
