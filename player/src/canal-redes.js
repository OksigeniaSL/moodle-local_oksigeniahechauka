// «Síguenos en…»: each network its own object and its own world (22 November 2026: of three ways, the art direction's way A, with
// way B's world behind it). The QR lives inside the network's object (a polaroid, a phone, a television, a chat bubble,
// a sheet that unfolds, a browser's window, a note pinned to the board, a comic balloon, a business card, a spool's stitched
// cloth, a cloud), which comes in, does its gesture and keeps still to be read; behind it, softly, the network's world goes on
// (a wall of photos that turn, reels that run, a film that rolls, clouds, a net of pages…), in the skin's own colours. The
// network is never its logo: its glyph in one ink and its name in words, as before.
//
// canal.js builds and fits the slide and calls these: dressObject (the object's pieces), buildWorld (its world, once the block
// is measured), gestureOf (the way in, once) and lifeOf (what keeps moving: only pieces off the code, and the world). Every
// movement is transform or opacity, in Web Animations (Chromium 36); the code never moves once its object has settled.
// Chromium 56: no gap, no grid, no clamp; the pieces are plain boxes, drawn by canal.css.

/** The object of each network; any other, the message that arrives (the slide as it was). */
export const OBJECTS = {
    instagram: 'polaroid', tiktok: 'movil', youtube: 'tele', facebook: 'nota', x: 'vineta', linkedin: 'tarjeta', threads: 'carrete',
    bluesky: 'nube', telegram: 'hoja', whatsapp: 'bocadillo', web: 'ventana', other: 'mensaje',
};

/** The world behind each object. */
export const WORLDS = {
    polaroid: 'fotos', movil: 'reels', tele: 'cine', nota: 'tablon', vineta: 'teletipo', tarjeta: 'organigrama', carrete: 'costura',
    nube: 'manana', hoja: 'cielo', bocadillo: 'charla', ventana: 'red', mensaje: 'charla',
};

/** When the card comes in, in seconds (movimiento.js: wait + 4.5 steps, PARTS.canal): the object's gesture starts then. */
export const ENTRANCE_AT = {sobria: 0.59, elegante: 0.725, juguetona: 0.815};

/** How strong a world is behind its object (canal.css's .hk-canal-mundo > i): what fades in it never goes over it. */
export const WORLD_OPACITY = 0.3;

/** How much each level of movement moves: the turns and the throws of a gesture, and its pace. */
export const LEVELS = {sobria: {k: 0.5, pace: 1.15}, elegante: {k: 1, pace: 1}, juguetona: {k: 1.3, pace: 0.95}};

/**
 * The object of a network. Pure.
 *
 * @param {string} network
 * @returns {string}
 */
export function objectOf(network) {
    return Object.prototype.hasOwnProperty.call(OBJECTS, network) ? OBJECTS[network] : 'mensaje';
}

function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) {
        n.className = cls;
    }
    return n;
}

// A piece of an object: a plain box canal.css draws, named by data-p.
function piece(host, name, inner) {
    const p = el('i', 'hk-canal-p');
    p.setAttribute('data-p', name);
    if (inner) {
        p.innerHTML = inner;
    }
    host.appendChild(p);
    return p;
}

const SVG = function (box, d, fill) {
    return '<svg viewBox="' + box + '" aria-hidden="true" focusable="false"><path d="' + d + '"' + (fill ? '' : ' fill="none" stroke="currentColor" ' +
        'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"') + '/></svg>';
};
const HEART = SVG('0 0 24 24', 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 ' +
    '12 21z', true);
const NOTE = SVG('0 0 24 24', 'M9 18.5a3 3 0 1 1-2-2.83V5l12-2.5v12a3 3 0 1 1-2-2.83V6.2L9 7.9z', true);
const SHARE = SVG('0 0 24 24', 'M13 4l8 7-8 7v-4.2c-5 0-8.3 1.6-10.5 5.2.8-5.4 3.8-9.6 10.5-10.4z', true);
const TICKS = SVG('0 0 32 18', 'M2 10l5 5L17 3M13 13l2 2L27 3');
const CURSOR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 2.5l14.5 8.6-6.3 1.6-3.3 6.8z" fill="#16191d" ' +
    'stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';

/**
 * The object's pieces, in the card and over its code: what each one needs to be that thing, and what its gesture moves.
 * The card keeps its words and its code as canal.js lays them; the pieces are drawn by canal.css (data-p).
 *
 * @param {HTMLElement} object the card's holder (.hk-canal-objeto)
 * @param {HTMLElement} card .hk-canal-tarjeta
 * @param {HTMLElement|null} qr the code's box (.hk-qr)
 * @param {string} name the object (objectOf)
 */
export function dressObject(object, card, qr, name) {
    // What covers the code until the gesture shows it: in a still screen it is never there (canal.css hides it).
    const over = function (p, inner) {
        if (qr) {
            piece(qr, p, inner);
        }
    };
    if (name === 'polaroid') {
        piece(object, 'cinta');
        over('revela');
    } else if (name === 'movil') {
        piece(card, 'muesca');
        const side = piece(object, 'botones');
        [HEART, NOTE, SHARE].forEach(function (svg, i) {
            const b = el('b');
            b.setAttribute('data-b', String(i));
            b.innerHTML = svg;
            side.appendChild(b);
        });
        piece(object, 'nota1', NOTE);
        piece(object, 'nota2', NOTE);
    } else if (name === 'tele') {
        piece(object, 'antena1');
        piece(object, 'antena2');
        piece(card, 'perilla1');
        piece(card, 'perilla2');
        piece(card, 'rejilla');
        piece(object, 'pata1');
        piece(object, 'pata2');
        piece(card, 'cierre1');
        piece(card, 'cierre2');
        piece(card, 'raya');
        piece(card, 'nieve');
    } else if (name === 'bocadillo') {
        piece(card, 'vistos', TICKS);
        piece(card, 'leidos', TICKS);
        over('escribe', '<b></b><b></b><b></b>');
    } else if (name === 'hoja') {
        piece(card, 'pliegues');
    } else if (name === 'ventana') {
        // The address bar is the sender's line: its three buttons and its loading line go in it.
        const bar = card.querySelector('.hk-canal-nombre');
        if (bar) {
            piece(bar, 'botones-ventana', '<b></b><b></b><b></b>');
            piece(bar, 'carga');
        }
        over('cubre');
        piece(object, 'cursor', CURSOR);
        piece(object, 'clic');
    } else if (name === 'nota') {
        piece(object, 'chincheta');
    } else if (name === 'vineta') {
        piece(object, 'cola');
        piece(object, 'grito1');
        piece(object, 'grito2');
        piece(object, 'grito3');
    } else if (name === 'tarjeta') {
        piece(card, 'franja');
        piece(card, 'dorso');
    } else if (name === 'carrete') {
        piece(card, 'puntadas');
        piece(object, 'bobina', '<b></b>');
    } else if (name === 'nube') {
        piece(object, 'bulto1');
        piece(object, 'bulto2');
        piece(object, 'bulto3');
    }
}

// --- The gestures: the way in of each object, once -------------------------------------------------------------------------

// A transform in the words Web Animations takes (Chromium 56 wants the same functions in every frame to turn between them).
function tr(x, y, r, s) {
    return 'translate3d(' + (x || 0) + 'rem,' + (y || 0) + 'rem,0) rotate(' + (Math.round((r || 0) * 100) / 100) + 'deg) scale(' +
        (s === undefined ? 1 : s) + ')';
}
const REST = tr(0, 0, 0, 1);

/**
 * The gesture of an object: what moves, how and when (seconds from the card's way in). The object itself always ends where it
 * stays, untouched («objeto» last frame at rest), and what covers its code always ends gone. Pure.
 *
 * @param {string} name the object
 * @param {number} k how much it moves (LEVELS)
 * @returns {Array<{p: string, frames: Array<object>, duration: number, delay: number, easing: string}>}
 */
export function gestureOf(name, k) {
    const a = k > 0 ? k : 1;
    const g = function (p, frames, duration, delay, easing) {
        return {p, frames, duration, delay: delay || 0, easing: easing || 'ease-out'};
    };
    const pop = function (from, d) {
        return g('objeto', [
            {offset: 0, opacity: 0, transform: tr(0, 0, 0, from)},
            {offset: 0.55, opacity: 1, transform: tr(0, 0, 0, 1 + 0.06 * a)},
            {offset: 1, opacity: 1, transform: REST},
        ], d || 0.7);
    };
    const fade = function (p, d, delay, hold) {
        return g(p, [{offset: 0, opacity: 1}, {offset: hold || 0.6, opacity: 1}, {offset: 1, opacity: 0}], d, delay, 'linear');
    };
    // A piece that pops into its place (r: its own turn, which canal.css gives it at rest).
    const appear = function (p, d, delay, r) {
        return g(p, [{offset: 0, opacity: 0, transform: tr(0, 0, r, 0)}, {offset: 0.7, opacity: 1, transform: tr(0, 0, r, 1.2)},
            {offset: 1, opacity: 1, transform: tr(0, 0, r, 1)}], d, delay);
    };
    const bounce = function (p, delay) {
        const b = g(p, [{offset: 0, transform: REST}, {offset: 0.3, transform: tr(0, -1.6)}, {offset: 0.6, transform: REST},
            {offset: 1, transform: REST}], 0.8, delay, 'ease-in-out');
        b.iterations = 2;
        return b;
    };
    switch (name) {
        case 'polaroid':
            // It falls hanging from its tape, swings and stops; the photo develops into the code.
            return [g('objeto', [
                {offset: 0, opacity: 0, transform: tr(0, -40 * a, -10 * a)},
                {offset: 0.36, opacity: 1, transform: tr(0, 0, 6 * a)},
                {offset: 0.55, opacity: 1, transform: tr(0, 0, -4 * a)},
                {offset: 0.72, opacity: 1, transform: tr(0, 0, 2.4 * a)},
                {offset: 0.87, opacity: 1, transform: tr(0, 0, -1 * a)},
                {offset: 1, opacity: 1, transform: REST},
            ], 1.9), fade('revela', 1.7, 0.5, 0.25)];
        case 'movil':
            // It jumps up to the beat, dances twice and stands; its buttons pop one after the other.
            return [g('objeto', [
                {offset: 0, opacity: 0, transform: tr(0, 6, 10 * a, 0.6)},
                {offset: 0.38, opacity: 1, transform: tr(0, -1.4 * a, -4 * a, 1.04)},
                {offset: 0.56, opacity: 1, transform: tr(0, 0, 4 * a, 1)},
                {offset: 0.74, opacity: 1, transform: tr(0, -0.6 * a, -2.5 * a, 1.02)},
                {offset: 0.88, opacity: 1, transform: tr(0, 0, 1 * a, 1)},
                {offset: 1, opacity: 1, transform: REST},
            ], 1.6), appear('botones.0', 0.5, 1), appear('botones.1', 0.5, 1.15), appear('botones.2', 0.5, 1.3)];
        case 'tele':
            // It comes up, its knob turns, and it switches on: the line of light, the shutters open, a breath of snow.
            return [g('objeto', [
                {offset: 0, opacity: 0, transform: tr(0, 5, 0, 0.9)},
                {offset: 0.6, opacity: 1, transform: tr(0, -1.2 * a, 0, 1)},
                {offset: 1, opacity: 1, transform: REST},
            ], 0.8),
            g('perilla1', [{offset: 0, transform: tr(0, 0, -150 * a)}, {offset: 1, transform: REST}], 0.6, 0.5),
            g('raya', [{offset: 0, opacity: 0, transform: 'scale(0,1)'}, {offset: 0.45, opacity: 1, transform: 'scale(1,1)'},
                {offset: 1, opacity: 0, transform: 'scale(1,1)'}], 0.7, 0.75, 'linear'),
            g('cierre1', [{offset: 0, transform: 'scale(1,1)'}, {offset: 0.3, transform: 'scale(1,1)'}, {offset: 1, transform: 'scale(1,0)'}], 0.8, 0.75),
            g('cierre2', [{offset: 0, transform: 'scale(1,1)'}, {offset: 0.3, transform: 'scale(1,1)'}, {offset: 1, transform: 'scale(1,0)'}], 0.8, 0.75),
            g('nieve', [{offset: 0, opacity: 0, transform: tr(0, 0)}, {offset: 0.2, opacity: 0.75, transform: tr(0, -1)},
                {offset: 0.5, opacity: 0.6, transform: tr(0, -2.4)}, {offset: 0.8, opacity: 0.4, transform: tr(0, -0.8)},
                {offset: 1, opacity: 0, transform: tr(0, -2)}], 0.6, 1.4, 'linear')];
        case 'bocadillo':
            // The bubble pops from its tail; «writing…» a moment; the code arrives, and its ticks turn the accent when read.
            return [pop(0.2), fade('escribe', 1.7, 0.35, 0.75), bounce('escribe.0', 0.35), bounce('escribe.1', 0.5), bounce('escribe.2', 0.65),
                g('leidos', [{offset: 0, opacity: 0}, {offset: 1, opacity: 1}], 0.4, 2.4, 'linear')];
        case 'mensaje':
            return [pop(0.3)];
        case 'hoja':
            // The folded sheet opens out: from a strip to the whole sheet, a little crooked, then straight.
            return [g('objeto', [
                {offset: 0, opacity: 0, transform: tr(0, 0, -8 * a) + ' scale(.08,.5)'},
                {offset: 0.4, opacity: 1, transform: tr(0, 0, -4 * a) + ' scale(.55,.5)'},
                {offset: 0.78, opacity: 1, transform: tr(0, 0, 1 * a) + ' scale(1.02,1)'},
                {offset: 1, opacity: 1, transform: REST + ' scale(1,1)'},
            ], 1.1)];
        case 'ventana':
            // The window opens, the pointer comes and clicks, the address loads, and the page is the code.
            return [pop(0.3, 0.7),
                g('cursor', [{offset: 0, opacity: 0, transform: tr(26, 22, 0, 1)}, {offset: 0.2, opacity: 1, transform: tr(19, 16, 0, 1)},
                    {offset: 0.7, opacity: 1, transform: REST}, {offset: 0.78, opacity: 1, transform: tr(0, 0, 0, 0.82)},
                    {offset: 0.86, opacity: 1, transform: REST}, {offset: 1, opacity: 0, transform: REST}], 1.6, 0.4),
                g('clic', [{offset: 0, opacity: 0.9, transform: tr(0, 0, 0, 0.2)}, {offset: 1, opacity: 0, transform: tr(0, 0, 0, 1.6)}], 0.5, 1.6),
                g('carga', [{offset: 0, opacity: 1, transform: 'scale(0,1)'}, {offset: 0.8, opacity: 1, transform: 'scale(1,1)'},
                    {offset: 1, opacity: 0, transform: 'scale(1,1)'}], 1, 1.65, 'ease-in-out'),
                fade('cubre', 1.3, 1.6, 0.6)];
        case 'nota':
            // The note flies to the board, the pin goes in, and the note gives a little jump.
            return [g('objeto', [
                {offset: 0, opacity: 0, transform: tr(24 * a, -24 * a, 14 * a)},
                {offset: 0.55, opacity: 1, transform: tr(0, 0, -2 * a)},
                {offset: 0.8, opacity: 1, transform: tr(0, 0, 1 * a)},
                {offset: 1, opacity: 1, transform: REST},
            ], 1.2), g('chincheta', [{offset: 0, opacity: 0, transform: tr(0, -9 * a, 0, 1.6)}, {offset: 0.3, opacity: 1, transform: tr(0, -6 * a, 0, 1.4)},
                {offset: 0.8, opacity: 1, transform: tr(0, 0.5, 0, 0.92)}, {offset: 1, opacity: 1, transform: REST}], 0.5, 0.95)];
        case 'vineta':
            // The balloon inflates with a bounce, and its three strokes shout.
            return [g('objeto', [
                {offset: 0, opacity: 0, transform: tr(0, 0, 0, 0.15)},
                {offset: 0.45, opacity: 1, transform: tr(0, 0, 0, 1 + 0.14 * a)},
                {offset: 0.65, opacity: 1, transform: tr(0, 0, 0, 1 - 0.05 * a)},
                {offset: 0.82, opacity: 1, transform: tr(0, 0, 0, 1 + 0.02 * a)},
                {offset: 1, opacity: 1, transform: REST},
            ], 1), appear('grito1', 0.4, 0.7, -40), appear('grito2', 0.4, 0.8, 0), appear('grito3', 0.4, 0.9, 40)];
        case 'tarjeta':
            // The business card turns over: its back in the centre's colour, then its face with the code.
            return [g('objeto', [
                {offset: 0, opacity: 0, transform: 'perspective(160rem) rotateY(-180deg)'},
                {offset: 0.1, opacity: 1, transform: 'perspective(160rem) rotateY(-162deg)'},
                {offset: 0.5, opacity: 1, transform: 'perspective(160rem) rotateY(-90deg)'},
                {offset: 0.8, opacity: 1, transform: 'perspective(160rem) rotateY(' + (8 * a) + 'deg)'},
                {offset: 1, opacity: 1, transform: 'perspective(160rem) rotateY(0deg)'},
            ], 1.2, 0, 'ease-in-out'), g('dorso', [{offset: 0, opacity: 1}, {offset: 0.5, opacity: 1}, {offset: 0.501, opacity: 0},
                {offset: 1, opacity: 0}], 1.2, 0, 'ease-in-out')];
        case 'carrete':
            // The cloth unrolls from the spool, which spins, and the stitches show along its edge.
            return [g('objeto', [
                {offset: 0, opacity: 0, transform: tr(0, 0, 0, 1) + ' scale(1,.04)'},
                {offset: 0.1, opacity: 1, transform: tr(0, 0, 0, 1) + ' scale(1,.1)'},
                {offset: 0.8, opacity: 1, transform: tr(0, 0, 0, 1) + ' scale(1,1.03)'},
                {offset: 1, opacity: 1, transform: REST + ' scale(1,1)'},
            ], 1.1), g('bobina', [{offset: 0, transform: tr(0, 0, 0)}, {offset: 1, transform: tr(0, 0, 900 * a)}], 1.1, 0),
            g('puntadas', [{offset: 0, opacity: 0}, {offset: 1, opacity: 1}], 0.5, 1, 'linear')];
        case 'nube':
            // The cloud drifts in, sways, and puffs up its tops.
            return [g('objeto', [
                {offset: 0, opacity: 0, transform: tr(-28 * a, 2)},
                {offset: 0.3, opacity: 1, transform: tr(-16 * a, 0.6)},
                {offset: 0.75, opacity: 1, transform: tr(1.5 * a, -0.8)},
                {offset: 1, opacity: 1, transform: REST},
            ], 1.4), appear('bulto1', 0.5, 0.95), appear('bulto2', 0.5, 1.05), appear('bulto3', 0.5, 1.15)];
        default:
            return [pop(0.3)];
    }
}

/**
 * What keeps moving on an object once it has come in: only pieces that are not the code nor over it. Pure.
 *
 * @param {string} name the object
 * @param {number} k how much it moves
 * @returns {Array<{p: string, frames: Array<object>, duration: number, delay: number, easing: string, direction: string}>}
 */
export function lifeOf(name, k) {
    const a = k > 0 ? k : 1;
    const loop = function (p, frames, duration, delay, direction) {
        return {p, frames, duration, delay: delay || 0, easing: 'ease-in-out', direction: direction || 'normal'};
    };
    if (name === 'movil') {
        const beat = function (p, delay) {
            return loop(p, [{offset: 0, transform: REST}, {offset: 0.3, transform: tr(0, 0, 0, 1 + 0.12 * a)}, {offset: 1, transform: REST}],
                1.04, delay);
        };
        const fly = function (p, delay, x) {
            return loop(p, [{offset: 0, opacity: 0, transform: tr(0, 2, -10)}, {offset: 0.2, opacity: 1, transform: tr(x * 0.2, -2, -4)},
                {offset: 1, opacity: 0, transform: tr(x, -16, 16)}], 3.2, delay);
        };
        // Only the heart beats (the three did too much for a screen without a graphics card), and two notes fly off.
        return [beat('botones.0', 2), fly('nota1', 2, -10), fly('nota2', 3.6, -16)];
    }
    if (name === 'tele') {
        // The antennae lean as canal.css sets them (−28° and 28°), and sway a little around it.
        return [loop('antena1', [{offset: 0, transform: tr(0, 0, -28 - 2 * a)}, {offset: 1, transform: tr(0, 0, -28 + 2 * a)}], 2.4, 1, 'alternate'),
            loop('antena2', [{offset: 0, transform: tr(0, 0, 28 + 2 * a)}, {offset: 1, transform: tr(0, 0, 28 - 2 * a)}], 2.1, 1.3, 'alternate')];
    }
    return [];
}

// --- The worlds ------------------------------------------------------------------------------------------------------------

// A repeatable chance, so that a world is the same each time it is drawn.
function chance(seed) {
    let s = seed;
    return function () {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}

/**
 * A network's world: its pieces, where they are (in rem, on a canvas a little bigger than the block, which clips them), and
 * what each one does while the slide stands. A few move; most stay, so that a slow screen keeps its pace. Pure.
 *
 * @param {string} world WORLDS
 * @param {number} w the block's width, in rem
 * @param {number} h its height, in rem
 * @returns {Array<{cls: string, x: number, y: number, w: number, h: number, r: number, life: object|null}>}
 */
export function worldOf(world, w, h) {
    const out = [];
    const rnd = chance(world.length * 977 + 13);
    const add = function (cls, x, y, pw, ph, life, r) {
        out.push({cls, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, w: pw, h: ph, r: r || 0, life: life || null});
    };
    const life = function (frames, duration, delay, direction, easing) {
        return {frames, duration, delay: delay || 0, direction: direction || 'normal', easing: easing || 'linear'};
    };
    if (world === 'fotos') {
        // A wall of photos; now and then one turns over and shows another.
        const side = 17;
        const step = side + 2;
        let n = 0;
        for (let y = 1; y < h; y += step) {
            for (let x = 1; x < w; x += step) {
                const turns = (n * 7) % 5 === 0;
                add('hk-mt' + (n % 5), x, y, side, side, turns ? life([{offset: 0, transform: 'scale(1,1)'}, {offset: 0.7, transform: 'scale(1,1)'},
                    {offset: 0.76, transform: 'scale(0,1)'}, {offset: 0.82, transform: 'scale(1,1)'}, {offset: 1, transform: 'scale(1,1)'}],
                9, -((n * 1.37) % 9), 'normal', 'ease-in-out') : null);
                n++;
            }
        }
    } else if (world === 'reels') {
        // A feed of reels: columns that stay, and now and then one reel slides up and away, as a thumb does; the beat at the
        // foot. (Columns that all ran were too much for a screen without a graphics card: 48 frames a second in Chrome 56.)
        const cw = 15;
        const tall = 27;
        for (let i = 0, x = 2; x < w; i++, x += cw + 3) {
            for (let j = 0, y = -((i * 11) % tall); y < h; j++, y += tall + 3) {
                const swipes = (i * 3 + j * 5) % 11 === 0;
                const o = WORLD_OPACITY;
                add('hk-mreel hk-mt' + ((i + j) % 5), x, y, cw, tall, swipes ? life([{offset: 0, opacity: o, transform: tr(0, 0)},
                    {offset: 0.8, opacity: o, transform: tr(0, 0)}, {offset: 0.92, opacity: 0, transform: tr(0, -tall * 0.6)},
                    {offset: 0.93, opacity: 0, transform: tr(0, tall * 0.4)}, {offset: 1, opacity: o, transform: tr(0, 0)}], 7, -((i + j) * 1.3) % 7,
                'normal', 'ease-in-out') : null);
            }
        }
        for (let i = 0, x = Math.round(w * 0.5); x < w; i++, x += 9) {
            add('hk-mbarra hk-mt' + (i % 3 === 0 ? 2 : i % 3 === 1 ? 4 : 1), x, h - 16, 3, 16,
                life([{offset: 0, transform: 'scale(1,.18)'}, {offset: 1, transform: 'scale(1,1)'}], 1.1 + (i % 4) * 0.2, -((i * 0.37) % 1), 'alternate',
                    'ease-in-out'));
        }
    } else if (world === 'cine') {
        // A film that rolls across, a little slanted; its frames in the skin's colours, four a loop.
        const strip = {cls: 'hk-mpelicula', x: -20, y: h * 0.3, w: w + 140, h: 26, r: -7, frames: [], life: null};
        for (let i = 0; i < Math.ceil((w + 140) / 31); i++) {
            strip.frames.push('hk-mt' + (i % 4));
        }
        strip.life = life([{offset: 0, transform: tr(0, 0)}, {offset: 1, transform: tr(-124, 0)}], 30);
        out.push(strip);
    } else if (world === 'charla') {
        // The chat's wallpaper, and a conversation going up slowly: messages that arrive on the left and leave on the right,
        // the whole of it twice, so that it comes round without a seam.
        add('hk-mpapel', 0, 0, w, h, null);
        const talk = {cls: 'hk-mcharla', x: 0, y: 0, w, h: 0, r: 0, talk: [], life: null};
        let y = 4;
        // Wide, the conversation goes between the words and the object, where the block is free above the words; tall, across.
        const from = w > h ? w * 0.36 : 6;
        const to = w > h ? w * 0.66 : w - 6;
        for (let i = 0; i < 12; i++) {
            const mine = i % 3 === 1;
            const mw = 22 + ((i * 7) % 4) * 6;
            talk.talk.push([mine ? to - mw : from + (i % 2) * 3, y, mw, mine ? 'hk-mt1 hk-mmio' : 'hk-mt' + [0, 3, 4, 2][i % 4]]);
            y += 11 + (i % 2) * 2;
        }
        talk.span = Math.max(y, h + 10);
        talk.life = life([{offset: 0, transform: tr(0, 0)}, {offset: 1, transform: tr(0, -talk.span)}], talk.span * 0.9);
        out.push(talk);
    } else if (world === 'cielo' || world === 'manana') {
        // Clouds that drift slowly; in the morning, the sun rises behind them.
        if (world === 'manana') {
            add('hk-msol', w * 0.62, h * 0.08, 26, 26, life([{offset: 0, transform: tr(0, 30)}, {offset: 1, transform: tr(0, 0)}], 5, 0, 'normal',
                'ease-out'));
        }
        for (let i = 0; i < 5; i++) {
            const cw = 22 + rnd() * 16;
            add('hk-mnube', rnd() * w, 4 + rnd() * (h - 20), cw, cw * 0.34, life([{offset: 0, transform: tr(0, 0)}, {offset: 1, transform: tr(-60, 0)}],
                40 + i * 9, -i * 7));
        }
    } else if (world === 'red') {
        // A net of pages: its links drawn, its knots breathing.
        const knots = [];
        for (let i = 0; i < 12; i++) {
            knots.push([4 + rnd() * (w - 8), 4 + rnd() * (h - 8)]);
        }
        for (let i = 0; i < knots.length; i++) {
            const a = knots[i];
            const b = knots[(i * 5 + 3) % knots.length];
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            add('hk-menlace', a[0], a[1], Math.sqrt(dx * dx + dy * dy), 0.5, null, Math.atan2(dy, dx) * 180 / Math.PI);
        }
        knots.forEach(function (p, i) {
            add('hk-mnodo hk-mt' + (i % 5), p[0] - 2.6, p[1] - 2.6, 5.2, 5.2, i % 2 ? null : life([{offset: 0, transform: REST},
                {offset: 0.5, transform: tr(0, 0, 0, 1.22)}, {offset: 1, transform: REST}], 3.2, -i * 0.5, 'normal', 'ease-in-out'));
        });
    } else if (world === 'tablon') {
        // A board of notes, each pinned a little crooked; one sways now and then.
        for (let i = 0; i < 14; i++) {
            const nw = 14 + rnd() * 8;
            add('hk-mnota hk-mt' + (i % 5), rnd() * (w - nw), rnd() * (h - nw), nw, nw * 0.8, i % 3 ? null : life([{offset: 0, transform: tr(0, 0, -2)},
                {offset: 1, transform: tr(0, 0, 2)}], 2.6, -i * 0.4, 'alternate', 'ease-in-out'), -8 + rnd() * 16);
        }
    } else if (world === 'teletipo') {
        // Rows of short sentences (bars, never words) that run past, each at its pace.
        for (let y = 3, i = 0; y < h; y += 11, i++) {
            const row = {cls: 'hk-mfila', x: 0, y, w: 2 * w + 40, h: 4, r: 0, bars: [], life: null};
            for (let j = 0, x = 0; x < w + 20; j++) {
                const bw = 6 + ((i * 3 + j * 7) % 5) * 4;
                row.bars.push([x, bw, 'hk-mt' + ((i + j) % 5)]);
                x += bw + 3;
            }
            const span = row.bars[row.bars.length - 1][0] + row.bars[row.bars.length - 1][1] + 3;
            row.span = span;
            row.life = life([{offset: 0, transform: tr(0, 0)}, {offset: 1, transform: tr(-span, 0)}], 26 + (i % 3) * 8, -i * 3);
            out.push(row);
        }
    } else if (world === 'organigrama') {
        // A chart of people: one, three, six, joined by their lines; three of them breathe.
        const rows = [[0.5], [0.2, 0.5, 0.8], [0.1, 0.26, 0.42, 0.58, 0.74, 0.9]];
        const bw = 16;
        const bh = 8;
        rows.forEach(function (row, r) {
            const y = h * (0.12 + r * 0.32);
            row.forEach(function (fx, i) {
                const x = w * fx - bw / 2;
                if (r > 0) {
                    const up = rows[r - 1][Math.min(rows[r - 1].length - 1, Math.floor(i * rows[r - 1].length / row.length))];
                    const ux = w * up;
                    const uy = h * (0.12 + (r - 1) * 0.32) + bh;
                    const dx = x + bw / 2 - ux;
                    const dy = y - uy;
                    add('hk-menlace', ux, uy, Math.sqrt(dx * dx + dy * dy), 0.5, null, Math.atan2(dy, dx) * 180 / Math.PI);
                }
                add('hk-mcaja hk-mt' + ((r + i) % 5), x, y, bw, bh, (r + i) % 4 ? null : life([{offset: 0, transform: REST},
                    {offset: 0.5, transform: tr(0, 0, 0, 1.08)}, {offset: 1, transform: REST}], 3.6, -i, 'normal', 'ease-in-out'));
            });
        });
    } else if (world === 'costura') {
        // Rows of stitches that run along, each at its pace.
        for (let y = 4, i = 0; y < h; y += 9, i++) {
            add('hk-mpuntada hk-mt' + (i % 5), -8, y, w + 16, 0.8, life([{offset: 0, transform: tr(0, 0)}, {offset: 1, transform: tr(-4, 0)}],
                0.9 + (i % 3) * 0.4, -i * 0.2, i % 2 ? 'reverse' : 'normal'));
        }
    }
    return out;
}

/**
 * Draws a world in its box (canal.css's .hk-canal-mundo): a plain box per piece, placed in rem; the pieces that move keep
 * what they do (node.hkLife), for canal.js to start them.
 *
 * @param {HTMLElement} box
 * @param {string} world
 * @param {number} w in rem
 * @param {number} h in rem
 */
export function drawWorld(box, world, w, h) {
    while (box.firstChild) {
        box.removeChild(box.firstChild);
    }
    box.setAttribute('data-mundo', world);
    worldOf(world, w, h).forEach(function (p) {
        const n = el('i', p.cls);
        n.style.left = p.x + 'rem';
        n.style.top = p.y + 'rem';
        n.style.width = p.w + 'rem';
        n.style.height = p.h + 'rem';
        if (p.r) {
            n.style.webkitTransform = 'rotate(' + p.r + 'deg)';
            n.style.transform = 'rotate(' + p.r + 'deg)';
        }
        (p.tiles || p.frames || []).forEach(function (cls) {
            n.appendChild(el('b', cls));
        });
        if (p.talk) {
            [0, p.span].forEach(function (shift) {
                p.talk.forEach(function (m) {
                    const msg = el('b', m[3]);
                    msg.style.left = m[0] + 'rem';
                    msg.style.top = (m[1] + shift) + 'rem';
                    msg.style.width = m[2] + 'rem';
                    n.appendChild(msg);
                });
            });
        }
        if (p.bars) {
            // The row twice, so that it comes round without a seam.
            [0, p.span].forEach(function (shift) {
                p.bars.forEach(function (b) {
                    const bar = el('b', b[2]);
                    bar.style.left = (b[0] + shift) + 'rem';
                    bar.style.width = b[1] + 'rem';
                    n.appendChild(bar);
                });
            });
        }
        if (p.life) {
            // A piece set crooked keeps its turn while it moves.
            n.hkLife = p.r ? Object.assign({}, p.life, {frames: p.life.frames.map(function (f) {
                const o = Object.assign({}, f);
                if (o.transform) {
                    o.transform = 'rotate(' + p.r + 'deg) ' + o.transform;
                }
                return o;
            })}) : p.life;
        }
        box.appendChild(n);
    });
}
