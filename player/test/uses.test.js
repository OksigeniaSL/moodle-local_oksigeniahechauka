// What a screen is for now, which composition each use shows, the QR of a web, the agenda that scrolls and its month.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {useOf} from '../src/rules.js';
import {Composer, draftChoice} from '../src/compose.js';
import {qrPath, shortWeb} from '../src/qr.js';
import {agendaOf, monthOf} from '../src/agenda.js';

const at = (dow, hm) => ({dow, min: parseInt(hm.slice(0, 2), 10) * 60 + parseInt(hm.slice(3), 10)});

test('the use now: its own, or another one at some hours', () => {
    assert.equal(useOf({}, at(1, '10:00')), 'info');
    assert.equal(useOf({use: 'nonsense'}, at(1, '10:00')), 'info');
    assert.equal(useOf({use: 'mixed'}, at(1, '10:00')), 'mixed');
    // An entrance: informative on weekdays, a showcase the whole weekend.
    const gate = {use: 'info', useplan: [{days: [6, 7], from: '00:00', until: '24:00', use: 'showcase'}]};
    assert.equal(useOf(gate, at(5, '23:59')), 'info');
    assert.equal(useOf(gate, at(6, '00:00')), 'showcase');
    assert.equal(useOf(gate, at(7, '21:30')), 'showcase');
    assert.equal(useOf(gate, at(1, '08:00')), 'info');
    // Evenings, every day, crossing midnight.
    const evenings = {use: 'info', useplan: [{days: [], from: '18:00', until: '08:00', use: 'showcase'}]};
    assert.equal(useOf(evenings, at(3, '07:59')), 'showcase');
    assert.equal(useOf(evenings, at(3, '12:00')), 'info');
});

const photo = (id, w, h, more) => Object.assign({id, type: 'image', media: {width: w || 1920, height: h || 1080}}, more);

test('a showcase shows only pictures and videos over the whole screen, longer with a web to scan', () => {
    const c = new Composer();
    const queue = [photo('a'), photo('b', 1080, 1920), photo('c', 1920, 1080, {web: 'https://example.com/camp'})];
    const seen = [];
    for (let i = 0; i < 6; i++) {
        const ch = c.next(queue, 5, true, {use: 'showcase', menu: true, week: {things: 9, weekday: 1}});
        seen.push(ch.comp + ':' + ch.items.map((x) => x.id).join() + ':' + ch.seconds);
    }
    assert.deepEqual(seen, ['escaparate:a:10', 'escaparate:b:10', 'escaparate:c:15', 'escaparate:a:10',
        'escaparate:b:10', 'escaparate:c:15']);
    assert.equal(new Composer().next([], 5, true, {use: 'showcase'}).comp, 'escaparate');
    assert.equal(draftChoice(photo('d'), 'main', [], true, 'showcase').comp, 'escaparate');
});

test('a mixed screen puts the weather in a third every other slide, when there is weather', () => {
    const c = new Composer();
    const queue = [photo('a'), photo('b'), photo('c')];
    const comps = [];
    for (let i = 0; i < 6; i++) {
        comps.push(c.next(queue, 2, true, {use: 'mixed', weather: true}).comp);
    }
    assert.equal(comps.filter((x) => x === 'tiempo-tercio').length, 3);
    const none = new Composer();
    for (let i = 0; i < 6; i++) {
        assert.notEqual(none.next(queue, 2, true, {use: 'mixed', weather: false}).comp, 'tiempo-tercio');
    }
});

test('the QR of a web: a square of dark modules with its three finders, the same for the same text', () => {
    const q = qrPath('https://example.com/summer-camp');
    assert.equal(q.size, 29);
    assert.ok(q.d.startsWith('M0 0h7v1h-7z'));
    assert.deepEqual(qrPath('https://example.com/summer-camp'), q);
    assert.notDeepEqual(qrPath('https://example.com/other').d, q.d);
    assert.equal(shortWeb('https://www.example.com/camp/'), 'example.com/camp');
    assert.equal(shortWeb('http://example.com'), 'example.com');
});

const S = {
    days: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    days_short: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
        'noviembre', 'diciembre'],
    months_short: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    today: 'Hoy', tomorrow: 'Mañana',
    categories: [{n: 2, words: ['pri']}, {n: 3, words: ['eso']}],
};

test('the agenda that scrolls: by day, into the next month, with a top of events', () => {
    const events = [
        {title: 'Claustro', start: '2026-11-27T17:00'},
        {title: '3º ESO - Acampada', start: '2026-11-26T09:00', end: '2026-11-29T17:00'},
        {title: '4º Pri - Teatro', start: '2026-11-28T10:30'},
        {title: 'Festival de invierno', start: '2026-12-03', allday: true},
        {title: 'Ayer', start: '2026-11-26T10:00'},
        {title: 'Muy lejos', start: '2027-01-20T10:00'},
    ];
    const a = agendaOf(events, '2026-11-27', 30, 10, S);
    assert.deepEqual(a.days.map((d) => d.date + ' ' + d.label + ' ' + d.month), ['2026-11-27 Hoy noviembre',
        '2026-11-28 Mañana ', '2026-12-03  diciembre']);
    // The camp started before: on today's day, without its hour, saying until when.
    assert.deepEqual(a.days[0].events.map((e) => [e.time, e.title, e.color, e.until]), [['', 'Acampada', 3, 'dom 29'],
        ['17:00', 'Claustro', 0, '']]);
    assert.equal(a.days[1].events[0].color, 2);
    assert.equal(a.days[2].weekday, 'jueves');
    assert.equal(a.count, 4);
    assert.equal(a.more, 0);
    const top = agendaOf(events, '2026-11-27', 30, 2, S);
    assert.equal(top.count, 2);
    assert.equal(top.more, 2);
});

test('the month above the agenda: Monday first, today, the past, and the colours of each day', () => {
    const m = monthOf('2026-11-27', '2026-11-27', [
        {title: '3º ESO - Acampada', start: '2026-11-26T09:00', end: '2026-11-29T17:00'},
        {title: '4º Pri - Teatro', start: '2026-11-28T10:30'},
        {title: 'Claustro', start: '2026-11-28T17:00'},
    ], S.categories);
    assert.equal(m.month, 11);
    assert.equal(m.weeks.length, 6);
    // 1 November 2026 is a Sunday: six empty days before it.
    assert.deepEqual(m.weeks[0].slice(0, 7).map((d) => d && d.day), [null, null, null, null, null, null, 1]);
    const day = (n) => m.weeks.flat().find((d) => d && d.day === n);
    assert.equal(day(27).today, true);
    assert.equal(day(26).past, true);
    assert.deepEqual(day(28).marks, [3, 2, 0]);
    assert.deepEqual(day(30).marks, []);
});
