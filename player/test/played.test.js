import test from 'node:test';
import assert from 'node:assert/strict';
import {Played} from '../src/played.js';

test('it adds up and goes every ten heartbeats', () => {
    const p = new Played();
    p.add(['i1', 'menu'], 10);
    p.add(['i1'], 5);
    for (let i = 0; i < 9; i++) {
        assert.equal(p.take(), null);
    }
    assert.deepEqual(p.take(), {i1: [2, 15], menu: [1, 10]});
    p.sent();
    assert.equal(p.sending, null);
});

test('what did not arrive goes with the next', () => {
    const p = new Played();
    p.add(['i1'], 10);
    for (let i = 0; i < 9; i++) {
        p.take();
    }
    p.take();
    p.add(['i1'], 5);
    p.failed();
    for (let i = 0; i < 9; i++) {
        assert.equal(p.take(), null);
    }
    assert.deepEqual(p.take(), {i1: [2, 15]});
});

test('nothing shown, nothing sent', () => {
    const p = new Played();
    for (let i = 0; i < 25; i++) {
        assert.equal(p.take(), null);
    }
});
