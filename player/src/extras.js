// The slides of what comes by itself: whose birthday it is and what has come to the library.

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

/**
 * Whose birthday it is, a page of them.
 *
 * @param {{item: object, page: number}} extra
 * @param {object} media to find the pictures
 * @param {object} s strings
 * @returns {HTMLElement}
 */
export function buildBirthdays(extra, media, s) {
    const people = extra.item.people || [];
    const most = 6;
    const pages = Math.max(1, Math.ceil(people.length / most));
    const start = (extra.page % pages) * most;
    const box = el('section', 'hk-cumple');
    box.appendChild(el('h2', '', people.length > 1 ? s.birthdays_many || '' : s.birthdays_one || ''));
    people.slice(start, start + most).forEach(function (person) {
        const row = el('div', 'hk-cumple-persona');
        const src = person.photo ? media.url(person.photo) : '';
        if (src) {
            const img = el('img');
            img.alt = '';
            img.src = src;
            row.appendChild(img);
        }
        row.appendChild(el('b', '', person.name));
        if (person.group) {
            row.appendChild(el('small', '', person.group));
        }
        box.appendChild(row);
    });
    return box;
}

/**
 * What has come to the library: a book at a time.
 *
 * @param {{item: object, page: number}} extra
 * @param {object} media to find the covers
 * @returns {HTMLElement}
 */
export function buildBooks(extra, media) {
    const books = extra.item.books || [];
    const book = books[extra.page % Math.max(1, books.length)] || {};
    const box = el('section', 'hk-biblioteca');
    box.appendChild(el('h2', '', extra.item.label || ''));
    const src = book.cover ? media.url(book.cover) : '';
    if (src) {
        const img = el('img');
        img.alt = '';
        img.src = src;
        box.appendChild(img);
    }
    box.appendChild(el('b', '', book.title || ''));
    box.appendChild(el('small', '', (book.authors || []).join(', ')));
    return box;
}
