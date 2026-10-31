import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Rotator, pageAt} from '../src/rotator.js';

const rot = () => new Rotator((it) => it.duration);
const A = {id: 'a', order: 1, duration: 10};
const B = {id: 'b', order: 2, duration: 5};
const C = {id: 'c', order: 3, duration: 10};

test('takes turns, each for its own duration', () => {
    const r = rot();
    assert.equal(r.pick([A, B, C], 0).item.id, 'a');
    assert.equal(r.pick([A, B, C], 9999).changed, false);
    assert.equal(r.pick([A, B, C], 10000).item.id, 'b');
    assert.equal(r.pick([A, B, C], 15000).item.id, 'c');
    assert.equal(r.pick([A, B, C], 25000).item.id, 'a');
});

test('when the current item ends by the clock, the next one in order follows', () => {
    const r = rot();
    r.pick([A, B, C], 0);
    r.pick([A, B, C], 10000);
    const next = r.pick([A, C], 11000);
    assert.equal(next.item.id, 'c');
    assert.equal(next.changed, true);
});

test('a single item stays, without changing', () => {
    const r = rot();
    r.pick([A], 0);
    const again = r.pick([A], 20000);
    assert.equal(again.item.id, 'a');
    assert.equal(again.changed, false);
});

test('nothing live: nothing to show', () => {
    const r = rot();
    r.pick([A], 0);
    assert.deepEqual(r.pick([], 1000), {item: null, changed: true});
    assert.deepEqual(r.pick([], 2000), {item: null, changed: false});
});

test('advance moves on before the time (a video ended)', () => {
    const r = rot();
    r.pick([A, B], 0);
    assert.equal(r.advance([A, B], 2000).item.id, 'b');
    assert.equal(r.pick([A, B], 6000).item.id, 'b');
    assert.equal(r.pick([A, B], 7000).item.id, 'a');
});

test('pages of a block', () => {
    assert.equal(pageAt(2, 3, 50000, 12), 0);
    assert.equal(pageAt(5, 2, 0, 12), 0);
    assert.equal(pageAt(5, 2, 12000, 12), 1);
    assert.equal(pageAt(5, 2, 24000, 12), 2);
    assert.equal(pageAt(5, 2, 36000, 12), 0);
});
