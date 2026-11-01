// Headlines in even lines: where the breaks go.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cutsFor} from '../src/balance.js';

// A letter is one unit wide, a space too.
const widths = (text) => text.split(' ').map((w) => w.length);

test('the breaks go where each line comes closest to the same width', () => {
    const t = 'El huerto, listo para la siembra de otoño';
    const words = t.split(' ');
    const cuts = cutsFor(widths(t), 1, 2);
    assert.deepEqual(cuts, [3]);
    assert.equal(words.slice(0, 4).join(' '), 'El huerto, listo para');
    // Three lines: two breaks, in order.
    const three = cutsFor(widths('uno dos tres cuatro cinco seis siete ocho nueve'), 1, 3);
    assert.equal(three.length, 2);
    assert.ok(three[0] < three[1]);
    // One line: no break.
    assert.deepEqual(cutsFor(widths('Hola mundo'), 1, 1), []);
});
