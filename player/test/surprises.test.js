import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dueAfter, filesOf, heightOf, inSeason, pagesOf, scaleOf, Surprises, tileOf, walkOf} from '../src/surprises.js';

const atlasOf = (id) => JSON.parse(readFileSync(new URL('../sorpresas/' + id + '/spr.' + id + '.atlas.json', import.meta.url), 'utf8'));
const atlas = atlasOf('gusanito');
const m = atlas.meta;
const ALL = ['gusanito', 'abeja', 'mosca'];
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

test('every frame of every state of everyone is in its atlas, and the states it needs are there', () => {
    for (const id of ALL) {
        const one = atlasOf(id);
        for (const state of ['cruza', 'para', 'huye'].concat(one.meta.gestos)) {
            const e = one.meta.estados[state];
            assert.ok(e, id + ' ' + state);
            if (e.sombra) {
                assert.equal(e.sombra.length, e.frames, id + ' ' + state);
            }
            if (e.avance) {
                assert.equal(e.avance.length, e.frames, id + ' ' + state);
            }
            for (let i = 0; i < e.frames; i++) {
                const name = state + '_' + (i < 10 ? '0' : '') + i;
                assert.ok(one.frames[name], id + ' ' + name);
            }
        }
        assert.ok(one.meta.estados.cruza.speed > 0, id);
        assert.ok(one.meta.estados.huye.speed > 0, id);
    }
});

test('what flies comes back to its height at the end of each turn of its loops, and its speed is its way forward', () => {
    for (const id of ['abeja', 'mosca']) {
        for (const state of ['cruza', 'huye']) {
            const e = atlasOf(id).meta.estados[state];
            const sum = (k) => e.avance.reduce((total, step) => total + step[k], 0);
            assert.ok(Math.abs(sum(1)) < 0.01, id + ' ' + state + ' dy ' + sum(1));
            assert.ok(Math.abs(sum(0) - e.speed * e.frames / e.fps) < 0.5, id + ' ' + state + ' dx ' + sum(0));
        }
    }
});

test('a walker goes on the ticker or the bottom edge; a flyer, within its heights, on any shape of screen', () => {
    assert.equal(heightOf(m, 1080, 1, 984, at(0.5)), 984);
    assert.equal(heightOf(m, 1080, 1, null, at(0.5)), 1074);
    const bee = atlasOf('abeja').meta;
    assert.equal(heightOf(bee, 1080, 1, 984, at(0)), 270);
    assert.equal(heightOf(bee, 1080, 1, null, at(1)), 720);
    assert.equal(heightOf(bee, 1920, 1, 984, at(0)), 480);
    assert.equal(heightOf(bee, 1920, 1, 984, at(1)), 1280);
});

test('a flyer also starts out of sight and stops on the screen', () => {
    for (const id of ['abeja', 'mosca']) {
        const one = atlasOf(id).meta;
        const cross = one.estados.cruza;
        const turn = cross.speed * cross.frames / cross.fps;
        for (const width of [1920, 1080]) {
            for (const r of [0, 0.49, 0.5, 0.999]) {
                const w = walkOf(one, width, 1, at(r));
                const stop = w.from + w.dir * w.turns * turn;
                assert.ok(stop > 0 && stop < width);
                assert.ok(w.dir > 0 ? w.from + one.cell.w - one.anchor.x <= 0 : w.from - (one.cell.w - one.anchor.x) >= width);
            }
        }
    }
});

test('what falls closes its loop: a tile down is a whole number of tiles across, in whole pixels at any size', () => {
    const snow = atlasOf('nieve');
    assert.equal(snow.meta.tipo, 'capas');
    assert.deepEqual(filesOf(snow), ['spr.nieve-1.webp', 'spr.nieve-2.webp']);
    assert.deepEqual(filesOf(atlas), m.pages);
    for (const capa of snow.meta.capas) {
        const one = tileOf(capa, 1);
        assert.equal(one.w, capa.w);
        assert.equal(one.h, capa.h);
        assert.ok(one.turns >= 1);
        assert.ok(Math.abs(capa.velocidad[0] * one.seconds - one.turns * capa.w) < 0.5);
        for (const scale of [1.25, 1.5, 2, 2.37]) {
            const big = tileOf(capa, scale);
            assert.ok(Number.isInteger(big.w) && Number.isInteger(big.h));
            assert.equal(big.seconds, one.seconds);
            assert.equal(big.turns, one.turns);
        }
    }
    assert.ok(snow.meta.entra + snow.meta.sale < snow.meta.dura);
});

test('its season, year after year, also over New Year', () => {
    const on = (month, day) => new Date(2027, month - 1, day, 12);
    assert.equal(inSeason(undefined, on(7, 1)), true);
    const summer = {from: '06-15', until: '08-31'};
    assert.equal(inSeason(summer, on(6, 14)), false);
    assert.equal(inSeason(summer, on(6, 15)), true);
    assert.equal(inSeason(summer, on(8, 31)), true);
    assert.equal(inSeason(summer, on(9, 1)), false);
    const winter = {from: '12-15', until: '01-06'};
    assert.equal(inSeason(winter, on(12, 14)), false);
    assert.equal(inSeason(winter, on(12, 31)), true);
    assert.equal(inSeason(winter, on(1, 1)), true);
    assert.equal(inSeason(winter, on(1, 6)), true);
    assert.equal(inSeason(winter, on(1, 7)), false);
});

/** Surprises with nothing of a page: it says who would come out, and nothing moves. */
function fakeSurprises() {
    globalThis.document = {createElement: () => ({style: {}})};
    const s = new Surprises({}, {quiet: () => false, floor: () => null, note: () => null});
    s.gone = [];
    s.go = (who) => who && s.gone.push(who.id);
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

test('out of season it does not come by itself, but an order with nobody else in season is not lost', () => {
    const s = fakeSurprises();
    const now = new Date(2027, 6, 1, 12).getTime();
    const snow = {id: 'nieve', atlas: 'x', season: {from: '12-15', until: '01-06'}};
    s.configure({every: 20, characters: [snow]}, 3, now);
    s.tick(now + 60 * 60000, true);
    assert.deepEqual(s.gone, []);
    s.askNow();
    s.tick(now + 60 * 60000, true);
    assert.deepEqual(s.gone, ['nieve']);

    s.gone.length = 0;
    s.configure({every: 20, characters: [snow, WORM.characters[0]]}, 3, now);
    s.askNow();
    s.tick(now + 60 * 60000, true);
    assert.deepEqual(s.gone, ['gusanito']);

    s.gone.length = 0;
    s.configure({every: 20, characters: [snow]}, 3, new Date(2026, 11, 20, 12).getTime());
    s.askNow();
    s.tick(new Date(2026, 11, 20, 12).getTime(), true);
    assert.deepEqual(s.gone, ['nieve']);
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
