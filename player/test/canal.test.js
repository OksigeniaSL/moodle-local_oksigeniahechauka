// «Síguenos en el canal» without a page: what the slide says from the item, when it comes, the plane's way and its trail, that
// its parts are in within two seconds, and that what goes to the player stays with what Chromium 56 understands.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindShort, channelShow, channelWords, flightPath, membersWords, qrAddress, trailOf, FLIGHT} from '../src/canal.js';
import {ENTRANCE_AT, gestureOf, LEVELS, lifeOf, objectOf, OBJECTS, WORLD_OPACITY, WORLDS, worldOf} from '../src/canal-redes.js';
import {NETWORKS} from '../src/redes.js';

const ITEM = {id: 'channel', type: 'channel', zone: 'extra', network: 'telegram', title: 'Síguenos en Telegram',
    text: 'Avisos, fotos y novedades en tu móvil', name: 'Centro de ejemplo · Avisos', members: 312,
    web: 'https://enlace.example/canal'};
const WORDS = {channel_members: '{n} personas ya lo siguen', channel_members_one: '{n} persona ya lo sigue'};

test('a short word goes with the next one: no line ends in «y», «en» or «tu»', () => {
    assert.equal(bindShort('Síguenos en Telegram'), 'Síguenos en\u00a0Telegram');
    assert.equal(bindShort('Avisos, fotos y novedades en tu móvil'), 'Avisos, fotos y\u00a0novedades en\u00a0tu\u00a0móvil');
    assert.equal(bindShort('Follow us on Telegram'), 'Follow us\u00a0on\u00a0Telegram');
    assert.equal(bindShort(''), '');
});

test('the words come from the item, in the centre\'s language; the network is never more than a word', () => {
    const w = channelWords(ITEM, WORDS);
    assert.equal(w.title, 'Síguenos en\u00a0Telegram');
    assert.equal(w.line, 'Avisos, fotos y\u00a0novedades en\u00a0tu\u00a0móvil');
    assert.equal(w.name, 'Centro de ejemplo · Avisos');
    assert.equal(w.members, '312 personas ya\u00a0lo\u00a0siguen');
    assert.equal(channelWords({title: 'Follow us', web: ITEM.web}, {}).line, '');
});

test('the code of a network without its short address goes without the screens\' tag; the web and a short one keep theirs', () => {
    const tagged = 'https://www.instagram.com/centro.ejemplo/?utm_source=pantallas';
    assert.equal(qrAddress({network: 'instagram', web: tagged}), 'https://www.instagram.com/centro.ejemplo/');
    assert.equal(qrAddress({network: 'x', web: 'https://x.com/centro?lang=es&utm_source=pantallas'}), 'https://x.com/centro?lang=es');
    assert.equal(qrAddress({network: 'x', web: 'https://x.com/centro?utm_source=pantallas&lang=es'}), 'https://x.com/centro?lang=es');
    assert.equal(qrAddress({network: 'telegram', web: 'https://t.me/centro?utm_source=pantallas#top'}), 'https://t.me/centro#top');
    assert.equal(qrAddress({network: 'web', web: 'https://centro.example/?utm_source=pantallas'}),
        'https://centro.example/?utm_source=pantallas');
    assert.equal(qrAddress({network: 'instagram', web: 'https://enlace.example/Ab3', webqr: 'data:image/png;base64,AA'}),
        'https://enlace.example/Ab3');
});

test('how many follow it: with its singular, and nothing when it is not said', () => {
    assert.equal(membersWords(1, WORDS), '1 persona ya lo sigue');
    assert.equal(membersWords(312, WORDS), '312 personas ya lo siguen');
    assert.equal(membersWords(null, WORDS), '');
    assert.equal(membersWords(undefined, WORDS), '');
    assert.equal(membersWords(0, WORDS), '');
    assert.equal(membersWords('312', WORDS), '', 'a number, as the manifest sends it');
    assert.equal(membersWords(312, {}), '', 'without the screen\'s words, nothing');
});

test('the slide comes only with its headline and an address for its QR', () => {
    assert.equal(channelShow(ITEM), true);
    assert.equal(channelShow(Object.assign({}, ITEM, {web: ''})), false);
    assert.equal(channelShow(Object.assign({}, ITEM, {web: 'nur.click/XXXX'})), false);
    assert.equal(channelShow(Object.assign({}, ITEM, {title: ' '})), false);
    assert.equal(channelShow(null), false);
});

const WIDE = {w: 1274, h: 402, pw: 130, ph: 81, exit: 'top'};
const TALL = {w: 1000, h: 185, pw: 130, ph: 81, exit: 'right'};

test('the plane comes in by the left edge and leaves its sky by the top (wide) or by the right (tall)', () => {
    for (const sky of [WIDE, TALL]) {
        const p = flightPath(sky, 48);
        assert.equal(p.length, 48);
        assert.ok(p[0].x + sky.pw / 2 <= 0, sky.exit + ': it starts out of sight, on the left');
        const last = p[p.length - 1];
        if (sky.exit === 'top') {
            assert.ok(last.y + sky.ph / 2 <= 0, 'it leaves by the top');
            assert.ok(last.x + sky.pw / 2 < sky.w, 'never by the right, where the card is');
        } else {
            assert.ok(last.x - sky.pw / 2 >= sky.w, 'it leaves by the right');
        }
        // While in sight, never by the long edge it does not leave by: the whole plane in its sky.
        for (const q of p) {
            assert.ok(q.y + sky.ph / 2 <= sky.h + 1, 'never under its sky');
            if (sky.exit === 'right') {
                assert.ok(q.y - sky.ph / 2 >= -1, 'never over its sky');
            }
        }
    }
});

test('the plane flies at one speed, with its nose along its way', () => {
    const p = flightPath(TALL, 48);
    const steps = [];
    for (let i = 1; i < p.length; i++) {
        steps.push(Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y));
        assert.ok(p[i].s > p[i - 1].s);
        assert.ok(Math.abs(p[i].a) < 45, 'it glides, it does not dive');
    }
    const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
    for (const d of steps) {
        assert.ok(Math.abs(d - mean) < mean * 0.05, 'equal lengths');
    }
    assert.equal(p[0].s, 0);
    assert.equal(p[p.length - 1].s, 1);
});

test('its trail: dots inside the sky, in the order the plane leaves them', () => {
    for (const sky of [WIDE, TALL]) {
        const dots = trailOf(flightPath(sky, 48), sky);
        assert.ok(dots.length > 8, sky.exit + ': ' + dots.length + ' dots');
        for (let i = 0; i < dots.length; i++) {
            assert.ok(dots[i].x > 0 && dots[i].x < sky.w && dots[i].y > 0 && dots[i].y < sky.h);
            if (i) {
                assert.ok(dots[i].s > dots[i - 1].s);
            }
        }
    }
});

test('the plane waits for the entrance, crosses slowly and comes back less often than a slide lasts', () => {
    assert.ok(FLIGHT.wait >= 2, 'after the entrance (under 2 s)');
    assert.ok(FLIGHT.cross >= 8, 'slowly');
    assert.ok(FLIGHT.every > 15, 'once in a slide of 15 s');
    assert.ok(FLIGHT.wait + FLIGHT.cross <= 15, 'and it has crossed before the slide goes');
});

// movimiento.js imports partyOf from cumple.js, which needs a page: its pure part is read on its own, as movimiento.test.js does.
const mv = readFileSync(new URL('../src/movimiento.js', import.meta.url), 'utf8');
const pure = mv.slice(mv.indexOf('export const TIMING'), mv.indexOf('/** The level of movement'))
    + mv.slice(mv.indexOf('/**\n * When each part comes in'), mv.indexOf('/** The parts of a composition'));
const {TIMING, timeline, CANAL} = await import('data:text/javascript,' + encodeURIComponent(
    pure.replace(/^const PARTS = \{/m, 'export const PARTS = {') + '\nexport const CANAL = PARTS.canal;'));

test('the channel\'s parts are in within two seconds at every level, the card last', () => {
    assert.ok(CANAL && CANAL.length, 'movimiento.js has the channel\'s parts');
    for (const level of Object.keys(TIMING)) {
        const t = timeline(CANAL, CANAL.map(() => 1), level, false);
        const card = t.filter((x) => CANAL[x.rule][0] === '.hk-canal-tarjeta')[0];
        assert.ok(card, 'the card has its way in');
        assert.equal(card.at, Math.max.apply(null, t.map((x) => x.at)), 'the card comes last');
        // It fades in (under 0.7 s) while its object does its gesture.
        assert.ok(card.at + 0.7 < 2, level + ': the card settles at ' + (card.at + 0.7));
        assert.equal(ENTRANCE_AT[level], card.at, level + ': the object\'s gesture starts as its card comes in');
    }
});

// --- Each network its object and its world (22 November 2026) ---------------------------------------------------------

test('every network has its own object, and every object its world; one not known is the message that arrives', () => {
    const seen = {};
    for (const n of NETWORKS) {
        const o = objectOf(n);
        assert.ok(o, n);
        assert.ok(WORLDS[o], o + ' has a world');
        if (n !== 'other') {
            assert.equal(seen[o], undefined, n + ' and ' + seen[o] + ' share ' + o);
            seen[o] = n;
        }
    }
    assert.equal(objectOf('myspace'), 'mensaje');
    assert.equal(objectOf('telegram'), 'hoja', 'the paper plane stays with Telegram');
});

const MOVES = ['offset', 'transform', 'opacity'];
const covers = ['revela', 'escribe', 'cubre', 'dorso', 'raya', 'nieve', 'cursor', 'clic', 'carga'];
const rest = (t) => !t || /^(translate3d\(0rem,0rem,0\) rotate\(0deg\) scale\(1\)( scale\(1,1\))?|perspective\(160rem\) rotateY\(0deg\))$/.test(t);

test('a gesture moves only transform and opacity; its object ends at rest, and nothing is left over its code', () => {
    for (const name of new Set(Object.values(OBJECTS))) {
        for (const level of Object.keys(LEVELS)) {
            const list = gestureOf(name, LEVELS[level].k);
            const own = list.filter((g) => g.p === 'objeto');
            assert.equal(own.length, 1, name + ' moves its object once');
            const last = own[0].frames[own[0].frames.length - 1];
            assert.ok(rest(last.transform) && last.opacity === 1, name + ' ends at rest: ' + last.transform);
            for (const g of list) {
                assert.equal(g.frames[0].offset, 0, name + ' ' + g.p);
                assert.equal(g.frames[g.frames.length - 1].offset, 1, name + ' ' + g.p);
                for (const f of g.frames) {
                    for (const k of Object.keys(f)) {
                        assert.ok(MOVES.indexOf(k) !== -1, name + ' ' + g.p + ' moves ' + k);
                    }
                }
                const end = g.frames[g.frames.length - 1];
                if (covers.indexOf(g.p) !== -1) {
                    assert.equal(end.opacity, 0, name + ': ' + g.p + ' is gone at the end');
                }
                if (/^cierre/.test(g.p)) {
                    assert.equal(end.transform, 'scale(1,0)', name + ': the screen is open at the end');
                }
                // Shown within the first seconds of the slide: the code is read from then on.
                assert.ok(ENTRANCE_AT[level] + (g.delay + g.duration * (g.iterations || 1)) * LEVELS[level].pace < 4.5,
                    name + ' ' + g.p + ' at ' + level + ' is over late');
            }
        }
    }
});

test('what keeps moving is never the object, nor anything over its code', () => {
    for (const name of new Set(Object.values(OBJECTS))) {
        for (const l of lifeOf(name, 1)) {
            assert.notEqual(l.p, 'objeto', name);
            assert.equal(covers.indexOf(l.p), -1, name + ' ' + l.p);
            for (const f of l.frames) {
                for (const k of Object.keys(f)) {
                    assert.ok(MOVES.indexOf(k) !== -1, name + ' ' + l.p + ' moves ' + k);
                }
            }
        }
    }
});

test('a world moves only transform and opacity, a few of its pieces, and stays the same each time it is drawn', () => {
    for (const world of new Set(Object.values(WORLDS))) {
        for (const [w, h] of [[180, 95], [100, 170]]) {
            const pieces = worldOf(world, w, h);
            assert.ok(pieces.length > 0, world);
            const moving = pieces.filter((p) => p.life);
            assert.ok(moving.length <= 26, world + ' moves ' + moving.length + ' pieces at ' + w + '×' + h);
            for (const p of moving) {
                assert.equal(p.life.frames[0].offset, 0);
                for (const f of p.life.frames) {
                    for (const k of Object.keys(f)) {
                        assert.ok(MOVES.indexOf(k) !== -1, world + ' moves ' + k);
                    }
                    // Soft behind its object: what fades never comes out stronger than the world is.
                    assert.ok(f.opacity === undefined || f.opacity <= WORLD_OPACITY, world + ' shows a piece at ' + f.opacity);
                }
            }
            assert.deepEqual(worldOf(world, w, h), pieces, world + ' is drawn the same');
        }
    }
});

const NEWER = [
    [/\.padStart\(|\.padEnd\(/, 'padStart/padEnd (Chrome 57)'],
    [/\.finally\(/, 'Promise.prototype.finally (Chrome 63)'],
    [/\.flat\(|\.flatMap\(/, 'Array.prototype.flat (Chrome 69)'],
    [/Object\.fromEntries/, 'Object.fromEntries (Chrome 73)'],
    [/\.replaceAll\(|\.matchAll\(/, 'replaceAll/matchAll (Chrome 73, 85)'],
    [/AbortController/, 'AbortController (Chrome 66)'],
    [/structuredClone|queueMicrotask/, 'structuredClone, queueMicrotask (Chrome 98, 71)'],
    [/\.decode\(\)/, 'HTMLImageElement.decode (Chrome 64)'],
    [/\.at\(-?\d/, 'Array.prototype.at (Chrome 92)'],
    [/globalThis/, 'globalThis (Chrome 71)'],
    [/IntersectionObserver|ResizeObserver/, 'ResizeObserver (Chrome 64)'],
    [/^\s*import\(|[^.\w]import\(/m, 'dynamic import (Chrome 63)'],
    [/getAnimations|\.finished\b|\.composite\b/, 'getAnimations, Animation.finished, composite (Chrome 84)'],
];

test('no browser API newer than Chromium 56 in canal.js and canal-redes.js', () => {
    for (const file of ['canal.js', 'canal-redes.js']) {
        const code = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, '');
        for (const [re, what] of NEWER) {
            assert.equal(re.test(code), false, file + ' uses ' + what);
        }
    }
});

test('canal.css stays with what Chromium 56 understands and moves nothing; its gesture moves only transform and opacity', () => {
    const sheet = readFileSync(new URL('../canal.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const motion = readFileSync(new URL('../movimiento.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const gesture = motion.slice(motion.indexOf('[data-mv-como="mensaje"]') - 40);
    for (const [name, css] of [['canal.css', sheet], ['the gesture «mensaje»', gesture]]) {
        for (const [re, what] of [
            [/display:\s*grid/, 'CSS Grid (Chrome 57)'],
            [/\bgap:/, 'gap in flex (Chrome 84)'],
            [/clamp\(|min\(|max\(/, 'clamp/min/max (Chrome 79)'],
            [/aspect-ratio|inset:|:is\(|:where\(|:has\(|color-mix/, 'newer CSS'],
            [/@container|cq[whib]/, 'container queries (Chrome 105)'],
            [/prefers-color-scheme/, 'prefers-color-scheme (Chrome 76)'],
            [/space-evenly/, 'space-evenly (Chrome 60)'],
            [/#[0-9a-f]{8}\b|#[0-9a-f]{4}\b/i, 'colours with alpha in hex (Chrome 62)'],
            [/max-width:\s*[\d.]+ch/, 'a text column narrowed in ch'],
        ]) {
            assert.equal(re.test(css), false, name + ' uses ' + what);
        }
    }
    assert.equal(/@(-webkit-)?keyframes|animation:|transition:/.test(sheet), false, 'canal.css moves nothing: movimiento.css and canal.js do');
    for (const m of gesture.match(/transition(-property)?:[^;]+;/g) || []) {
        const v = m.replace(/transition(-property)?:/, '').replace(/\([^)]*\)/g, '').replace(';', '');
        for (const p of v.split(',').map((x) => x.trim().split(/\s+/)[0])) {
            assert.ok(['transform', '-webkit-transform', 'opacity', 'none'].indexOf(p) !== -1, m);
        }
    }
});
