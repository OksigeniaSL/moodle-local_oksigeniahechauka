// «Hoy cumplen años»: a slide of its own, with a paper garland over the names. It has to please a child and not embarrass a
// grown-up at a university: flags in the skin's colours, no balloons and no ages. How many fit depends on the distance it is read
// from; the composer sends the next page with the next turn. Gaudí, 2 November 2026.

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

// Measured on the real sheets with long names: horizontal and vertical, by the distance it is read from; behind glass, a row less.
const PER_PAGE = {h: {3: 9, 5: 6, 8: 4}, v: {3: 10, 5: 5, 8: 4}};
const PER_PAGE_GLASS = {h: {3: 6, 5: 4, 8: 2}, v: {3: 8, 5: 4, 8: 3}};

/**
 * How many people fit on a page.
 *
 * @param {number} distance 3, 5 or 8
 * @param {boolean} horizontal
 * @param {boolean} [glass]
 * @returns {number}
 */
export function birthdaysPerPage(distance, horizontal, glass) {
    const table = glass ? PER_PAGE_GLASS : PER_PAGE;
    return table[horizontal ? 'h' : 'v'][distance] || table[horizontal ? 'h' : 'v'][3];
}

/** How many pages a day takes. */
export function birthdaysPages(item, distance, horizontal, glass) {
    return Math.max(1, Math.ceil(((item && item.people) || []).length / birthdaysPerPage(distance, horizontal, glass)));
}

/** The initials of a name: the first letter of its first two words. */
export function initialsOf(name) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(function (w) {
        return w.charAt(0).toUpperCase();
    }).join('');
}

// Always the same colour for the same person, from the skin's.
function toneOf(name) {
    let n = 0;
    for (let i = 0; i < String(name).length; i++) {
        n = (n * 31 + String(name).charCodeAt(i)) % 1000;
    }
    return n % 3;
}

// The garland: swags of string with their flags, along each swag. Inline, so its colours are the skin's.
function garland(swags) {
    const each = 460;
    const W = each * swags;
    const H = 150;
    const flags = 8;
    let string = '';
    let shapes = '';
    let tone = 0;
    for (let s = 0; s < swags; s++) {
        const x0 = s * each;
        const x1 = x0 + each;
        const mx = (x0 + x1) / 2;
        const top = 8;
        const low = 84;
        string += 'M' + x0 + ' ' + top + 'Q' + mx + ' ' + low + ' ' + x1 + ' ' + top;
        for (let k = 0; k < flags; k++) {
            const t = (k + 0.5) / flags;
            const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1;
            const y = (1 - t) * (1 - t) * top + 2 * (1 - t) * t * low + t * t * top;
            const a = Math.atan2(2 * (1 - t) * (low - top) + 2 * t * (top - low), 2 * (1 - t) * (mx - x0) + 2 * t * (x1 - mx));
            const [c, n] = [Math.cos(a), Math.sin(a)];
            const w = 21;
            const h = 52;
            const p = [[x - c * w, y - n * w], [x + c * w, y + n * w], [x - n * h, y + c * h]];
            shapes += '<path class="hk-banderin-' + (tone % 4) + '" d="M' + p.map(function (q) {
                return q[0].toFixed(1) + ' ' + q[1].toFixed(1);
            }).join('L') + 'Z"/>';
            tone++;
        }
    }
    return '<svg class="hk-guirnalda" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + shapes +
        '<path class="hk-guirnalda-cuerda" d="' + string + '"/></svg>';
}

function columnsOf(n, distance, horizontal) {
    if (!horizontal) {
        return distance === 3 && n > 5 ? 2 : 1;
    }
    if (distance === 8) {
        return n <= 2 ? 1 : 2;
    }
    if (n <= 3) {
        return n;
    }
    if (n === 4) {
        return 2;
    }
    return n <= 9 ? 3 : 4;
}

// One, with the whole slide; up to three from close, each standing up; up to three from further, on a larger line; the others, a list.
function sizeOf(n, distance, horizontal) {
    if (n === 1) {
        return 'uno';
    }
    if (n <= 3) {
        return horizontal && distance === 3 ? 'grande' : 'medio';
    }
    return 'lista';
}

function person(p, media) {
    const a = el('article', 'hk-cumple-persona');
    const face = el('div', 'hk-cumple-cara');
    const src = p.photo ? (media(p.photo) || p.photo.url) : null;
    if (src) {
        const im = el('img');
        im.alt = '';
        im.src = src;
        face.appendChild(im);
    } else {
        face.setAttribute('data-tono', String(toneOf(p.name)));
        face.appendChild(el('span', '', initialsOf(p.name)));
    }
    a.appendChild(face);
    const t = el('div', 'hk-cumple-texto');
    t.appendChild(el('p', 'hk-cumple-nombre', p.name));
    if (p.group) {
        t.appendChild(el('p', 'hk-cumple-grupo', p.group));
    }
    a.appendChild(t);
    return a;
}

/**
 * Fills the layer with a page of people.
 *
 * @param {HTMLElement} c the layer
 * @param {object} item {people: [{name, group, photo}]}
 * @param {number} page
 * @param {object} o {distance, horizontal, glass, one, many, media: function (ref): url}
 */
export function buildBirthdays(c, item, page, o) {
    const people = (item && item.people) || [];
    const per = birthdaysPerPage(o.distance, o.horizontal, o.glass);
    const pages = Math.max(1, Math.ceil(people.length / per));
    const from = (page % pages) * per;
    const shown = people.slice(from, from + per);
    const s = el('section', 'hk-cumple');
    // Further away there is less room to spare: more swags, so smaller flags.
    s.innerHTML = garland(o.horizontal ? (o.distance === 8 ? 6 : (o.distance === 5 ? 5 : 4)) : (o.distance === 3 ? 2 : 3));
    s.appendChild(el('h2', 'hk-cumple-titulo', people.length === 1 ? o.one : o.many));
    const grid = el('div', 'hk-cumple-gente');
    const cols = columnsOf(shown.length, o.distance, o.horizontal);
    grid.setAttribute('data-columnas', String(cols));
    grid.setAttribute('data-tam', sizeOf(shown.length, o.distance, o.horizontal));
    shown.forEach(function (p) {
        grid.appendChild(person(p, o.media));
    });
    s.appendChild(grid);
    c.appendChild(s);
}

/**
 * Once in the page: long names a step smaller; then, without their group; nothing is cut.
 *
 * @param {HTMLElement} c the layer
 */
export function fitBirthdays(c) {
    const grid = c.querySelector('.hk-cumple-gente');
    if (!grid) {
        return;
    }
    const over = function () {
        return grid.scrollHeight > grid.clientHeight + 1 || grid.scrollWidth > grid.clientWidth + 1;
    };
    grid.removeAttribute('data-ajuste');
    for (const step of ['1', '2', '3']) {
        if (!over()) {
            return;
        }
        grid.setAttribute('data-ajuste', step);
    }
}
