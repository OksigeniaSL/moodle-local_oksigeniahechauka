// «En nuestro Instagram»: the centre's last posts on the screens, one a turn, so that whoever passes sees what the centre lives
// and follows it from there (14 November 2026, for Hechauka's «Nuestras redes»; as asked: «un QR para que nos sigan en
// Instagram»). A sibling of «Síguenos en …» (canal.js): the same poster in the centre's main colour, and on it the post as the
// app shows it, the picture first and big, whole; beside it (under it on an upright screen) who posts and when, its words, and
// the white card with the QR to follow it and «Síguenos en Instagram».
//
// A carousel goes through its pictures while the slide stands, with its dots; a video shows its cover with the sign of a video
// (it plays in the app, not here). Each turn, the next post of the list, from the newest.
//
// The player builds it in makeLayer (buildInstagram), fits it in adjustLayer (fitInstagram) and gives it its life in startMoving
// (startInstagram; leave() stops it through c.hkStop). Its entrance is movimiento.js's (PARTS.instagram).
//
// Chromium 56: flexbox, margins for gaps, no aspect-ratio, no inset; the carousel changes only opacity.

import {fitWord, linesOf} from './lead.js';
import {glyphSvg} from './redes.js';
import {bindShort} from './canal.js';

/** How long each picture of a carousel stays, in seconds, and how many of its pictures the screen shows at most. */
export const CAROUSEL = {every: 3.6, most: 5};

/** On an upright screen, the share of the poster's height the picture keeps at least. */
const PICTURE_LEAST = 0.4;

/** On a wide screen, the share of the poster's width the picture may take, and the most lines its words take beside it: who
 *  passes looks at the picture, and reads three or four lines, not six (14 November 2026). */
const PICTURE_WIDE = 0.45;
const CAPTION_LINES = 4;

/** A caption cut shorter than this many words is not worth its big letter: the next step down is tried first. */
const CAPTION_LEAST_WORDS = 8;

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

function rem() {
    return parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 10;
}

// A picture as the manifest brings it: one of the screen's media objects ({id, url, sha1, mime, width, height}).
function isMedia(m) {
    return !!(m && (m.url || m.sha1));
}

// A post the screen can show: at least one picture (the cover, for a video).
function shown(post) {
    return !!(post && post.media && post.media.length && isMedia(post.media[0]));
}

/**
 * The posts the screen can show, in the order they came (the newest first). Pure.
 *
 * @param {object} item the manifest's {posts}
 * @returns {object[]}
 */
export function postsOf(item) {
    return ((item && item.posts) || []).filter(shown);
}

/** Whether the slide can come: an address for its QR and one post at least. */
export function instagramShow(item) {
    return !!(item && typeof item.web === 'string' && /^https?:\/\/\S+$/i.test(item.web) && postsOf(item).length);
}

/**
 * The item with only what the device already has: each post with its pictures on the device, and only the posts with one at
 * least; null when none is left, or the slide cannot come. Pure but for the device's store.
 *
 * @param {object|null} item the manifest's {posts}
 * @param {object|null} media the device's store, with ready(media); without it, everything counts as there
 * @returns {object|null}
 */
export function instagramReady(item, media) {
    if (!item) {
        return null;
    }
    const posts = (item.posts || []).map(function (post) {
        const have = (post.media || []).filter(function (m) {
            return isMedia(m) && (!media || media.ready(m));
        });
        return Object.assign({}, post, {media: have});
    }).filter(shown);
    const ready = Object.assign({}, item, {posts: posts});
    return instagramShow(ready) ? ready : null;
}

/**
 * The post of a turn: the newest the first time, the next one each time after, round again. Pure.
 *
 * @param {object} item
 * @param {number} page how many times the slide has come before
 * @returns {object|null}
 */
export function postAt(item, page) {
    const list = postsOf(item);
    if (!list.length) {
        return null;
    }
    const n = Math.max(0, Math.floor(page || 0));
    return list[n % list.length];
}

/** The pictures of a post the screen goes through: the carousel's, up to CAROUSEL.most; one for a picture or a video. */
export function picturesOf(post) {
    if (!shown(post)) {
        return [];
    }
    const all = post.media.filter(isMedia);
    return post.media_type === 'CAROUSEL_ALBUM' ? all.slice(0, CAROUSEL.most) : all.slice(0, 1);
}

/**
 * The words of a post as a screen reads them from metres away: without its emoji (a screen's old browser has no letter for
 * them, and they read as empty boxes), without the hashtags piled at its end, in one paragraph. Pure.
 *
 * @param {string} caption
 * @returns {string}
 */
export function captionWords(caption) {
    let t = String(caption || '');
    // Emoji: the pictures outside the basic plane (a pair of surrogates), the symbols and arrows that turn into emoji, their
    // variation selector, the joiner and the keycap. Written out by hand: the screen's Chromium 56 has no \p{…}.
    t = t.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
        .replace(/[☀-➿⬀-⯿⌀-⏿←-⇿]/g, '')
        .replace(/[︎️‍⃣]/g, '');
    // The hashtags at the end, on their own lines or after the last sentence.
    t = t.replace(/(\s*#[^\s#]+)+\s*$/g, '');
    // One paragraph: line breaks and runs of spaces are a space.
    t = t.replace(/\s+/g, ' ').trim();
    // A sign left alone by a removed emoji at the start («: Hoy…»).
    return t.replace(/^[\s,.;:·•\-–—]+/, '').trim();
}

/**
 * When it was posted, as the app says it: «Hoy», «Ayer», «Hace 3 días» within a week, else the day and month in the screen's
 * language. Without the screen's words, the day and month. Pure but for the date's words.
 *
 * @param {string} timestamp ISO 8601, as Meta sends it («2026-11-12T09:30:00+0000»)
 * @param {Date} now
 * @param {object} s the screen's words: instagram_today, instagram_yesterday, instagram_days ({n})
 * @param {string} [lang]
 * @returns {string}
 */
export function whenWords(timestamp, now, s, lang) {
    const t = parseStamp(timestamp);
    if (!t) {
        return '';
    }
    const w = s || {};
    const day = function (d) {
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
    };
    const ago = Math.round(day(now) - day(t));
    if (ago === 0 && w.instagram_today) {
        return w.instagram_today;
    }
    if (ago === 1 && w.instagram_yesterday) {
        return w.instagram_yesterday;
    }
    if (ago > 1 && ago < 7 && w.instagram_days) {
        return String(w.instagram_days).replace('{n}', String(ago));
    }
    try {
        return t.toLocaleDateString(lang || undefined, {day: 'numeric', month: 'long'});
    } catch (e) {
        return t.getDate() + '/' + (t.getMonth() + 1);
    }
}

// Meta's «+0000» is not a zone Chromium 56's Date reads: it becomes «+00:00».
function parseStamp(stamp) {
    if (!stamp) {
        return null;
    }
    const iso = String(stamp).replace(/([+-]\d\d)(\d\d)$/, '$1:$2');
    const t = new Date(iso);
    return isNaN(t.getTime()) ? null : t;
}

/**
 * Where the picture goes and how big: as big as the poster lets it, whole, with the words keeping their share. Pure.
 *
 * @param {number} w the poster's room, wide
 * @param {number} h the poster's room, high (without the carousel's dots)
 * @param {number} aspect the picture's width over its height
 * @param {boolean} horizontal
 * @param {number} share the words' share
 * @returns {{w: number, h: number}}
 */
export function frameOf(w, h, aspect, horizontal, share) {
    const a = aspect > 0 ? aspect : 1;
    let fw;
    if (horizontal) {
        fw = Math.min(w * (1 - share), h * a);
    } else {
        fw = Math.min(w, h * (1 - share) * a);
    }
    return {w: Math.floor(fw), h: Math.floor(fw / a)};
}

// The shape of a post's first picture: its media's size, else square, as the app's grid.
function aspectOf(post) {
    const m = (post && post.media && post.media[0]) || {};
    return m.width > 0 && m.height > 0 ? m.width / m.height : 1;
}

/**
 * Fills the layer with a post.
 *
 * @param {HTMLElement} c the layer
 * @param {object} item the manifest's {id, type: 'instagram', zone: 'extra', network, title, name, web, webqr, posts: [{id,
 *     media_type: 'IMAGE'|'VIDEO'|'CAROUSEL_ALBUM', media: [media objects], caption, timestamp}]}
 * @param {number} page how many times the slide has come before
 * @param {object} o {s: the screen's words, media: (ref) → url, qr: (url, image) → node, now: Date, lang, horizontal}
 */
export function buildInstagram(c, item, page, o) {
    if (!instagramShow(item)) {
        return;
    }
    const post = postAt(item, page);
    const pictures = picturesOf(post);
    const aspect = aspectOf(post);
    const s = el('section', 'hk-ig');
    s.setAttribute('data-forma', aspect > 1.05 ? 'h' : aspect < 0.95 ? 'v' : 'c');
    s.setAttribute('data-ajuste', '0');
    s.hkAspect = aspect;
    // The post: its pictures stacked (one shows at a time), the sign of a video, the dots of a carousel.
    const fig = el('figure', 'hk-ig-foto');
    const frame = el('div', 'hk-ig-marco');
    pictures.forEach(function (m, i) {
        const im = el('img', 'hk-ig-img' + (i === 0 ? ' hk-ig-ahora' : ''));
        im.alt = '';
        // On a screen, only from the device: the server's address answers 401 without the screen's key (0.19.2).
        const src = o.media ? o.media(m) : m.url;
        if (src) {
            im.src = src;
        }
        frame.appendChild(im);
    });
    if (post.media_type === 'VIDEO') {
        const play = el('span', 'hk-ig-video');
        play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
        frame.appendChild(play);
    }
    fig.appendChild(frame);
    if (pictures.length > 1) {
        const dots = el('div', 'hk-ig-puntos');
        pictures.forEach(function (m, i) {
            dots.appendChild(el('i', i === 0 ? 'hk-ig-ahora' : ''));
        });
        fig.appendChild(dots);
    }
    s.appendChild(fig);
    // Beside it: who posts, its words, when, and «Síguenos en Instagram» low, in a column; the card with the QR in its own, as
    // the card of «Síguenos en …» stands at the poster's side. Upright, under the picture: who posts across the whole width,
    // and under it the same two columns.
    const vertical = o.horizontal === false;
    const side = el('div', 'hk-ig-lado');
    const text = el('div', 'hk-ig-texto');
    const who = el('p', 'hk-ig-quien');
    const glyph = el('span', 'hk-ig-red');
    glyph.innerHTML = glyphSvg(item.network || 'instagram');
    who.appendChild(glyph);
    who.appendChild(el('span', 'hk-ig-cuenta', String(item.name || '').trim()));
    (vertical ? side : text).appendChild(who);
    const words = captionWords(post.caption);
    if (words) {
        const caption = el('p', 'hk-ig-pie', words);
        caption.hkWords = words;
        text.appendChild(caption);
    }
    // When it was posted, under its words, small, as the app says it.
    const when = whenWords(post.timestamp, o.now || new Date(), o.s, o.lang);
    if (when) {
        text.appendChild(el('p', 'hk-ig-cuando', when));
    }
    text.appendChild(el('h2', 'hk-ig-titular', bindShort(String(item.title || '').trim())));
    const row = vertical ? el('div', 'hk-ig-sigue') : side;
    row.appendChild(text);
    const column = el('div', 'hk-ig-columna');
    const card = el('div', 'hk-ig-tarjeta');
    const qr = o.qr(item.web, item.webqr);
    if (qr && qr.nodeType === 1) {
        if (qr.querySelector('img')) {
            qr.classList.add('hk-qr-imagen');
        }
        card.appendChild(qr);
    }
    column.appendChild(card);
    row.appendChild(column);
    if (row !== side) {
        side.appendChild(row);
    }
    s.appendChild(side);
    c.appendChild(s);
}

/**
 * Where to cut a caption that does not fit whole: after its last whole sentence when that keeps most of what fits (three fifths
 * of it at least), so it reads ended; else at the last word that fits, with «…». Pure.
 *
 * @param {string[]} words the caption's words
 * @param {number} fit how many of them fit with «…» after them
 * @returns {string}
 */
export function cutWords(words, fit) {
    if (fit >= words.length) {
        return words.join(' ');
    }
    for (let k = fit; k >= Math.max(1, Math.ceil(fit * 0.6)); k--) {
        if (/[.!?…]["»”)]?$/.test(words[k - 1])) {
            return words.slice(0, k).join(' ');
        }
    }
    return words.slice(0, Math.max(1, fit)).join(' ').replace(/[,;:\-–—]+$/, '') + '…';
}

// The caption shortened to what fits (cutWords).
function cutTo(p, fits) {
    const words = p.hkWords.split(' ');
    let lo = 1;
    let hi = words.length;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        p.textContent = words.slice(0, mid).join(' ') + (mid < words.length ? '…' : '');
        if (fits()) {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }
    p.textContent = cutWords(words, lo);
}

/**
 * Once in the page: the picture as big as the words' share lets it, whole; the caption the biggest of its steps that fits (the
 * lead's second line, a list's line, the least that is read), and if even at the least it does not, cut at a word with «…». A
 * caption is never under the least; the QR never under its side; the headline by steps, a word too long for its column smaller.
 *
 * @param {HTMLElement} c the layer
 * @param {boolean} horizontal
 */
export function fitInstagram(c, horizontal) {
    const s = c.querySelector('.hk-ig');
    if (!s) {
        return;
    }
    const fig = s.querySelector('.hk-ig-foto');
    const frame = s.querySelector('.hk-ig-marco');
    const side = s.querySelector('.hk-ig-lado');
    const text = s.querySelector('.hk-ig-texto');
    const column = s.querySelector('.hk-ig-columna');
    const who = s.querySelector('.hk-ig-quien');
    const caption = s.querySelector('.hk-ig-pie');
    const title = s.querySelector('.hk-ig-titular');
    const px = function (n, prop) {
        return parseFloat(window.getComputedStyle(n)[prop]) || 0;
    };
    const roomW = s.clientWidth - px(s, 'paddingLeft') - px(s, 'paddingRight');
    const roomH = s.clientHeight - px(s, 'paddingTop') - px(s, 'paddingBottom');
    const dots = s.querySelector('.hk-ig-puntos');
    const dotsH = dots ? dots.offsetHeight + px(dots, 'marginTop') : 0;
    title.style.fontSize = '';
    s.setAttribute('data-ajuste', '0');
    s.classList.remove('hk-ig-sin-pie');
    const setFrame = function (size) {
        frame.style.width = size.w + 'px';
        frame.style.height = size.h + 'px';
        fig.style.width = size.w + 'px';
    };
    if (horizontal) {
        // The words want room for ten letters of who posts a line, at the least; the card keeps its own column beside them.
        // The picture leads, as on Instagram: up to PICTURE_WIDE of the poster's width, as far as the words keep ten letters
        // of who posts a line and the card its column (14 November 2026).
        const least = 10 * px(who, 'fontSize');
        const w = Math.min(roomW * PICTURE_WIDE, roomW - px(side, 'marginLeft') - column.offsetWidth - px(column, 'marginLeft') - least);
        setFrame(frameOf(w, roomH - dotsH, s.hkAspect, true, 0));
    } else {
        // Upright, first the words with the picture at its least (two fifths of the poster): the picture grows after them.
        setFrame(frameOf(roomW, roomH * PICTURE_LEAST, s.hkAspect, true, 0));
    }
    const fits = function () {
        return text.scrollHeight <= text.clientHeight + 1 && side.scrollWidth <= side.clientWidth + 1 &&
            s.scrollHeight <= s.clientHeight + 1 && (!horizontal || !caption || linesOf(caption) <= CAPTION_LINES);
    };
    // The headline gives way before the post's words: a step smaller at a time, at most four.
    const base = px(title, 'fontSize');
    const titleFits = function () {
        for (let k = 0; k <= 4; k++) {
            title.style.fontSize = k ? Math.round(base * (1 - k * 0.08)) + 'px' : '';
            // A word too long for the headline's column alone smaller, before anything is measured.
            fitWord(title);
            if (fits()) {
                return true;
            }
        }
        return false;
    };
    let done = false;
    for (let i = 0; i <= 2 && !done; i++) {
        s.setAttribute('data-ajuste', String(i));
        if (caption) {
            caption.textContent = caption.hkWords;
        }
        done = titleFits();
        // Wide, a caption is cut at a big letter rather than shown whole at a small one, while the cut keeps enough of it.
        if (!done && horizontal && caption) {
            cutTo(caption, fits);
            done = fits() && caption.textContent.split(' ').length >= Math.min(CAPTION_LEAST_WORDS, caption.hkWords.split(' ').length);
        }
    }
    if (!done && caption) {
        cutTo(caption, fits);
        if (!fits()) {
            s.classList.add('hk-ig-sin-pie');
        }
    }
    fitWord(title);
    if (!horizontal) {
        // What the words left, the picture takes: as tall as the room under it lets it, whole. The words' own height is read
        // with their column not stretched for a moment.
        side.style.flex = 'none';
        text.style.flex = 'none';
        const used = side.offsetHeight + px(side, 'marginTop') + dotsH;
        side.style.flex = '';
        text.style.flex = '';
        setFrame(frameOf(roomW, Math.max(roomH * PICTURE_LEAST, roomH - used), s.hkAspect, true, 0));
        if (!fits()) {
            setFrame(frameOf(roomW, roomH * PICTURE_LEAST, s.hkAspect, true, 0));
        }
    }
}

/**
 * Its life: the carousel goes through its pictures while the slide stands; a screen that keeps still shows the first.
 *
 * @param {HTMLElement} c the layer
 * @param {object} o {still}
 */
export function startInstagram(c, o) {
    const s = c.querySelector('.hk-ig');
    if (!s || (o && o.still)) {
        return;
    }
    const pics = s.querySelectorAll('.hk-ig-img');
    const dots = s.querySelectorAll('.hk-ig-puntos i');
    if (pics.length < 2) {
        return;
    }
    let at = 0;
    stopInstagram(c);
    c.hkCarousel = setInterval(function () {
        pics[at].classList.remove('hk-ig-ahora');
        if (dots[at]) {
            dots[at].classList.remove('hk-ig-ahora');
        }
        at = (at + 1) % pics.length;
        pics[at].classList.add('hk-ig-ahora');
        if (dots[at]) {
            dots[at].classList.add('hk-ig-ahora');
        }
    }, CAROUSEL.every * 1000);
}

/** Stops the carousel (leave()). */
export function stopInstagram(c) {
    if (c && c.hkCarousel) {
        clearInterval(c.hkCarousel);
        c.hkCarousel = null;
    }
}
