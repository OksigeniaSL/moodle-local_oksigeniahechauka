// The panel's page to add content (panel/compose.js): «Cuándo» as dates and as a sentence, the strip, the draft.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {windowOf, sentence, strip, draftItem, addDays} = require('../../panel/compose.js');

const S = {
    days: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
        'noviembre', 'diciembre'],
    letters: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
    plural: {saturday: 'sábados', sunday: 'domingos'},
    longday: '{$a->day} {$a->n} de {$a->month}',
    and: 'y',
    s_today: 'Sale solo hoy, {$a}', s_always: 'Sale desde hoy y no caduca', s_until: 'Sale desde hoy hasta el {$a}',
    s_range: 'Sale del {$a->from} al {$a->until}', s_from: 'Sale desde el {$a}, sin fecha de fin',
    s_one: 'Sale solo el {$a}', s_untilover: 'Sale desde hoy hasta que acaba, el {$a->day} a las {$a->time}',
    s_weekdays: ', de lunes a viernes', s_only: ', solo los {$a}', s_hours: ', de {$a->from} a {$a->to}',
    s_hours2: ', de {$a->from} a {$a->to} y de {$a->from2} a {$a->to2}', s_allday: ', todo el día',
    s_every: ', cada {$a} semanas', draft_title: 'Lo que escribas', draft_ticker: 'Tu línea',
};
// Monday 2 November 2026.
const base = {today: '2026-11-02', friday: '2026-11-06', days: [1, 2, 3, 4, 5, 6, 7], hours: [], every: 1};

test('each shortcut of «Cuándo» means its dates, as the server reads them', () => {
    assert.deepEqual(windowOf({...base, when: 'today'}), ['2026-11-02', '2026-11-02']);
    assert.deepEqual(windowOf({...base, when: 'friday'}), ['2026-11-02', '2026-11-06']);
    assert.deepEqual(windowOf({...base, when: 'twoweeks'}), ['2026-11-02', '2026-11-15']);
    assert.deepEqual(windowOf({...base, when: 'always'}), [null, null]);
    assert.deepEqual(windowOf({...base, when: 'fromnow'}), ['2026-11-02', null]);
    assert.deepEqual(windowOf({...base, when: 'untilover', eventDay: '2026-11-06'}), ['2026-11-02', '2026-11-06']);
    assert.deepEqual(windowOf({...base, when: 'thatday', eventDay: '2026-11-06'}), ['2026-11-06', '2026-11-06']);
    assert.deepEqual(windowOf({...base, when: 'dates', from: '2026-11-03', to: ''}), ['2026-11-03', null]);
    assert.equal(addDays('2026-10-31', 2), '2026-11-02');
});

test('«Cuándo» said as a sentence', () => {
    assert.equal(sentence({...base, when: 'friday'}, S), 'Sale desde hoy hasta el viernes 6 de noviembre, todo el día.');
    assert.equal(sentence({...base, when: 'today'}, S), 'Sale solo hoy, lunes 2 de noviembre, todo el día.');
    assert.equal(sentence({...base, when: 'always'}, S), 'Sale desde hoy y no caduca, todo el día.');
    assert.equal(sentence({...base, when: 'dates', from: '2026-11-03', to: '2026-11-12', days: [1, 3],
        hours: [['08:00', '10:30']]}, S), 'Sale del martes 3 al jueves 12 de noviembre, solo los lunes y miércoles, ' +
        'de 08:00 a 10:30.');
    assert.equal(sentence({...base, when: 'twoweeks', days: [1, 2, 3, 4, 5], every: 2}, S),
        'Sale desde hoy hasta el domingo 15 de noviembre, de lunes a viernes, todo el día, cada 2 semanas.');
    assert.equal(sentence({...base, when: 'untilover', eventDay: '2026-11-06', eventTime: '18:00'}, S),
        'Sale desde hoy hasta que acaba, el viernes 6 de noviembre a las 18:00.');
    assert.equal(sentence({...base, when: 'dates', from: '2026-11-09', to: '', days: [6, 7]}, S),
        'Sale desde el lunes 9 de noviembre, sin fecha de fin, solo los sábados y domingos, todo el día.');
});

test('the strip: two weeks from Monday, the days it shows filled, and whether it goes on', () => {
    const r = strip({...base, when: 'friday'}, S);
    assert.equal(r.cells.length, 14);
    assert.deepEqual(r.cells.slice(0, 7).map((c) => c.on), [true, true, true, true, true, false, false]);
    assert.equal(r.cells[0].today, true);
    assert.equal(r.cells[5].weekend, true);
    assert.equal(r.more, false);
    assert.equal(strip({...base, when: 'always'}, S).more, true);
    // From a Wednesday, the days before it are not filled.
    const w = strip({...base, today: '2026-11-04', when: 'always'}, S);
    assert.deepEqual(w.cells.slice(0, 3).map((c) => c.on), [false, false, true]);
});

test('the draft, as the contract gives an item', () => {
    assert.deepEqual(draftItem({type: 'notice', title: ' Fotos ', body: '', important: true}, S),
        {id: 'draft', type: 'notice', zone: 'side', title: 'Fotos', body: '', tone: 'important'});
    assert.equal(draftItem({type: 'notice', title: ''}, S).title, 'Lo que escribas');
    assert.deepEqual(draftItem({type: 'event', title: 'Teatro', body: '3º Pri', eventDay: '2026-11-03', eventFrom: '10:30',
        eventTo: '11:30', colour: '2'}, S), {id: 'draft', type: 'event', zone: 'side', title: 'Teatro',
        start: '2026-11-03T10:30', end: '2026-11-03T11:30', color: 2, allday: false, detail: '3º Pri'});
    assert.equal(draftItem({type: 'media', title: 'x'}, S), null);
    assert.deepEqual(draftItem({type: 'media', title: 'Huerto', body: '', caption: true,
        media: {url: 'blob:x', width: 1600, height: 900}}, S).caption, {title: 'Huerto'});
    assert.equal(draftItem({type: 'ticker', title: 'Mañana, museo'}, S).text, 'Mañana, museo');
});
