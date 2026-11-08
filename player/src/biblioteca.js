// «Novedades de la biblioteca», a slide of its own: a shelf. One book stands out, with its code, and the next ones stand beside it;
// there are as many pages as books, so each one gets its turn with its code. Gaudí, 2 November 2026.

import {fitWord, linesOf} from './lead.js';

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

// How many other books stand on the shelf beside the one that stands out.
const NEXT = {h: {3: 4, 5: 3, 8: 0}, v: {3: 2, 5: 2, 8: 0}};

/** One page per book: the page says which one stands out. */
export function booksPages(item) {
    return Math.max(1, ((item && item.books) || []).length);
}

function cover(b, media, big) {
    const d = el('div', 'hk-libro' + (big ? ' hk-libro-grande' : ''));
    const src = b.cover ? (media(b.cover) || b.cover.url) : null;
    if (src) {
        const im = el('img');
        im.alt = '';
        im.src = src;
        d.appendChild(im);
    } else {
        // A cover of its own: its colour, its title and who wrote it.
        const colour = b.colour || {};
        const drawn = el('div', 'hk-libro-dibujado');
        if (colour.bg) {
            drawn.style.background = colour.bg;
        }
        if (colour.ink) {
            drawn.style.color = colour.ink;
        }
        drawn.appendChild(el('p', 'hk-libro-dibujado-titulo', b.title || ''));
        if (b.authors && b.authors.length) {
            drawn.appendChild(el('p', 'hk-libro-dibujado-autor', b.authors[0]));
        }
        d.appendChild(drawn);
    }
    return d;
}

/**
 * Fills the layer with a book that stands out.
 *
 * @param {HTMLElement} c the layer
 * @param {object} item {label, books: [{title, subtitle, authors, cover, colour, library, web}]}
 * @param {number} page
 * @param {object} o {distance, horizontal, media: function (ref): url, qr: function (url): node}
 */
export function buildBooks(c, item, page, o) {
    const books = (item && item.books) || [];
    if (!books.length) {
        return;
    }
    const at = page % books.length;
    const b = books[at];
    const s = el('section', 'hk-biblio');
    const room = el('div', 'hk-biblio-sala');
    room.appendChild(cover(b, o.media, true));
    const side = el('div', 'hk-biblio-lado');
    const top = el('div', 'hk-biblio-cabeza');
    const words = el('div', 'hk-biblio-texto');
    words.appendChild(el('h2', 'hk-biblio-titulo', b.title || ''));
    if (b.subtitle) {
        words.appendChild(el('p', 'hk-biblio-subtitulo', b.subtitle));
    }
    // Up to two authors; beyond them, how many more.
    const authors = b.authors || [];
    const named = o.distance === 8 ? 1 : 2;
    const said = authors.slice(0, named).join(', ') + (authors.length > named ? ' ' + String(o.more || '').replace('{n}', String(authors.length - named)) : '');
    if (said) {
        words.appendChild(el('p', 'hk-biblio-autor', said));
    }
    if (b.library) {
        words.appendChild(el('p', 'hk-biblio-sitio', b.library));
    }
    top.appendChild(words);
    if (b.web) {
        top.appendChild(o.qr(b.web, b.webqr));
    }
    side.appendChild(el('p', 'hk-biblio-etiqueta', item.label || ''));
    side.appendChild(top);
    const many = Math.min(NEXT[o.horizontal ? 'h' : 'v'][o.distance] || 0, books.length - 1);
    if (many > 0) {
        const others = el('div', 'hk-biblio-otros');
        for (let k = 1; k <= many; k++) {
            others.appendChild(cover(books[(at + k) % books.length], o.media, false));
        }
        side.appendChild(others);
    }
    room.appendChild(side);
    s.appendChild(room);
    s.appendChild(el('div', 'hk-biblio-tabla'));
    c.appendChild(s);
    s.hkBook = b;
}

/**
 * Once in the page: the title by steps, and what goes first when there is no room: the subtitle and the place, then the books beside it.
 * Never a title under the distance's minimum: the sheet stops at the last step.
 *
 * @param {HTMLElement} c the layer
 * @param {boolean} horizontal
 */
export function fitBooks(c, horizontal) {
    const shelf = c.querySelector('.hk-biblio');
    if (!shelf) {
        return;
    }
    const title = shelf.querySelector('.hk-biblio-titulo');
    const side = shelf.querySelector('.hk-biblio-lado');
    const most = horizontal ? 3 : 4;
    title.style.fontSize = '';
    const states = [[], ['hk-biblio-corto'], ['hk-biblio-corto', 'hk-biblio-sin-otros'],
        ['hk-biblio-corto', 'hk-biblio-sin-otros', 'hk-biblio-solo-titulo'],
        ['hk-biblio-corto', 'hk-biblio-sin-otros', 'hk-biblio-solo-titulo', 'hk-biblio-sin-qr']];
    for (let n = 0; n < states.length; n++) {
        shelf.classList.remove('hk-biblio-corto', 'hk-biblio-sin-otros', 'hk-biblio-solo-titulo', 'hk-biblio-sin-qr');
        states[n].forEach(function (cls) {
            shelf.classList.add(cls);
        });
        for (let step = 0; step <= 3; step++) {
            shelf.setAttribute('data-ajuste', String(step));
            if (linesOf(title) <= most && side.scrollHeight <= side.clientHeight + 1 && title.scrollWidth <= title.clientWidth + 1) {
                return;
            }
        }
    }
    // A very long title from afar: smaller than the minimum rather than cut; a single word longer than the column, the same.
    const size = parseFloat(window.getComputedStyle(title).fontSize);
    for (let k = 1; k <= 8 && side.scrollHeight > side.clientHeight + 1; k++) {
        title.style.fontSize = Math.round(size * (1 - k * 0.05)) + 'px';
    }
    fitWord(title);
}
