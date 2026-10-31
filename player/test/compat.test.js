// The player must run on Chromium 56 (Samsung Tizen 4). esbuild lowers the syntax, but it does not add what the
// browser lacks: these calls must not appear in the sources. The real proof is the player on a real screen.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';

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
];

test('no browser API newer than Chromium 56 in the player', () => {
    const dir = new URL('../src/', import.meta.url);
    for (const f of readdirSync(dir)) {
        // Comments may name what is missing; only the code counts.
        const src = readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        for (const [re, what] of NEWER) {
            assert.equal(re.test(src), false, f + ' uses ' + what);
        }
    }
});

test('the styles stay with what Chromium 56 understands', () => {
    const css = readFileSync(new URL('../hechauka.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [re, what] of [
        [/display:\s*grid/, 'CSS Grid (Chrome 57)'],
        [/\bgap:/, 'gap in flex (Chrome 84)'],
        [/clamp\(|min\(|max\(/, 'clamp/min/max (Chrome 79)'],
        [/aspect-ratio|inset:|:is\(|:where\(|color-mix/, 'newer CSS'],
        [/@container|cq[whib]/, 'container queries (Chrome 105)'],
        [/prefers-color-scheme/, 'prefers-color-scheme (Chrome 76)'],
    ]) {
        assert.equal(re.test(css), false, 'hechauka.css uses ' + what);
    }
});
