import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dueAfter, pagesOf, scaleOf, Surprises, walkOf} from '../src/surprises.js';

const atlas = JSON.parse(readFileSync(new URL('../sorpresas/gusanito/spr.gusanito.atlas.json', import.meta.url), 'utf8'));
const m = atlas.meta;
const at = (v) => () => v;

test('it comes now and then, never closer than a quarter of an hour', () => {
    assert.equal(dueAfter(0, 20, at(0)), 15 * 60000);
    assert.equal(dueAfter(0, 20, at(1)), 25 * 60000);
    assert.equal(dueAfter(0, 1, at(0.5)), 15 * 60000);
    assert.equal(dueAfter(1000, 60, at(0.5)), 1000 + 60 * 60000);
});

test('its size goes with the short side of the screen and with the distance', () => {
    assert.equal(scaleOf(1920, 1080, 3), 1);
    assert.equal(scaleOf(1080, 1920, 3), 1);
    assert.equal(scaleOf(3840, 2160, 3), 2);
    assert.equal(scaleOf(1920, 1080, 8), 1.5);
});

test('it starts out of sight, stops inside the screen at the end of a turn, and goes out by the other side', () => {
    const cross = m.estados.cruza;
    const turn = cross.speed * cross.frames / cross.fps;
    for (const width of [1920, 1080]) {
        for (const r of [0, 0.3, 0.49, 0.5, 0.8, 0.999]) {
            const w = walkOf(m, width, 1, at(r));
            const stop = w.from + w.dir * w.turns * turn;
            assert.ok(stop > 0 && stop < width, 'stops on the screen: ' + stop);
            assert.ok(w.turns >= 1 && Number.isInteger(w.turns));
            if (w.dir > 0) {
                assert.ok(w.from + (m.cell.w - m.anchor.x) <= 0, 'starts out of sight');
                assert.ok(w.exit - m.anchor.x >= width, 'leaves out of sight');
            } else {
                assert.ok(w.from - (m.cell.w - m.anchor.x) >= width, 'starts out of sight');
                assert.ok(w.exit + m.anchor.x <= 0, 'leaves out of sight');
            }
        }
    }
});

test('a walk does not take long: at most eighteen seconds to where it stops on a wide screen', () => {
    const cross = m.estados.cruza;
    const w = walkOf(m, 1920, 1, at(0.999));
    assert.ok(w.turns * cross.frames / cross.fps <= 18, 'turns: ' + w.turns);
});

test('only the pages of its walk', () => {
    const pages = pagesOf(atlas, ['cruza', 'para', 'gesto.susto', 'huye']);
    assert.ok(pages.length >= 1 && pages.length <= m.pages.length);
    pages.forEach((p) => assert.ok(p >= 0 && p < m.pages.length));
    const all = pagesOf(atlas, Object.keys(m.estados));
    assert.equal(all.length, m.pages.length);
});

test('every frame of every state is in the atlas, and the states it needs are there', () => {
    for (const state of ['cruza', 'para', 'huye'].concat(m.gestos)) {
        const e = m.estados[state];
        assert.ok(e, state);
        assert.equal(e.sombra.length, e.frames);
        for (let i = 0; i < e.frames; i++) {
            const name = state + '_' + (i < 10 ? '0' : '') + i;
            assert.ok(atlas.frames[name], name);
        }
    }
    assert.ok(m.estados.cruza.speed > 0);
    assert.ok(m.estados.huye.speed > 0);
});

/** Surprises with nothing of a page: it says who would come out, and nothing moves. */
function fakeSurprises() {
    globalThis.document = {createElement: () => ({style: {}})};
    const s = new Surprises({}, {quiet: () => false, floor: () => null, note: () => null});
    s.gone = [];
    s.go = (who) => s.gone.push(who.id);
    return s;
}
const WORM = {every: 20, characters: [{id: 'gusanito', atlas: 'https://example.org/spr.gusanito.atlas.json'}]};

test('an order given right after turning them on waits for the manifest that says who comes out', () => {
    const s = fakeSurprises();
    const now = Date.now();
    s.configure(undefined, 3, now);
    s.askNow();
    s.tick(now, true);
    assert.deepEqual(s.gone, []);
    s.configure(WORM, 3, now);
    s.tick(now + 1000, true);
    assert.deepEqual(s.gone, ['gusanito']);
    s.tick(now + 2000, true);
    assert.deepEqual(s.gone, ['gusanito'], 'only once');
});

test('an order does not wait for ever on a screen that has none, and an urgent notice drops it', () => {
    const s = fakeSurprises();
    const now = Date.now();
    s.configure(undefined, 3, now);
    s.askNow();
    s.tick(now + 6 * 60000, true);
    s.configure(WORM, 3, now);
    s.tick(now + 6 * 60000 + 1000, true);
    assert.deepEqual(s.gone, []);

    s.askNow();
    s.tick(now, false);
    s.tick(now + 1000, true);
    assert.deepEqual(s.gone, []);
});

test('by itself it comes when its time comes, and a change of how often counts again from then', () => {
    const s = fakeSurprises();
    const now = Date.now();
    s.configure(WORM, 3, now);
    const first = s.due;
    assert.ok(first >= now + 15 * 60000 && first <= now + 25 * 60000);
    s.configure(WORM, 3, now + 1000);
    assert.equal(s.due, first, 'a new manifest with the same does not start it again');
    s.tick(first - 1000, true);
    assert.deepEqual(s.gone, []);
    s.tick(first, true);
    assert.deepEqual(s.gone, ['gusanito']);
    assert.ok(s.due > first);
    s.configure({every: 60, characters: WORM.characters}, 3, now);
    assert.ok(s.due >= now + 45 * 60000 && s.due <= now + 75 * 60000);
});

test('the panel\'s preview only asked', () => {
    const s = fakeSurprises();
    const now = Date.now();
    s.configure(WORM, 3, now);
    s.tick(s.due, true, true);
    assert.deepEqual(s.gone, []);
    s.askNow(WORM.characters[0]);
    s.tick(now, true, true);
    assert.deepEqual(s.gone, ['gusanito']);
});
