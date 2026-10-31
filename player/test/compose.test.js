// The rule table of the compositions and the agenda of the coming days, without a page.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Composer, shapeOf, secondsOf} from '../src/compose.js';
import {countdown, dayLabel, splitTitle, upcoming} from '../src/agenda.js';

function pic(id, w, h, type) {
    return {id, type: type || 'image', media: {width: w, height: h}};
}

const wide = (id) => pic(id, 1920, 1080);
const tall = (id) => pic(id, 1080, 1920);

test('shapes of the slots', () => {
    assert.equal(shapeOf(wide('a')), null);
    assert.equal(shapeOf(pic('a', 1000, 1000)), '1x1');
    assert.equal(shapeOf(pic('a', 900, 1200)), '3x4');
    assert.equal(shapeOf(pic('a', 800, 1200)), '2x3');
    assert.equal(shapeOf(tall('a')), '9x16');
    assert.equal(shapeOf({id: 'x'}), null);
});

test('durations: ten seconds, its own, or the video and its caption', () => {
    assert.equal(secondsOf(wide('a')), 10);
    assert.equal(secondsOf({...wide('a'), duration: 20}), 20);
    assert.equal(secondsOf({id: 'v', type: 'video', media: {duration: 31}}), 34);
});

test('without pictures, «Today» alone; with nothing at all too', () => {
    const c = new Composer();
    assert.equal(c.next([], 3, true).comp, 'solo-hoy');
    assert.equal(c.next([], 3, true, {menu: true}).seconds, 15);
});

test('a landscape picture goes with «Today», a portrait one in its slot, two portrait ones together', () => {
    const c = new Composer();
    c.sinceFull = -100;
    assert.equal(c.next([wide('a')], 3, true).comp, 'foto-hoy');
    const two = c.next([tall('b'), tall('c')], 3, true);
    assert.equal(two.comp, 'dos-verticales');
    assert.deepEqual(two.items.map((i) => i.id), ['b', 'c']);
    assert.equal(c.next([tall('b'), wide('d')], 3, true).comp, 'vertical-hoy');
});

test('a video never goes in a pair', () => {
    const c = new Composer();
    c.sinceFull = -100;
    const r = c.next([pic('v', 1080, 1920, 'video'), tall('b')], 3, true);
    assert.equal(r.comp, 'vertical-hoy');
    assert.equal(r.items[0].id, 'v');
});

test('the queue goes on after the last one shown, wherever it is now', () => {
    const c = new Composer();
    c.sinceFull = -100;
    const q = [wide('a'), wide('b'), wide('c')];
    assert.equal(c.next(q, 3, true).items[0].id, 'a');
    assert.equal(c.next(q, 3, true).items[0].id, 'b');
    assert.equal(c.next([wide('b'), wide('c')], 3, true).items[0].id, 'c');
    assert.equal(c.next([wide('a')], 3, true).items[0].id, 'a');
});

test('the full screen comes for a wide picture once more than three have passed, not after «Today»', () => {
    const c = new Composer();
    const q = [wide('a'), wide('b'), wide('c'), wide('d'), wide('e'), wide('f')];
    const comps = [];
    for (let i = 0; i < 6; i++) {
        comps.push(c.next(q, 2, true).comp);
    }
    assert.equal(comps[0], 'foto-completa');
    assert.deepEqual(comps.slice(1, 4), ['foto-hoy', 'foto-hoy', 'foto-hoy']);
    assert.equal(comps[4], 'foto-completa');
});

test('the moment of «Today» comes every 4, 6 or 8 slides by how much it has', () => {
    for (const [h, every] of [[1, 8], [4, 6], [7, 4]]) {
        const c = new Composer();
        c.sinceFull = -100;
        const slots = [];
        for (let i = 1; i <= 16; i++) {
            if (c.next([wide('a'), wide('b')], h, true).comp === 'solo-hoy') {
                slots.push(i);
            }
        }
        assert.equal(slots[0], every, 'h=' + h);
    }
});

test('a screen without «Today» shows the pictures alone and never the moment of «Today»', () => {
    const c = new Composer();
    c.sinceFull = -100;
    const comps = new Set();
    for (let i = 0; i < 12; i++) {
        comps.add(c.next([wide('a'), wide('b')], 5, true, {noToday: true}).comp);
    }
    assert.deepEqual([...comps], ['foto-sola']);
});

test('a vertical screen: a 9:16 picture fills the body, a landscape one goes with «Today»', () => {
    const c = new Composer();
    c.sinceFull = -100;
    assert.equal(c.next([tall('a')], 3, false).comp, 'foto-sola');
    assert.equal(c.next([wide('b')], 3, false).comp, 'foto-hoy');
});

test('titles split on « - »', () => {
    assert.deepEqual(splitTitle('3º ESO - Acampada'), {title: 'Acampada', group: '3º ESO'});
    assert.deepEqual(splitTitle('🎃 Halloween'), {title: '🎃\u00a0Halloween', group: ''});
    assert.deepEqual(splitTitle('4º Pri C - Residencia - día 2'), {title: 'Residencia - día 2', group: '4º Pri C'});
});

const S = {tomorrow: 'Mañana', days_short: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    months_short: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']};

test('the day of a coming event', () => {
    assert.equal(dayLabel('2026-11-03', '2026-11-02', S), 'Mañana');
    assert.equal(dayLabel('2026-11-05', '2026-11-02', S), 'Jue 5');
    assert.equal(dayLabel('2026-12-01', '2026-11-28', S), 'Mar 1 dic');
});

test('the coming days: after today, within the week, in order, the same day not repeated', () => {
    const events = [
        {id: 'e1', type: 'event', title: '🎃 Halloween', start: '2026-10-31T00:00', allday: true},
        {id: 'e2', type: 'event', title: '4º Pri C - Residencia', start: '2026-11-05T10:00', color: 2},
        {id: 'e3', type: 'event', title: '3º ESO - Acampada', start: '2026-11-03T08:00', end: '2026-11-06T16:00'},
        {id: 'e4', type: 'event', title: 'Teatro', start: '2026-11-05T12:00'},
        {id: 'e5', type: 'event', title: 'Lejos', start: '2026-11-20T09:00'},
    ];
    const rows = upcoming(events, '2026-10-31', 7, S);
    assert.deepEqual(rows.map((r) => r.id), ['e3', 'e2', 'e4']);
    assert.equal(rows[0].day, 'Mar 3 nov');
    assert.equal(rows[0].title, 'Acampada');
    assert.equal(rows[0].group, '3º ESO');
    assert.equal(rows[1].color, 2);
    assert.equal(rows[2].sameDay, true);
});

test('one countdown, for the nearest event of more than a day, from two to fourteen days ahead', () => {
    const events = [
        {id: 'a', title: '5º Pri - Acampada', start: '2026-11-09T08:00', end: '2026-11-11T16:00', color: 3},
        {id: 'b', title: '3º ESO - Acampada', start: '2026-11-03T08:00', end: '2026-11-06T16:00'},
        {id: 'c', title: 'Teatro', start: '2026-11-02T10:00', end: '2026-11-02T12:00'},
        {id: 'd', title: 'Mañana mismo', start: '2026-11-01T08:00', end: '2026-11-03T16:00'},
    ];
    assert.deepEqual(countdown(events, '2026-10-31', 14), {id: 'b', days: 3, title: 'Acampada', group: '3º ESO',
        date: '2026-11-03', color: 3});
    assert.equal(countdown(events, '2026-11-09', 14), null);
});

test('«La semana» every 8 slides, every 5 on Mondays and Fridays, only with something beyond today', () => {
    const run = (weekday, things, slides) => {
        const c = new Composer();
        c.sinceFull = -100;
        const out = [];
        for (let i = 1; i <= slides; i++) {
            out.push(c.next([wide('a'), wide('b')], 3, true, {week: {things, weekday}}).comp);
        }
        return out;
    };
    const wed = run(3, 4, 16);
    assert.equal(wed.indexOf('semana') + 1, 8);
    const mon = run(1, 4, 16);
    assert.equal(mon.indexOf('semana') + 1, 5);
    assert.equal(run(3, 0, 20).indexOf('semana'), -1);
    // Never right after the moment of «Today».
    for (const list of [wed, mon]) {
        for (let i = 1; i < list.length; i++) {
            if (list[i] === 'semana') {
                assert.notEqual(list[i - 1], 'solo-hoy');
            }
        }
    }
});

test('without pictures, «Today» and the week take turns', () => {
    const c = new Composer();
    const out = [];
    for (let i = 0; i < 6; i++) {
        out.push(c.next([], 3, true, {week: {things: 5, weekday: 3}}).comp);
    }
    assert.deepEqual(out, ['solo-hoy', 'solo-hoy', 'semana', 'solo-hoy', 'solo-hoy', 'semana']);
});

