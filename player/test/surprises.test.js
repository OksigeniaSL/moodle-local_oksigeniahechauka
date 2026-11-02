import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {cleanOf, dueAfter, filesOf, hangOf, heightOf, inSeason, isRaining, pagesOf, scaleOf, Surprises, tileOf, walkOf} from '../src/surprises.js';

const atlasOf = (id) => JSON.parse(readFileSync(new URL('../sorpresas/' + id + '/spr.' + id + '.atlas.json', import.meta.url), 'utf8'));
const atlas = atlasOf('gusanito');
const m = atlas.meta;
const ALL = ['gusanito', 'abeja', 'mosca', 'arana', 'pulpo', 'geco'];
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
        // What hangs goes by its `avance`: it has no way forward.
        if (!one.meta.estados.cruza.hilo && !one.meta.vaho) {
            assert.ok(one.meta.estados.cruza.speed > 0, id);
            assert.ok(one.meta.estados.huye.speed > 0, id);
        }
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

test('what comes with water brings its tiles, goes under the surface on any shape of screen and keeps its files', () => {
    const one = atlasOf('pulpo');
    const water = one.meta.agua;
    assert.ok(water);
    const files = filesOf(one);
    for (const name of one.meta.pages.concat(water.capas.map((capa) => capa.image))) {
        assert.ok(files.includes(name), name);
        assert.ok(existsSync(new URL('../sorpresas/pulpo/' + name, import.meta.url)), name);
    }
    assert.equal(files.length, one.meta.pages.length + water.capas.length);
    for (const capa of water.capas) {
        assert.ok(['x', 'xy'].includes(capa.repite));
        assert.ok(capa.repite === 'x' ? capa.velocidad[0] !== 0 : capa.velocidad[1] !== 0);
    }
    for (const [width, height] of [[1920, 1080], [1080, 1920], [3840, 2160]]) {
        const surface = height * (1 - water.nivel.alto);
        for (const r of [0, 0.5, 1]) {
            assert.ok(heightOf(one.meta, height, scaleOf(width, height, 3), null, at(r)) > surface, width + ' ' + r);
        }
    }
    assert.ok(water.nivel.bicho_a < water.nivel.sube);
    assert.equal(atlasOf('abeja').meta.agua, undefined);
});

test('who comes with steam gets to the porthole from out of sight, brings the squeegee from below the screen and ends at the top', () => {
    const one = atlasOf('geco');
    const m2 = one.meta;
    const v = m2.vaho;
    const files = filesOf(one);
    for (const name of files) {
        assert.ok(existsSync(new URL('../sorpresas/geco/' + name, import.meta.url)), name);
    }
    assert.equal(files.length, m2.pages.length + 6);
    for (const state of ['baja', 'cae', 'limpia', 'resbala', 'gesto.clonk']) {
        const e = m2.estados[state];
        assert.equal(e.avance.length, e.frames, state);
        for (let i = 0; i < e.frames; i++) {
            assert.ok(one.frames[state + '_' + (i < 10 ? '0' : '') + i], state + ' ' + i);
        }
        if (e.corte) {
            assert.equal(e.corte.length, e.frames, state);
        }
    }
    assert.equal(m2.estados.para.tapon.length, m2.estados.para.frames);
    // Once it lets the squeegee go, it does not pick it up.
    const cut = m2.estados['gesto.clonk'].corte;
    const free = cut.indexOf(null);
    assert.ok(free > 0 && cut.slice(free).every((c) => c === null));
    assert.ok(m2.estados.limpia.corte.every((c) => c !== null));
    const down = (name) => m2.estados[name].avance.reduce((total, step) => total + step[1], 0);
    assert.ok(down('resbala') === 0);
    for (const [width, height, distance] of [[1920, 1080, 3], [1080, 1920, 3], [1920, 1080, 8], [3840, 2160, 3]]) {
        const scale = scaleOf(width, height, distance);
        const below = (m2.cell.h - m2.anchor.y) * scale;
        for (const slips of [false, true]) {
            const plan = cleanOf(m2, width, height, scale, 'gesto.clonk', slips);
            assert.equal(plan.shape, width >= height ? v.ancha : v.alta);
            assert.ok(plan.shape.w * plan.k >= width - 0.001 && plan.shape.h * plan.k >= height - 0.001, 'the steam covers the screen');
            const first = plan.steps[0];
            assert.equal(first.state, 'cruza');
            assert.ok(first.y >= height + below - 0.001, 'starts out of sight');
            const face = first.y + (first.times * down('cruza') + down('para')) * scale;
            const porthole = plan.oy + plan.shape.hueco[1] * plan.k;
            assert.ok(Math.abs(face + (v.cara_y - m2.anchor.y) * scale - porthole) < 0.001, 'its face in the porthole');
            const up = plan.steps.filter((s) => s.state === 'limpia');
            assert.equal(up.length, slips ? 2 : 1);
            const y = up[0].y;
            assert.ok(y + (m2.estados.limpia.corte[0] - m2.anchor.y) * scale >= height + plan.over - 0.001, 'the squeegee starts below');
            const times = up.reduce((total, s) => total + s.times, 0);
            assert.ok(Math.abs(y + times * down('limpia') * scale - m2.anchor.y * scale) < 0.001, 'ends with its cell at the top');
            assert.equal(plan.steps[plan.steps.length - 1].state, 'huye');
            assert.equal(plan.steps[plan.steps.length - 1].leaves, -below);
        }
    }
});

test('what hangs starts out of sight, brakes just where it stops, on the screen, and has its thread in every frame', () => {
    const one = atlasOf('arana').meta;
    const cell = one.cell;
    for (const state of ['cruza', 'para', 'huye'].concat(one.gestos)) {
        const e = one.estados[state];
        assert.equal(e.hilo.length, e.frames, state);
        assert.equal(e.avance.length, e.frames, state);
        for (const p of e.hilo) {
            assert.ok(p[0] > 0 && p[0] < cell.w && p[1] > 0 && p[1] < cell.h, state);
        }
    }
    const down = (name) => one.estados[name].avance.reduce((total, step) => total + step[1], 0);
    assert.ok(down('cruza') > 0);
    assert.ok(down('huye') < 0);
    for (const [width, height, distance] of [[1920, 1080, 3], [1080, 1920, 3], [1920, 1080, 8], [3840, 2160, 3]]) {
        const scale = scaleOf(width, height, distance);
        for (const r of [0, 0.25, 0.5, 0.999]) {
            const stop = heightOf(one, height, scale, null, at(r));
            assert.ok(stop > 0 && stop < height);
            const h = hangOf(one, width, stop, scale, at(r));
            assert.ok(h.turns >= 1 && Number.isInteger(h.turns));
            assert.ok(h.top + (cell.h - one.anchor.y) * scale <= 0.001, 'starts out of sight');
            assert.ok(Math.abs(h.top + h.turns * down('cruza') * scale + down('para') * scale - stop) < 0.001, 'brakes where it stops');
            assert.ok(h.from - one.anchor.x * scale >= -0.001 && h.from + one.anchor.x * scale <= width + 0.001, 'on the screen');
            assert.equal(h.exit, -(cell.h - one.anchor.y) * scale);
            assert.equal(h.dir, r < 0.5 ? 1 : -1);
        }
    }
    // Those who do not hang have no `top`, and the walk goes as it did.
    assert.equal(walkOf(atlasOf('abeja').meta, 1920, 1, at(0.5)).top, undefined);
    assert.equal(atlasOf('abeja').meta.estados.cruza.hilo, undefined);
});

test('what falls closes its loop: a tile down is a whole number of tiles across, in whole pixels at any size', () => {
    assert.deepEqual(filesOf(atlas), m.pages);
    for (const id of ['nieve', 'lluvia']) {
        const fall = atlasOf(id);
        assert.equal(fall.meta.tipo, 'capas');
        assert.deepEqual(filesOf(fall), ['spr.' + id + '-1.webp', 'spr.' + id + '-2.webp']);
        for (const capa of fall.meta.capas) {
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
        assert.ok(fall.meta.entra + fall.meta.sale < fall.meta.dura);
    }
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
    const s = new Surprises({}, {quiet: () => false, floor: () => null, raining: () => s.rain, note: () => null});
    s.rain = false;
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

test('it rains by the sky that is on the screen, for as long as the server has been heard', () => {
    const sky = (symbol) => ({now: {symbol, temp: 15}});
    for (const symbol of ['lightrain', 'rain', 'heavyrain', 'rainshowers_day', 'lightrainshowers_night', 'rainandthunder', 'sleet']) {
        assert.equal(isRaining(sky(symbol), 0), true, symbol);
    }
    for (const symbol of ['clearsky_day', 'fair_night', 'partlycloudy_day', 'cloudy', 'fog', 'snow', 'lightsnowshowers_day']) {
        assert.equal(isRaining(sky(symbol), 0), false, symbol);
    }
    assert.equal(isRaining(undefined, 0), false);
    assert.equal(isRaining({}, 0), false);
    assert.equal(isRaining(sky('rain'), 2 * 3600000), true);
    assert.equal(isRaining(sky('rain'), 4 * 3600000), false);
});

test('what comes with the rain comes only when it rains, but an order with nobody else is not lost', () => {
    const s = fakeSurprises();
    const now = Date.now();
    const rain = {id: 'lluvia', atlas: 'x', when: 'rain'};
    s.configure({every: 20, characters: [rain]}, 3, now);
    s.tick(now + 60 * 60000, true);
    assert.deepEqual(s.gone, []);
    s.rain = true;
    s.tick(now + 2 * 60 * 60000, true);
    assert.deepEqual(s.gone, ['lluvia']);

    s.gone.length = 0;
    s.rain = false;
    s.askNow();
    s.tick(now + 2 * 60 * 60000, true);
    assert.deepEqual(s.gone, ['lluvia']);

    s.gone.length = 0;
    s.configure({every: 20, characters: [rain, WORM.characters[0]]}, 3, now);
    s.askNow();
    s.tick(now + 2 * 60 * 60000, true);
    assert.deepEqual(s.gone, ['gusanito']);
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
