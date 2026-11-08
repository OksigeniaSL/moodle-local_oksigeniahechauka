// The pure part of movimiento.js (when each part comes in, the flaps of a countdown), and what the new sheet and scripts may
// use on Chromium 56: the same checks as compat.test.js, and more, over movimiento.css, movimiento.js and retoques.js.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// movimiento.js imports partyOf from the player's cumple.js, which needs a page: the pure functions are read on their own.
const src = readFileSync(new URL('../src/movimiento.js', import.meta.url), 'utf8');
const pure = src.slice(src.indexOf('export const TIMING'), src.indexOf('/** The level of movement'))
    + src.slice(src.indexOf('/**\n * When each part comes in'), src.indexOf('/** The parts of a composition'));
const mod = await import('data:text/javascript,' + encodeURIComponent(pure.replace(/^const PARTS = \{[\s\S]*?\n\};\n/m, '')));
const {TIMING, timeline, flapsOf} = mod;

test('the parts come in after the old slide has gone, in the order of their rank', () => {
    const rules = [['.a', 'bloque', 0], ['.b', 'sube', 2], ['.c', 'linea', 5, 'each']];
    const t = timeline(rules, [1, 1, 3], 'elegante', false);
    assert.equal(t.length, 5);
    assert.equal(t[0].at, TIMING.elegante.wait);
    assert.ok(t[1].at > t[0].at);
    assert.ok(t[2].at > t[1].at && t[3].at > t[2].at && t[4].at > t[3].at, 'the lines one after the other');
    assert.equal(Math.round((t[3].at - t[2].at) * 1000), Math.round(TIMING.elegante.line * 1000));
});

test('every slide is in within two seconds, at every level', () => {
    // The fullest of the redone: a third of six lines after the lead (its last part, a line of 0.6 s, from rank 5).
    const rules = [['.a', 'bloque', 0], ['.b', 'sube', 5], ['.c', 'linea', 5, 'each']];
    for (const level of ['sobria', 'elegante', 'juguetona']) {
        const last = timeline(rules, [1, 1, 6], level, false).pop().at;
        assert.ok(last + 0.6 < 2, level + ': the last part settles at ' + (last + 0.6));
    }
});

test('a still screen keeps the order, closer together', () => {
    const rules = [['.a', 'bloque', 0], ['.b', 'sube', 3]];
    const moving = timeline(rules, [1, 1], 'elegante', false);
    const still = timeline(rules, [1, 1], 'elegante', true);
    assert.ok(still[1].at < moving[1].at && still[1].at > still[0].at);
});

test('the flaps start from yesterday at every level: one turn, never a number that is not', () => {
    for (const level of ['sobria', 'elegante', 'juguetona']) {
        assert.equal(TIMING[level].flips, 1, level);
        assert.deepEqual(flapsOf(3, TIMING[level].flips), ['4', '3']);
    }
});

test('the flaps go through a few numbers to the day, never with fewer digits', () => {
    assert.deepEqual(flapsOf(3, 3), ['6', '5', '4', '3']);
    assert.deepEqual(flapsOf(8, 5), ['9', '8']);
    assert.deepEqual(flapsOf(12, 1), ['13', '12']);
    assert.deepEqual(flapsOf(0, 0), ['0']);
    assert.deepEqual(flapsOf('7', 3), ['9', '8', '7']);
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
    [/getAnimations|\.finished\b/, 'getAnimations, Animation.finished (Chrome 84)'],
];

test('no browser API newer than Chromium 56 in what goes to the player', () => {
    for (const f of ['movimiento.js', 'retoques.js']) {
        const code = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, '');
        for (const [re, what] of NEWER) {
            assert.equal(re.test(code), false, f + ' uses ' + what);
        }
    }
});

test('the sheets stay with what Chromium 56 understands, and move only transform and opacity', () => {
    for (const f of ['movimiento.css']) {
        const css = readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        for (const [re, what] of [
            [/display:\s*grid/, 'CSS Grid (Chrome 57)'],
            [/\bgap:/, 'gap in flex (Chrome 84)'],
            [/clamp\(|min\(|max\(/, 'clamp/min/max (Chrome 79)'],
            [/aspect-ratio|inset:|:is\(|:where\(|color-mix/, 'newer CSS'],
            [/@container|cq[whib]/, 'container queries (Chrome 105)'],
            [/prefers-color-scheme/, 'prefers-color-scheme (Chrome 76)'],
            [/space-evenly/, 'space-evenly (Chrome 60)'],
            [/#[0-9a-f]{8}\b|#[0-9a-f]{4}\b/i, 'colours with alpha in hex (Chrome 62)'],
            [/max-width:\s*[\d.]+ch/, 'a text column narrowed in ch'],
        ]) {
            assert.equal(re.test(css), false, f + ' uses ' + what);
        }
        // Inside @keyframes, plain values only, and only transform and opacity.
        const frames = css.match(/@(-webkit-)?keyframes[^{]+\{([^{}]*\{[^{}]*\})*[^{}]*\}/g) || [];
        assert.ok(f !== 'movimiento.css' || frames.length > 0, 'the keyframes of movimiento.css are read');
        for (const k of frames) {
            assert.equal(/var\(/.test(k), false, 'a custom property inside ' + k.slice(0, 40));
            const props = (k.match(/[\w-]+(?=\s*:)/g) || []).filter((p) => !/^\d/.test(p));
            for (const p of props) {
                assert.ok(['transform', '-webkit-transform', 'opacity'].indexOf(p) !== -1, p + ' animated in ' + k.slice(0, 40));
            }
        }
        // What transitions, only transform and opacity.
        for (const m of css.match(/transition(-property)?:[^;]+;/g) || []) {
            const v = m.replace(/transition(-property)?:/, '').replace(/\([^)]*\)/g, '').replace(';', '');
            if (/none/.test(v)) {
                continue;
            }
            const props = v.split(',').map((x) => x.trim().split(/\s+/)[0]);
            for (const p of props) {
                assert.ok(['transform', '-webkit-transform', 'opacity', 'none'].indexOf(p) !== -1, f + ': ' + m);
            }
        }
    }
});
