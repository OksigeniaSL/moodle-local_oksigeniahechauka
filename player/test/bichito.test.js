// The little creature of a name: the same for the same name (also with other capitals and spaces), another for another
// name, a plain SVG, and with a deep disc in the dark theme.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bichito} from '../src/bichito.js';

test('the same name, the same creature; another name, another', function () {
    const a = bichito('Lucía de la Fuente');
    assert.match(a, /^<svg[\s\S]*<\/svg>$/);
    assert.equal(bichito('  lucía de la fuente '), a);
    assert.notEqual(bichito('Pablo Ruiz'), a);
    assert.notEqual(bichito('Lucía de la Fuente', true), a);
});

test('many names, many creatures', function () {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
        seen.add(bichito('Persona ' + i));
    }
    assert.ok(seen.size > 190, 'only ' + seen.size + ' different');
});
