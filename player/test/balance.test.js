// Headlines in two even lines: where the cut goes.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bestSplit} from '../src/balance.js';

// A letter is one unit wide, a space too.
const width = (t) => t.length;

test('a headline in two lines is cut where both come out most alike', () => {
    const words = 'El huerto, listo para la siembra de otoño'.split(' ');
    // A greedy wrap at 30 would leave «El huerto, listo para la» / «siembra de otoño»; even: 20 and 20.
    const k = bestSplit(words, width, 30);
    assert.equal(words.slice(0, k).join(' '), 'El huerto, listo para');
    assert.equal(words.slice(k).join(' '), 'la siembra de otoño');
    // Too long for two lines: no cut.
    assert.equal(bestSplit(words, width, 15), -1);
    // One word: nothing to cut.
    assert.equal(bestSplit(['Hola'], width, 30), -1);
});
