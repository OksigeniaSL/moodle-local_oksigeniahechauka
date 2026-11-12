// The two zones (zonas): when the composer chooses them and with what, without a page.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Composer, ZONES_EVERY, zonesOf} from '../src/compose.js';

const pic = (id, w, h, type) => ({id, type: type || 'image', media: {width: w, height: h}});
const wide = (id, type) => pic(id, 1920, 1080, type);
const tall = (id) => pic(id, 576, 1024);

// The compositions of n slides in a row.
function run(queue, opts, n) {
    const c = new Composer();
    const out = [];
    for (let i = 0; i < n; i++) {
        out.push(c.next(queue, 3, true, opts));
    }
    return out;
}

test('the two zones come now and then, never fixed, every nine slides', () => {
    const list = run([wide('w'), tall('a'), wide('v'), tall('b')], {weather: true, use: 'info'}, 40);
    const at = [];
    list.forEach((r, i) => {
        if (r.comp === 'zonas') {
            at.push(i);
        }
    });
    assert.ok(at.length >= 4, 'at least four times in 40 slides: ' + at);
    assert.equal(at[0], ZONES_EVERY, 'the first one after the others have had their turn');
    for (let k = 1; k < at.length; k++) {
        assert.equal(at[k] - at[k - 1], ZONES_EVERY);
    }
    // Never two in a row: the rest of the rotation stays.
    assert.ok(list.filter((r) => r.comp !== 'zonas').length > 30);
});

test('the wide zone takes the next landscape picture or video; the column, up to four portraits', () => {
    const z = zonesOf([tall('a'), wide('w'), tall('b'), wide('v', 'video'), tall('c'), tall('d'), tall('e')], 0, {});
    assert.equal(z.wide.id, 'w');
    assert.deepEqual(z.items.map((x) => x.id), ['w', 'a', 'b', 'c', 'd']);
    assert.deepEqual(z.extra, {wide: true, weather: false, agenda: false, place: false});
    const v = zonesOf([wide('v', 'video'), tall('a')], 0, {});
    assert.equal(v.wide.id, 'v');
    // A video is never in the column: one decoder, and the column moves.
    assert.equal(zonesOf([wide('w'), pic('pv', 1080, 1920, 'video')], 0, {}), null);
});

test('without anything for the column, no zones', () => {
    assert.equal(zonesOf([wide('w'), wide('v')], 0, {}), null);
    assert.ok(!run([wide('w'), wide('v')], {use: 'info'}, 30).some((r) => r.comp === 'zonas'));
    // The weather or the coming days are enough for the column.
    assert.ok(zonesOf([wide('w')], 0, {weather: true}));
    assert.ok(zonesOf([wide('w')], 0, {agendaNext: true}));
});

test('without a landscape picture, the place of the screen is the wide zone; without either, no zones', () => {
    assert.equal(zonesOf([tall('a'), tall('b')], 0, {weather: true}), null);
    const z = zonesOf([tall('a'), tall('b')], 0, {weather: true, place: true});
    assert.equal(z.wide, null);
    assert.deepEqual(z.items.map((x) => x.id), ['a', 'b']);
    assert.equal(z.extra.place, true);
    // With nothing in the queue too: the weather and the coming days beside the place.
    const c = new Composer();
    const out = [];
    for (let i = 0; i < 14; i++) {
        out.push(c.next([], 3, true, {weather: true, agendaNext: true, place: true, use: 'info'}).comp);
    }
    assert.ok(out.indexOf('zonas') !== -1, out.join(' '));
    // A landscape picture is never left out for the place.
    assert.equal(zonesOf([wide('w'), tall('a')], 0, {place: true}).extra.place, false);
});

test('never on a showcase, on a screen without «Today», nor right after the agenda', () => {
    const q = [wide('w'), tall('a')];
    assert.ok(!run(q, {weather: true, use: 'showcase'}, 30).some((r) => r.comp === 'zonas'));
    assert.ok(!run(q, {weather: true, use: 'info', noToday: true}, 30).some((r) => r.comp === 'zonas'));
    const mixed = run(q, {weather: true, use: 'mixed'}, 30).map((r) => r.comp);
    assert.ok(mixed.indexOf('zonas') !== -1, 'on a mixed screen too');
    const c = new Composer();
    c.sinceZones = ZONES_EVERY + 5;
    c.last = 'agenda';
    assert.notEqual(c.next(q, 3, true, {weather: true, use: 'info'}).comp, 'zonas');
});

test('the queue goes on after the wide picture, and the slide lasts long', () => {
    const c = new Composer();
    c.sinceZones = ZONES_EVERY + 5;
    c.sinceFull = -100;
    const q = [wide('w'), tall('a'), wide('v'), tall('b')];
    const r = c.next(q, 3, true, {weather: true, use: 'info'});
    assert.equal(r.comp, 'zonas');
    assert.ok(r.seconds >= 40);
    assert.equal(c.lastId, 'w');
    assert.equal(c.next(q, 3, true, {use: 'info'}).items[0].id, 'a');
});

test('from 8 m the centre\'s sentence is one of the headlines; closer, never: it is the ticker\'s', () => {
    const far = new Composer();
    const heads = [];
    for (let i = 0; i < 48; i++) {
        const r = far.next([wide('w')], 3, true, {distance: 8, phrases: ['Una', 'Dos'], centre: 'Lema', use: 'info'});
        if (r.comp === 'titular') {
            heads.push(r.extra.centre ? 'centro' : r.extra.text);
        }
    }
    assert.ok(heads.indexOf('centro') !== -1, heads.join(' '));
    assert.ok(heads.indexOf('Una') !== -1 && heads.indexOf('Dos') !== -1);
    const alone = new Composer();
    const only = [];
    for (let i = 0; i < 16; i++) {
        const r = alone.next([wide('w')], 3, true, {distance: 8, centre: 'Lema', use: 'info'});
        if (r.comp === 'titular') {
            only.push(r.extra.text);
        }
    }
    assert.deepEqual(only, ['Lema', 'Lema', 'Lema', 'Lema']);
    const near = new Composer();
    const comps = [];
    for (let i = 0; i < 40; i++) {
        comps.push(near.next([wide('w'), wide('v')], 3, true, {distance: 3, centre: 'Lema largo', use: 'info'}).comp);
    }
    assert.equal(comps.indexOf('titular'), -1, 'no sentence of its own closer than 8 m');
});

test('on a screen with a place, the wide zone takes turns: the picture, then the place\'s card', () => {
    const c = new Composer();
    const q = [wide('w'), tall('a'), wide('v'), tall('b')];
    const zones = [];
    for (let i = 0; i < 40; i++) {
        const r = c.next(q, 3, true, {weather: true, place: true, use: 'info'});
        if (r.comp === 'zonas') {
            zones.push(r.extra.place ? 'ficha' : 'foto:' + r.items[0].id);
        }
    }
    assert.ok(zones.length >= 4, zones.join(' '));
    zones.forEach((z, k) => {
        assert.equal(z === 'ficha', k % 2 === 1, zones.join(' '));
    });
    // Without a place, always the picture.
    const plain = new Composer();
    for (let i = 0; i < 40; i++) {
        const r = plain.next(q, 3, true, {weather: true, use: 'info'});
        if (r.comp === 'zonas') {
            assert.equal(r.extra.place, false);
        }
    }
});
