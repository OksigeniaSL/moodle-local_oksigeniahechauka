// The centre's own sentence in the ticker: when it comes back.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CENTRE_EVERY, CENTRE_MS, centreAfter, centreDue, centreState} from '../src/lema.js';

// The order of n turns of the ticker, a turn every «each» ms: C for the centre's, s for another.
function turns(others, n, each) {
    let st = centreState();
    let out = '';
    for (let i = 0; i < n; i++) {
        const now = i * each;
        const c = centreDue(st, others, now);
        out += c ? 'C' : 's';
        st = centreAfter(st, c, now);
    }
    return out;
}

test('it comes first, and then every five sentences when there are many', () => {
    assert.equal(turns(7, 18, 12000), 'CsssssCsssssCsssss');
    assert.equal(CENTRE_EVERY, 5);
});

test('with few sentences, every three minutes, never twice in a row', () => {
    const out = turns(2, 40, 12000);
    assert.equal(out.charAt(0), 'C');
    const at = [];
    for (let i = 0; i < out.length; i++) {
        if (out.charAt(i) === 'C') {
            at.push(i * 12000);
        }
    }
    for (let k = 1; k < at.length; k++) {
        assert.ok(at[k] - at[k - 1] >= CENTRE_MS);
        assert.ok(at[k] - at[k - 1] < CENTRE_MS + 12001);
    }
    assert.ok(out.indexOf('CC') === -1);
});

test('without other sentences, it is the only one', () => {
    assert.equal(turns(0, 4, 12000), 'CCCC');
});
