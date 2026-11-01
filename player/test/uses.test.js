// What a screen is for now, which composition each use shows, the QR of a web, the agenda that scrolls and its month.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {useOf} from '../src/rules.js';
import {Composer, draftChoice} from '../src/compose.js';
import {qrPath, shortWeb} from '../src/qr.js';
import {agendaOf, monthOf} from '../src/agenda.js';
import {leadsOf, menuLabel, menuParts, weekHeadline} from '../src/lead.js';
import {albumsOf, oneOfEachAlbum} from '../src/photos.js';

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
    today: 'Hoy', tomorrow: 'Mañana', until: 'hasta el', until_tomorrow: 'hasta mañana', date_format: '{d} de {m}',
    categories: [{n: 2, words: ['pri']}, {n: 3, words: ['eso']}],
};

test('the agenda that scrolls: by day, into the next month, with a top of events', () => {
    const events = [
        {title: 'Claustro', start: '2026-11-27T17:00'},
        {title: '3º ESO - Acampada', start: '2026-11-26T09:00', end: '2026-11-29T17:00'},
        {title: '4º Pri - Teatro', start: '2026-11-28T10:30'},
        {title: 'Festival de invierno', start: '2026-12-03', allday: true},
        {title: 'Festivo - Fiesta local', start: '2026-12-07', end: '2026-12-08T23:59', allday: true},
        {title: 'Viaje de fin de curso', start: '2026-11-30T08:00', end: '2026-12-04T16:00'},
        {title: 'Ayer', start: '2026-11-26T10:00'},
        {title: 'Muy lejos', start: '2027-01-20T10:00'},
    ];
    const a = agendaOf(events, '2026-11-27', 30, 10, S);
    assert.deepEqual(a.days.map((d) => d.date + ' ' + d.label + ' ' + d.month), ['2026-11-27 Hoy noviembre',
        '2026-11-28 Mañana ', '2026-11-30  ', '2026-12-03  diciembre', '2026-12-07  ']);
    // The camp started before: on today's day, without its hour, saying until when.
    assert.deepEqual(a.days[0].events.map((e) => [e.time, e.title, e.color, e.until]),
        [['', 'Acampada', 3, 'hasta el domingo'], ['17:00', 'Claustro', 0, '']]);
    assert.equal(a.days[1].events[0].color, 2);
    assert.equal(a.days[3].weekday, 'jueves');
    // Into another month, the date; a holiday apart, without counting.
    assert.equal(a.days[2].events[0].until, 'hasta el 4 de diciembre');
    assert.deepEqual(a.days[4].holiday, {label: 'Festivo', name: 'Fiesta local', until: 'hasta el martes'});
    assert.deepEqual(a.days[4].events, []);
    assert.equal(a.days[3].far, 6);
    assert.equal(a.last, '2026-12-26');
    assert.equal(a.count, 5);
    assert.equal(a.more, 0);
    const top = agendaOf(events, '2026-11-27', 30, 2, S);
    assert.equal(top.count, 2);
    assert.equal(top.more, 3);
});

test('the month above the agenda: Monday first, today, the past, and the colours of each day', () => {
    const m = monthOf('2026-11-27', '2026-11-27', [
        {title: '3º ESO - Acampada', start: '2026-11-26T09:00', end: '2026-11-29T17:00'},
        {title: '4º Pri - Teatro', start: '2026-11-28T10:30'},
        {title: 'Claustro', start: '2026-11-28T17:00'},
        {title: 'Festivo - Fiesta local', start: '2026-11-30', allday: true},
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
    assert.equal(day(30).holiday, true);
    assert.equal(day(28).holiday, false);
    assert.equal(day(28).date, '2026-11-28');
});

test('by the distance: no week from 5 m; from 8 m no thirds, and the sentences as slides of their own', () => {
    const queue = [photo('a'), photo('b'), photo('c')];
    const week = {things: 9, weekday: 2};
    const run = (opts, n) => {
        const c = new Composer();
        const out = [];
        for (let i = 0; i < n; i++) {
            out.push(c.next(queue, 4, true, opts));
        }
        return out;
    };
    assert.ok(run({distance: 3, week}, 16).some((x) => x.comp === 'semana'));
    assert.ok(!run({distance: 5, week}, 16).some((x) => x.comp === 'semana'));
    const far = run({distance: 8, week, phrases: ['Uno', 'Dos'], countdown: true}, 16);
    assert.ok(!far.some((x) => x.comp === 'semana' || x.comp === 'foto-hoy'));
    const types = far.filter((x) => x.comp === 'titular').map((x) => x.extra.type + ':' + (x.extra.text || ''));
    assert.deepEqual(types, ['frase:Uno', 'frase:Dos', 'cuenta:', 'frase:Uno']);
});

test('a landscape video goes to its own place: two thirds with its band, or the whole screen from afar', () => {
    const video = {id: 'v', type: 'video', media: {width: 1920, height: 1080, duration: 20}};
    const c = new Composer();
    c.sinceFull = 0;
    assert.equal(c.next([video], 3, true, {distance: 3}).comp, 'apaisado');
    const f = new Composer();
    f.sinceFull = 0;
    assert.equal(f.next([video], 3, true, {distance: 8}).comp, 'foto-completa');
});

test('what leads, in order; the main dish of a menu; what the week strip says', () => {
    const today = {
        menu: {label: 'Menú', courses: [{label: 'Primero', dishes: ['Crema']}, {label: 'Segundo', dishes: ['Merluza', 'Tortilla']},
            {label: 'Postre', dishes: ['Fruta']}]},
        notices: [{title: 'Fotos', tone: 'normal'}, {title: 'Salida', tone: 'important'}],
        events: [{time: '10:30', title: 'Teatro'}, {time: '12:00', title: 'Charla'}],
        countdown: {days: 12, title: 'Puertas abiertas', date: '2026-11-14'},
        upcoming: [{date: '2026-11-05', title: 'Día del deporte'}],
    };
    const order = (x) => x.map((p) => p.type + (p.notice ? ':' + p.notice.title : ''));
    assert.deepEqual(order(leadsOf(today)), ['notice:Salida', 'menu', 'event', 'countdown', 'notice:Fotos']);
    // Around midday the menu goes first.
    assert.deepEqual(order(leadsOf(today, true)).slice(0, 2), ['menu', 'notice:Salida']);
    assert.deepEqual(leadsOf({}), []);
    const parts = menuParts(today.menu);
    assert.equal(parts.main, 'Merluza · Tortilla');
    assert.deepEqual(parts.others.map((o) => o.label), ['Primero', 'Postre']);
    assert.equal(menuParts({courses: [{label: 'Único', dishes: ['Paella']}]}).main, 'Paella');
    assert.equal(menuLabel({label: 'Menú de hoy', name: 'Infantil'}), 'Menú de hoy · Infantil');
    assert.equal(menuLabel({label: 'Menú de hoy', name: ''}), 'Menú de hoy');
    assert.equal(menuLabel({label: 'Menú de hoy', name: 'Menú C (vegetariano)'}), 'Menú de hoy · C (vegetariano)');
    // The strip: the nearest event, or a big one of the next days.
    assert.equal(weekHeadline(today, S.days), 'jueves 5: Día del deporte');
    const soon = Object.assign({}, today, {countdown: {days: 3, title: 'Acampada', date: '2026-11-06'}});
    assert.equal(weekHeadline(soon, S.days), 'viernes 6: Acampada');
    assert.equal(weekHeadline({}, S.days), '');
});

test('the agenda takes the turn of the coming days: always from afar; from close, all but Mondays and Fridays', () => {
    const queue = [photo('a'), photo('b'), photo('c')];
    const run = (opts, n) => {
        const c = new Composer();
        const out = [];
        for (let i = 0; i < n; i++) {
            out.push(c.next(queue, 4, true, opts).comp);
        }
        return out;
    };
    const tuesday = {things: 9, weekday: 2};
    const friday = {things: 9, weekday: 5};
    assert.ok(run({distance: 3, week: tuesday, agenda: true}, 16).includes('agenda'));
    assert.ok(!run({distance: 3, week: tuesday, agenda: true}, 16).includes('semana'));
    assert.ok(run({distance: 3, week: friday, agenda: true}, 16).includes('semana'));
    assert.ok(!run({distance: 3, week: friday, agenda: true}, 16).includes('agenda'));
    assert.ok(run({distance: 5, week: friday, agenda: true}, 16).includes('agenda'));
    assert.ok(run({distance: 8, week: friday, agenda: true}, 16).includes('agenda'));
    assert.ok(!run({distance: 8, week: friday, agenda: true}, 16).includes('semana'));
    // Nothing in thirty days: it does not come.
    assert.ok(!run({distance: 5, week: friday, agenda: false}, 16).includes('agenda'));
});

test('an album: in a third from close with three photos, a wall from four; never a third from afar', () => {
    const queue = [photo('a'), photo('b'), photo('c')];
    const run = (opts, n) => {
        const c = new Composer();
        const out = [];
        for (let i = 0; i < n; i++) {
            out.push(c.next(queue, 4, true, opts));
        }
        return out;
    };
    const with3 = [{id: 'x', count: 3}];
    const with5 = [{id: 'x', count: 5}];
    const near = run({distance: 3, albums: with3}, 14).filter((x) => x.comp === 'fotos-tercio');
    assert.ok(near.length >= 1);
    assert.equal(near[0].extra.album, 'x');
    assert.equal(near[0].items.length, 0);
    assert.ok(!run({distance: 8, albums: with5}, 14).some((x) => x.comp === 'fotos-tercio'));
    assert.ok(!run({distance: 3, albums: [{id: 'y', count: 2}]}, 14).some((x) => x.comp === 'fotos-tercio'));
    const mixed = run({use: 'mixed', distance: 8, albums: with5}, 12).filter((x) => x.comp === 'muro');
    assert.equal(mixed.length, 1);
    assert.ok(!run({use: 'mixed', distance: 3, albums: with3}, 12).some((x) => x.comp === 'muro'));
    // A showcase: one slide in four, as a poster.
    const walls = run({use: 'showcase', albums: with5}, 8).filter((x) => x.comp === 'muro');
    assert.equal(walls.length, 2);
    assert.equal(walls[0].extra.poster, true);
});

test('an album takes the turn of one thing, gives the next photo each time and says what it is', () => {
    const album = {id: 'a1', name: 'Salidas', headline: 'Salidas', subtitle: 'Este curso', web: 'https://example.org'};
    const photo = (id, extra) => Object.assign({id, type: 'image', media: {width: 3, height: 2, url: id}, album}, extra);
    const alone = {id: 'x', type: 'image', media: {width: 3, height: 2}};
    const queue = [photo('p1'), alone, photo('p2', {caption: {title: 'Su texto'}}), photo('p3')];
    const turn = (n) => oneOfEachAlbum(queue, {a1: n});
    assert.deepEqual(turn(0).map((it) => it.id), ['album-a1', 'x']);
    assert.equal(turn(0)[0].media.url, 'p1');
    assert.equal(turn(1)[0].media.url, 'p2');
    assert.equal(turn(3)[0].media.url, 'p1');
    assert.deepEqual(turn(0)[0].caption, {title: 'Salidas', text: 'Este curso'});
    assert.equal(turn(1)[0].caption.title, 'Su texto');
    assert.equal(turn(0)[0].web, 'https://example.org');
    assert.equal(turn(0)[1], alone);
    // The third and the wall still have all of them.
    assert.equal(albumsOf(queue, (m) => m.url)[0].photos.length, 3);
});
