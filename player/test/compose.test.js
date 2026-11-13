// The rule table of the compositions and the agenda of the coming days, without a page.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Composer, shapeOf, secondsOf, draftChoice} from '../src/compose.js';
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
        {id: 'a', title: '5º Pri - Acampada', start: '2026-11-09T08:00', end: '2026-11-11T16:00', color: 3, icon: ''},
        {id: 'b', title: '3º ESO - Acampada', start: '2026-11-03T08:00', end: '2026-11-06T16:00'},
        {id: 'c', title: 'Teatro', start: '2026-11-02T10:00', end: '2026-11-02T12:00'},
        {id: 'd', title: 'Mañana mismo', start: '2026-11-01T08:00', end: '2026-11-03T16:00'},
    ];
    // The colour comes from the centre's categories (here, a school's), or is 0 without them.
    const cats = [{n: 3, words: ['eso']}];
    assert.deepEqual(countdown(events, '2026-10-31', 14, cats), {id: 'b', days: 3, title: 'Acampada', group: '3º ESO',
        date: '2026-11-03', color: 3, icon: ''});
    assert.equal(countdown(events, '2026-10-31', 14).color, 0);
    assert.equal(countdown(events, '2026-11-09', 14), null);
});

test('what the centre asks of a picture goes before its shape: over the whole screen, at its turn', () => {
    const c = new Composer();
    c.sinceFull = -100;
    const square = {id: 'a', type: 'image', layout: 'full', media: {width: 1000, height: 1000}};
    assert.equal(c.next([square], 3, true).comp, 'foto-completa');
    const same = {id: 'b', type: 'image', media: {width: 1000, height: 1000}};
    assert.notEqual(new Composer().next([same], 3, true).comp, 'foto-completa');
});

test('no more than two portrait pictures with «Today» running, while «Today» has something else to show', () => {
    const tall = (id) => ({id, type: 'image', media: {width: 900, height: 1200}});
    const c = new Composer();
    c.sinceFull = -100;
    const out = [];
    for (let i = 0; i < 12; i++) {
        out.push(c.next([tall('a'), wide('b'), tall('c'), tall('d')], 3, true).comp);
    }
    for (let i = 2; i < out.length; i++) {
        assert.ok(!(out[i] === 'vertical-hoy' && out[i - 1] === 'vertical-hoy' && out[i - 2] === 'vertical-hoy'), out.join(' '));
    }
});

test('the coming days are the agenda, with no week table, and it comes less often with little in the week', () => {
    const run = (things, agenda) => {
        const c = new Composer();
        c.sinceFull = -100;
        const out = [];
        for (let i = 1; i <= 24; i++) {
            out.push(c.next([wide('a'), wide('b')], 3, true, {week: {things, weekday: 1}, agenda}).comp);
        }
        return out;
    };
    const count = (list) => list.filter((comp) => comp === 'agenda').length;
    assert.ok(count(run(1, true)) > 0 && count(run(1, true)) < count(run(9, true)));
    assert.equal(count(run(9, false)), 0);
    assert.ok(!run(9, true).includes('semana'));
});

test('the agenda every 8 slides, every 5 on Mondays and Fridays, only with something to come', () => {
    const run = (weekday, slides, agenda) => {
        const c = new Composer();
        c.sinceFull = -100;
        const out = [];
        for (let i = 1; i <= slides; i++) {
            out.push(c.next([wide('a'), wide('b')], 3, true, {week: {things: 9, weekday}, agenda}).comp);
        }
        return out;
    };
    const wed = run(3, 16, true);
    assert.equal(wed.indexOf('agenda') + 1, 8);
    const mon = run(1, 16, true);
    assert.equal(mon.indexOf('agenda') + 1, 5);
    assert.equal(run(3, 20, false).indexOf('agenda'), -1);
    // Never right after the moment of «Today».
    for (const list of [wed, mon]) {
        for (let i = 1; i < list.length; i++) {
            if (list[i] === 'agenda') {
                assert.notEqual(list[i - 1], 'solo-hoy');
            }
        }
    }
});

test('portrait pictures in a row go together, up to three; a video never', () => {
    const portrait = (id, type) => ({id, type: type || 'image', media: {width: 576, height: 1024}});
    const one = new Composer().next([portrait('a'), wide('w')], 3, true, {});
    assert.equal(one.comp, 'vertical-hoy');
    const two = new Composer().next([portrait('a'), portrait('b')], 3, true, {});
    assert.equal(two.comp, 'dos-verticales');
    const three = new Composer().next([portrait('a'), portrait('b'), portrait('c'), portrait('d')], 3, true, {});
    assert.equal(three.comp, 'tres-verticales');
    assert.deepEqual(three.items.map((x) => x.id), ['a', 'b', 'c']);
    const video = new Composer().next([portrait('a'), portrait('b'), portrait('v', 'video')], 3, true, {});
    assert.equal(video.comp, 'dos-verticales');
});

test('without pictures, «Today» and the agenda take turns', () => {
    const c = new Composer();
    const out = [];
    for (let i = 0; i < 6; i++) {
        out.push(c.next([], 3, true, {week: {things: 5, weekday: 3}, agenda: true}).comp);
    }
    assert.deepEqual(out, ['solo-hoy', 'solo-hoy', 'agenda', 'solo-hoy', 'solo-hoy', 'agenda']);
});


test('a draft in the preview stands where it would go', () => {
    const photo = {id: 'draft', type: 'image', media: {width: 1600, height: 900}};
    const tall = {id: 'draft', type: 'image', media: {width: 600, height: 900}};
    const thin = {id: 'draft', type: 'image', media: {width: 500, height: 1000}};
    const notice = {id: 'draft', type: 'notice'};
    assert.deepEqual(draftChoice(photo, 'main', [], true), {comp: 'foto-hoy', items: [photo], seconds: 0});
    assert.equal(draftChoice(photo, 'full', [], true).comp, 'foto-completa');
    assert.equal(draftChoice(tall, 'main', [], true).comp, 'vertical-hoy');
    assert.equal(draftChoice(thin, 'main', [], false).comp, 'foto-sola');
    assert.deepEqual(draftChoice(notice, 'main', [photo], true).items, [photo]);
    assert.equal(draftChoice(notice, 'main', [], true).comp, 'solo-hoy');
    assert.equal(draftChoice(notice, 'today', [photo], true).comp, 'solo-hoy');
    assert.equal(draftChoice({id: 'draft', type: 'event'}, 'week', [photo], true).comp, 'agenda');
});

test('birthdays come at once and every seven slides, each time the next page; the library, one in sixteen', () => {
    const c = new Composer();
    const birthdays = {id: 'b', type: 'birthdays', people: [{name: 'A'}]};
    const books = {id: 'l', type: 'books', books: [{title: 'T'}]};
    const seen = [];
    for (let i = 0; i < 40; i++) {
        seen.push(c.next([], 4, true, {birthdays, books, distance: 3}));
    }
    assert.equal(seen[0].comp, 'cumple');
    assert.deepEqual(seen[0].extra, {item: birthdays, page: 0});
    const cumple = seen.filter((x) => x.comp === 'cumple');
    const biblioteca = seen.filter((x) => x.comp === 'biblioteca');
    assert.ok(cumple.length >= 5 && cumple.length <= 6, 'birthdays: ' + cumple.length);
    assert.ok(biblioteca.length >= 2 && biblioteca.length <= 3, 'library: ' + biblioteca.length);
    assert.equal(cumple[1].extra.page, 1);
    assert.equal(biblioteca[1].extra.page, 1);
});

test('a showcase has neither birthdays nor the library', () => {
    const c = new Composer();
    const seen = [];
    for (let i = 0; i < 20; i++) {
        seen.push(c.next([], 4, true, {use: 'showcase', birthdays: {id: 'b'}, books: {id: 'l'}}).comp);
    }
    assert.ok(!seen.includes('cumple') && !seen.includes('biblioteca'));
});

test('what falls due has its slide, the next page each time, one in twelve', () => {
    const c = new Composer();
    const deadlines = {id: 'd', type: 'deadlines', days: [{date: '2026-11-05', items: [{course: 'A', activity: 'B', kind: 'due'}]}]};
    const seen = [];
    for (let i = 0; i < 40; i++) {
        seen.push(c.next([], 4, true, {deadlines, distance: 3}));
    }
    const plazos = seen.filter((x) => x.comp === 'plazos');
    assert.ok(plazos.length >= 3 && plazos.length <= 4, 'deadlines: ' + plazos.length);
    assert.equal(plazos[0].extra.page, 0);
    assert.equal(plazos[1].extra.page, 1);
});

test('with nothing at all to show, a screen at rest, with its code only while the centre has put nothing', () => {
    const c = new Composer();
    const one = c.next([], 0, true, {distance: 3, idleQr: 'https://example.org/panel'});
    assert.equal(one.comp, 'reposo');
    assert.deepEqual(one.extra, {qr: 'https://example.org/panel'});
    assert.equal(new Composer().next([], 0, true, {distance: 3}).extra.qr, null);
    // With the QR the site's link shortener draws for it, that picture too.
    const drawn = {id: 9, url: 'https://example.org/qr', sha1: 'abc'};
    assert.deepEqual(new Composer().next([], 0, true, {distance: 3, idleQr: 'https://s.example/x', idleQrImage: drawn}).extra,
        {qr: 'https://s.example/x', qrimage: drawn});
    // A sentence for the ticker, or anything for «Today», and it is no longer at rest.
    assert.equal(new Composer().next([], 0, true, {distance: 3, phrases: ['Hola']}).comp, 'solo-hoy');
    assert.equal(new Composer().next([], 1, true, {distance: 3}).comp, 'solo-hoy');
});

test('the tables take turns, each with its own page', () => {
    const c = new Composer();
    const tables = [{id: 'a', type: 'table'}, {id: 'b', type: 'table'}];
    const seen = [];
    for (let i = 0; i < 40; i++) {
        seen.push(c.next([], 4, true, {tables, distance: 3}));
    }
    const shown = seen.filter((x) => x.comp === 'tabla').map((x) => x.extra.item.id + x.extra.page);
    assert.deepEqual(shown.slice(0, 4), ['a0', 'b0', 'a1', 'b1']);
});

test('the QR codes the site\'s link shortener draws are kept like any picture', async () => {
    const {mediaOf} = await import('../src/media.js');
    const qr = (n) => ({id: n, url: 'https://example.org/qr/' + n, sha1: 'q' + n});
    const shas = mediaOf({
        idle: {qr: 'https://s.example/start', qrimage: qr(1)},
        items: [
            {id: 'p', media: {id: 2, url: 'https://example.org/p', sha1: 'p'}, web: 'https://s.example/a', webqr: qr(3),
                album: {id: 'a1', web: 'https://s.example/b', webqr: qr(4)}},
            {id: 'b', type: 'books', books: [{title: 'Uno', web: 'https://s.example/c', webqr: qr(5)}]},
        ],
    }).map((m) => m.sha1).sort();
    assert.deepEqual(shas, ['p', 'q1', 'q3', 'q4', 'q5']);
});

test('from afar, on a landscape screen, two portraits go one at a time, never as a pair (Jujol, 13 November 2026)', () => {
    const near = new Composer();
    near.sinceFull = -100;
    assert.equal(near.next([tall('a'), tall('b')], 3, true, {distance: 3}).comp, 'dos-verticales');
    const far = new Composer();
    far.sinceFull = -100;
    const first = far.next([tall('a'), tall('b')], 3, true, {distance: 8});
    assert.notEqual(first.comp, 'dos-verticales');
    assert.equal(first.items.length, 1);
});

test('the big birthday slide waits while its photos are on their way, and comes as soon as they are there', () => {
    const c = new Composer();
    const birthdays = {id: 'b', type: 'birthdays', people: [{name: 'A', photo: {sha1: 'x'}}]};
    const waiting = [];
    for (let i = 0; i < 10; i++) {
        waiting.push(c.next([], 4, true, {birthdays, birthdaysReady: false, distance: 3}).comp);
    }
    assert.ok(!waiting.includes('cumple'), waiting.join(' '));
    assert.equal(c.next([], 4, true, {birthdays, birthdaysReady: true, distance: 3}).comp, 'cumple');
});

