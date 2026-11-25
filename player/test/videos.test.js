import test from 'node:test';
import assert from 'node:assert/strict';
import {VideoWay, WAYS} from '../src/videos.js';

const DAY = '2026-11-25';

function keeper() {
    const kept = {};
    return {get: (k) => (k in kept ? kept[k] : null), set: (k, v) => {
        kept[k] = v;
    }, kept};
}

test('a screen whose videos move from the kept address says so and tries nothing else', () => {
    const way = new VideoWay(keeper());
    assert.equal(way.report(DAY), null);
    assert.deepEqual(way.ways(), WAYS);
    way.moved('kept');
    assert.deepEqual(way.ways(), ['kept']);
    assert.deepEqual(way.report(DAY), {way: 'kept', moved: 1, stuck: 0, rest: false});
});

test('one that only moves them another way remembers it after a restart', () => {
    const keep = keeper();
    new VideoWay(keep).moved('stream');
    const again = new VideoWay(keep);
    assert.deepEqual(again.ways(), ['stream']);
    assert.deepEqual(again.report(DAY), {way: 'stream', moved: 0, stuck: 0, rest: false});
});

test('where none moves any way, they rest until tomorrow, and then it starts over', () => {
    const keep = keeper();
    const way = new VideoWay(keep);
    assert.equal(way.failed(DAY), false);
    assert.equal(way.failed(DAY), true);
    assert.equal(way.goes(DAY), false);
    assert.equal(way.report(DAY).rest, true);
    const again = new VideoWay(keep);
    assert.equal(again.goes(DAY), false);
    assert.equal(again.goes('2026-11-26'), true);
    assert.deepEqual(again.ways(), WAYS);
});

test('a file that fails now and then on a screen that plays does not stop the rest', () => {
    const way = new VideoWay(keeper());
    way.moved('kept');
    for (let i = 0; i < 3; i++) {
        assert.equal(way.failed(DAY), false);
    }
    way.moved('kept');
    for (let i = 0; i < 3; i++) {
        assert.equal(way.failed(DAY), false);
    }
    assert.equal(way.failed(DAY), true);
    assert.deepEqual(way.ways(), WAYS);
});

test('what is kept, damaged or refused, is as nothing', () => {
    assert.deepEqual(new VideoWay({get: () => '{', set: () => {}}).ways(), WAYS);
    assert.deepEqual(new VideoWay({get: () => '{"way":"other"}', set: () => {}}).ways(), WAYS);
    assert.equal(new VideoWay({get: () => null, set: () => {}}).goes(DAY), true);
});
