import test from 'node:test';
import assert from 'node:assert/strict';
import {VideoWay} from '../src/videos.js';

function keeper() {
    const kept = {};
    return {get: (k) => (k in kept ? kept[k] : null), set: (k, v) => {
        kept[k] = v;
    }, kept};
}

test('a screen whose videos move from the kept address says so and changes nothing', () => {
    const way = new VideoWay(keeper());
    assert.equal(way.report('2026-11-25'), null);
    way.moved(false);
    assert.equal(way.memory, false);
    assert.deepEqual(way.report('2026-11-25'), {way: 'kept', moved: 1, stuck: 0, rest: false});
});

test('one that only moves them from memory remembers it after a restart', () => {
    const keep = keeper();
    new VideoWay(keep).moved(true);
    const again = new VideoWay(keep);
    assert.equal(again.memory, true);
    assert.equal(again.sure, true);
    assert.deepEqual(again.report('2026-11-25'), {way: 'memory', moved: 0, stuck: 0, rest: false});
});

test('where none moves either way, they rest until tomorrow, and then it starts over', () => {
    const keep = keeper();
    const way = new VideoWay(keep);
    assert.equal(way.failed('2026-11-25'), false);
    assert.equal(way.failed('2026-11-25'), true);
    assert.equal(way.goes('2026-11-25'), false);
    assert.equal(way.report('2026-11-25').rest, true);
    const again = new VideoWay(keep);
    assert.equal(again.goes('2026-11-25'), false);
    assert.equal(again.goes('2026-11-26'), true);
    assert.equal(again.memory, false);
});

test('a file that fails now and then on a screen that plays does not stop the rest', () => {
    const way = new VideoWay(keeper());
    way.moved(false);
    for (let i = 0; i < 3; i++) {
        assert.equal(way.failed('2026-11-25'), false);
    }
    way.moved(false);
    for (let i = 0; i < 3; i++) {
        assert.equal(way.failed('2026-11-25'), false);
    }
    assert.equal(way.failed('2026-11-25'), true);
});

test('what is kept, damaged or refused, is as nothing', () => {
    assert.equal(new VideoWay({get: () => '{', set: () => {}}).memory, false);
    assert.equal(new VideoWay({get: () => null, set: () => {}}).goes('2026-11-25'), true);
});
