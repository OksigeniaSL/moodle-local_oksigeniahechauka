// The photos of an album: the carousel in a third and the wall (the art direction's «fotos.css», Gaudí, 1 November 2026).
// A photo goes where its shape fits, and only one thing changes at a time: the eye is never pulled to two places. From the
// art direction's demo: ponerFoto, construirCarrusel, arrancarCarrusel, construirMuroCeldas, arrancarMuro.

const CAROUSEL_STEP = 7;
const WALL_STEP = 6.5;
const WALL_STEP_SHOWCASE = 7.5;
// Never left to right: it would read as a machine.
const WALL_ORDER = [0, 3, 1, 4, 2];
// From far, fewer and larger.
const WALL_TOP = {3: 5, 5: 4, 8: 3};

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

function shapeOf(f) {
    return f.width / f.height;
}

/**
 * The albums of what can be shown now: the pictures that say they belong to one, grouped, in their order.
 *
 * @param {object[]} queue pictures and videos
 * @param {function(object): string} urlOf the address of a picture
 * @returns {object[]} {id, name, headline, subtitle, web, photos: [{url, width, height, focus}]}
 */
export function albumsOf(queue, urlOf) {
    const out = [];
    const byId = {};
    each(queue, function (it) {
        if (!it.album || it.type !== 'image') {
            return;
        }
        let a = byId[it.album.id];
        if (!a) {
            a = {id: it.album.id, name: it.album.name || '', headline: it.album.headline || '',
                subtitle: it.album.subtitle || '', web: it.album.web || '', photos: []};
            byId[it.album.id] = a;
            out.push(a);
        }
        const m = it.media || {};
        a.photos.push({url: urlOf(it.media), width: m.width || 16, height: m.height || 9, focus: it.focus || null});
    });
    return out;
}

/**
 * The queue with each album as one thing: however many photos it has, it takes the turn of one and gives the next each
 * time, so that a large album does not push out the rest. The photo says what its album says, unless it has its own words.
 *
 * @param {object[]} queue pictures and videos
 * @param {object} turns how many photos of each album have come out, by album
 * @returns {object[]}
 */
export function oneOfEachAlbum(queue, turns) {
    const inAlbum = function (it) {
        return !!it.album && it.type === 'image';
    };
    const groups = {};
    each(queue, function (it) {
        if (inAlbum(it)) {
            groups[it.album.id] = (groups[it.album.id] || []).concat([it]);
        }
    });
    const out = [];
    const done = {};
    each(queue, function (it) {
        if (!inAlbum(it)) {
            out.push(it);
            return;
        }
        const a = it.album;
        if (done[a.id]) {
            return;
        }
        done[a.id] = true;
        const list = groups[a.id];
        const photo = list[(turns[a.id] || 0) % list.length];
        out.push(Object.assign({}, photo, {
            id: 'album-' + a.id,
            caption: photo.caption || {title: a.headline || a.name, text: a.subtitle},
            web: photo.web || a.web,
        }));
    });
    return out;
}

function photoNode(f) {
    const d = el('div', 'hk-foto');
    const img = el('img');
    img.alt = '';
    img.src = f.url;
    if (f.focus) {
        img.style.objectPosition = Math.round(f.focus[0] * 100) + '% ' + Math.round(f.focus[1] * 100) + '%';
    }
    d.appendChild(img);
    return d;
}

// The new photo over the old one, once it has loaded; the old one leaves when covered.
function putPhoto(box, f, animated) {
    const olds = [];
    each(box.querySelectorAll('.hk-foto'), function (x) {
        olds.push(x);
    });
    const remove = function () {
        each(olds, function (x) {
            if (x.parentNode) {
                x.parentNode.removeChild(x);
            }
        });
    };
    const fresh = photoNode(f);
    if (!animated) {
        fresh.classList.add('hk-visible');
        fresh.classList.add('hk-sin-paso');
        box.appendChild(fresh);
        remove();
        return;
    }
    box.appendChild(fresh);
    const img = fresh.querySelector('img');
    let done = false;
    const enter = function () {
        if (done) {
            return;
        }
        done = true;
        void fresh.offsetWidth;
        requestAnimationFrame(function () {
            fresh.classList.add('hk-visible');
            setTimeout(remove, 2200);
        });
    };
    if (img.complete) {
        enter();
    } else {
        img.onload = enter;
        img.onerror = enter;
    }
}

/**
 * The carousel in a third.
 *
 * @param {object} album
 * @returns {HTMLElement}
 */
export function buildCarousel(album) {
    const a = el('aside', 'hk-carrusel');
    a.appendChild(el('div', 'hk-carrusel-fotos'));
    const foot = el('div', 'hk-carrusel-pie');
    foot.appendChild(el('h3', '', album.name));
    foot.appendChild(el('p', 'hk-carrusel-puntos'));
    a.appendChild(foot);
    a.hkAlbum = album;
    return a;
}

/**
 * Once in the page: the photos that fit the third come first, with their dots. Each photo also calls onTurn (the list of
 * the two thirds turns its page). c.hkStop stops it.
 *
 * @param {HTMLElement} c the layer
 * @param {function(): void} onTurn
 * @param {function(HTMLElement): number} linesOf
 * @returns {number} the seconds of the slide
 */
export function startCarousel(c, onTurn, linesOf) {
    const a = c.querySelector('.hk-carrusel');
    const box = a.querySelector('.hk-carrusel-fotos');
    const dots = a.querySelector('.hk-carrusel-puntos');
    const foot = a.querySelector('.hk-carrusel-pie');
    if (linesOf(foot.querySelector('h3')) > 2) {
        foot.setAttribute('data-ajuste', '1');
    }
    const wide = box.offsetWidth >= box.offsetHeight;
    const all = a.hkAlbum.photos;
    const photos = all.filter(function (f) {
        return (shapeOf(f) >= 1) === wide;
    }).concat(all.filter(function (f) {
        return (shapeOf(f) >= 1) !== wide;
    })).slice(0, 5);
    each(photos, function () {
        dots.appendChild(el('i'));
    });
    let i = 0;
    const mark = function () {
        each(dots.children, function (p, k) {
            p.classList.toggle('hk-punto-actual', k === i);
        });
    };
    putPhoto(box, photos[i], false);
    mark();
    if (photos.length > 1) {
        let timer = null;
        const turn = function () {
            timer = setTimeout(function () {
                i = (i + 1) % photos.length;
                putPhoto(box, photos[i], true);
                mark();
                onTurn();
                turn();
            }, CAROUSEL_STEP * 1000);
        };
        turn();
        c.hkStop = function () {
            clearTimeout(timer);
        };
    }
    return Math.max(21, Math.min(28, photos.length * CAROUSEL_STEP));
}

/**
 * How many cells a wall has: by the distance, and one fewer than the photos, so it can change.
 *
 * @param {object} album
 * @param {number} distance
 * @returns {number}
 */
export function wallCount(album, distance) {
    return Math.min(WALL_TOP[distance] || 5, Math.max(3, album.photos.length - 1));
}

/**
 * The wall's cells. A group inside a group goes the other way: that gives each orientation its mosaic, without grid.
 *
 * @param {number} n 3, 4 or 5
 * @returns {HTMLElement}
 */
export function buildWall(n) {
    const m = el('div', 'hk-muro');
    m.setAttribute('data-fotos', String(n));
    const group = function (kids) {
        const g = el('div', 'hk-muro-grupo');
        each(kids, function (h) {
            g.appendChild(h);
        });
        return g;
    };
    const cell = function () {
        return el('div', 'hk-muro-celda');
    };
    m.appendChild(group([cell()]));
    if (n === 3) {
        m.appendChild(group([cell(), cell()]));
    } else if (n === 4) {
        m.appendChild(group([cell(), group([cell(), cell()])]));
    } else {
        m.appendChild(group([cell(), cell()]));
        m.appendChild(group([cell(), cell()]));
    }
    return m;
}

/**
 * The band under a wall.
 *
 * @param {object} album
 * @returns {HTMLElement}
 */
export function buildWallBand(album) {
    const b = el('div', 'hk-muro-banda');
    b.appendChild(el('h2', '', album.headline || album.name));
    if (album.subtitle) {
        b.appendChild(el('p', '', album.subtitle));
    }
    return b;
}

/**
 * Fills the cells, each with the waiting photo that best fits its shape, and starts the turns: one cell at a time, one
 * photo that was not on the wall in, the one it covers to the back of the queue. A wall needs at least one photo more
 * than cells to change; with exactly as many it stays still. owner.hkStop stops it.
 *
 * @param {HTMLElement} owner what holds the cells
 * @param {object} album
 * @param {boolean} showcase
 * @returns {number} the seconds of the slide
 */
export function startWall(owner, album, showcase) {
    const step = showcase ? WALL_STEP_SHOWCASE : WALL_STEP;
    const cells = owner.querySelectorAll('.hk-muro-celda');
    const queue = album.photos.slice();
    const inCell = [];
    const take = function (cell) {
        const wide = cell.offsetWidth >= cell.offsetHeight;
        for (let j = 0; j < queue.length; j++) {
            if ((shapeOf(queue[j]) >= 1) === wide) {
                return queue.splice(j, 1)[0];
            }
        }
        return queue.shift();
    };
    each(cells, function (x, i) {
        const f = take(x);
        inCell[i] = f;
        putPhoto(x, f, false);
    });
    const order = WALL_ORDER.filter(function (i) {
        return i < cells.length;
    });
    let k = 0;
    let timer = null;
    const turn = function () {
        timer = setTimeout(function () {
            if (queue.length) {
                const i = order[k % order.length];
                k++;
                const f = take(cells[i]);
                queue.push(inCell[i]);
                inCell[i] = f;
                putPhoto(cells[i], f, true);
            }
            turn();
        }, step * 1000);
    };
    turn();
    owner.hkStop = function () {
        clearTimeout(timer);
    };
    return Math.round(step * Math.min(cells.length, Math.max(3, album.photos.length - cells.length)) + 2);
}
