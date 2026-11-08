// «Síguenos en el canal» without a page: what the slide says from the item, when it comes, the plane's way and its trail, that
// its parts are in within two seconds, and that what goes to the player stays with what Chromium 56 understands.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindShort, channelShow, channelWords, flightPath, membersWords, trailOf, FLIGHT} from '../src/canal.js';

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
        // «mensaje» moves in 0.7 s.
        assert.ok(card.at + 0.7 < 2, level + ': the card settles at ' + (card.at + 0.7));
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

test('no browser API newer than Chromium 56 in canal.js', () => {
    const code = readFileSync(new URL('../src/canal.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
    for (const [re, what] of NEWER) {
        assert.equal(re.test(code), false, 'canal.js uses ' + what);
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
