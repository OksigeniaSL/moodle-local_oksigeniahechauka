// «La semana» without a page: which days, holidays, bands and their lanes, stages.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {afterDayEnd, categoryOf, colourOf, eventsOn, upcoming} from '../src/agenda.js';
import {weekOf} from '../src/week.js';

const L = {
    days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    days_short: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
        'noviembre', 'diciembre'],
    months_short: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    holiday: 'Festivo', from: 'desde el', until: 'hasta el',
    // The categories of an example school, as its centre would set them in «Tu centro».
    categories: [{n: 1, words: ['inf', 'infantil']}, {n: 2, words: ['pri', 'primaria']}, {n: 3, words: ['eso']},
        {n: 4, words: ['bach', 'bachillerato']}],
};

test('the category of an event, by the words each centre gives its categories', () => {
    const school = L.categories;
    assert.equal(categoryOf('Infantil', school), 1);
    assert.equal(categoryOf('4º Pri C', school), 2);
    assert.equal(categoryOf('3º ESO', school), 3);
    assert.equal(categoryOf('1º Bach Biología', school), 4);
    assert.equal(categoryOf('', school), 0);
    assert.equal(categoryOf('Mesorregión', school), 0);
    // A university: its faculties, a phrase of two words, accents or not.
    const university = [{n: 1, words: ['ingeniería', 'etsi']}, {n: 2, words: ['ciencias de la salud']},
        {n: 3, words: ['derecho']}];
    assert.equal(categoryOf('ETSI Caminos', university), 1);
    assert.equal(categoryOf('Ingenieria Civil', university), 1);
    assert.equal(categoryOf('Facultad de Ciencias de la Salud', university), 2);
    assert.equal(categoryOf('Ciencias Exactas', university), 0);
    assert.equal(categoryOf('3º ESO', university), 0);
    // The closest word wins: «Inglés» is not Engineering for having «ing».
    const academy = [{n: 1, words: ['ing', 'ingeniería']}, {n: 2, words: ['inglés', 'idiomas']}];
    assert.equal(categoryOf('Inglés', academy), 2);
    assert.equal(categoryOf('Ingeniería Civil', academy), 1);
    assert.equal(categoryOf('Ing. Industrial', academy), 1);
    // No categories: no colour.
    assert.equal(categoryOf('3º ESO', []), 0);
    // A category chosen for the event wins over its words.
    assert.equal(colourOf({color: 2}, '3º ESO', school), 2);
    assert.equal(colourOf({}, '3º ESO', school), 3);
    // Nothing in its group: its whole title.
    assert.equal(colourOf({title: 'Teatro en inglés'}, '', [{n: 4, words: ['inglés']}]), 4);
    assert.equal(colourOf({title: 'Teatro'}, '', [{n: 4, words: ['inglés']}]), 0);
});

test('five school days from today; from a Thursday it goes on after the weekend', () => {
    const w = weekOf([], '2026-11-05', false, L);
    assert.deepEqual(w.days.map((d) => d.number), [5, 6, 9, 10, 11]);
    assert.equal(w.days[0].today, true);
    assert.equal(w.days[1].tomorrow, true);
    assert.equal(w.days[2].afterWeekend, true);
    assert.equal(w.things, 0);
    // On a Saturday it starts on Monday.
    assert.deepEqual(weekOf([], '2026-11-07', false, L).days.map((d) => d.number), [9, 10, 11, 12, 13]);
});

test('a holiday marks its day; events go to their day by hour, whole days first; a weekend one is out', () => {
    const w = weekOf([
        {title: 'Festivo - Todos los Santos', start: '2026-11-02T00:00', end: '2026-11-02T23:59', allday: true},
        {title: '3º y 4º Pri - Teatro', start: '2026-11-03T10:30', end: '2026-11-03T11:30'},
        {title: '🎃 Halloween', start: '2026-11-03T00:00', allday: true},
        {title: 'Sábado', start: '2026-11-07T10:00'},
    ], '2026-11-02', false, L);
    assert.deepEqual(w.days[0].holiday, {label: 'Festivo', name: 'Todos los Santos'});
    assert.deepEqual(w.days[1].events.map((e) => [e.title, e.time, e.color]),
        [['🎃 Halloween', '', 0], ['Teatro', '10:30', 2]]);
    assert.equal(w.things, 3);
});

test('an event of more than a day is a band across its days, with a point where it goes on', () => {
    const w = weekOf([
        {title: '3º ESO - Acampada', start: '2026-11-04T08:00', end: '2026-11-09T16:00'},
        {title: '4º Pri C - Residencia', start: '2026-10-30T10:00', end: '2026-11-03T13:00'},
    ], '2026-11-02', false, L);
    const [res, camp] = w.bands;
    assert.equal(res.title, 'Residencia');
    assert.deepEqual([res.from, res.to, res.before, res.after], [0, 1, true, false]);
    assert.equal(res.note, 'desde el vie 30 oct');
    assert.deepEqual([camp.from, camp.to, camp.before, camp.after], [2, 4, false, true]);
    assert.equal(camp.note, 'hasta el lun 9');
    assert.equal(camp.color, 3);
    assert.notEqual(res.lane === camp.lane && res.to >= camp.from, true);
});

test('more bands than lanes: the ones without a lane go into the lists of their days, saying until when', () => {
    const many = [1, 2, 3, 4].map((i) => ({title: 'Viaje ' + i, start: '2026-11-02T08:00', end: '2026-11-04T16:00'}));
    const w = weekOf(many, '2026-11-02', false, L);
    assert.equal(w.bands.length, 3);
    assert.equal(w.days[0].lanes, 3);
    assert.equal(w.days[0].events[0].title, 'Viaje 4');
    assert.equal(w.days[0].events[0].group, 'hasta el mié 4');
    const v = weekOf(many, '2026-11-02', true, L);
    assert.equal(v.bands.length, 2);
    assert.equal(v.days[0].flags, 2);
});

test('an event made in the panel takes its group, and its stage, from its «who or where»', () => {
    const w = weekOf([{title: 'Teatro en inglés', detail: '3.º y 4.º de Primaria', start: '2026-11-02T10:30'}],
        '2026-11-02', false, L);
    assert.deepEqual([w.days[0].events[0].group, w.days[0].events[0].color], ['3.º y 4.º de Primaria', 2]);
});

test('at the end of the day «Today» shows tomorrow, and the coming days start after it', () => {
    const wall = (hm) => ({date: '2026-11-03', min: parseInt(hm.slice(0, 2), 10) * 60 + parseInt(hm.slice(3), 10)});
    assert.equal(afterDayEnd(wall('15:59'), '16:00'), false);
    assert.equal(afterDayEnd(wall('16:00'), '16:00'), true);
    assert.equal(afterDayEnd(wall('21:30'), '21:00'), true);
    assert.equal(afterDayEnd(wall('23:00'), ''), false);
    assert.equal(afterDayEnd(wall('23:00'), undefined), false);
    const events = [
        {id: 'a', title: 'Claustro', start: '2026-11-03T17:00'},
        {id: 'b', title: '4º Pri - Teatro', start: '2026-11-04T10:30'},
        {id: 'c', title: 'Inglés - Club de conversación', start: '2026-11-04T09:00'},
        {id: 'd', title: 'Puertas abiertas', start: '2026-11-04', allday: true},
        {id: 'e', title: 'Feria', start: '2026-11-05T12:00'},
    ];
    const tomorrow = eventsOn(events, '2026-11-03', 1, L.categories);
    assert.deepEqual(tomorrow.map((e) => e.time + ' ' + e.title), ['· Puertas abiertas', '09:00 Club de conversación',
        '10:30 Teatro']);
    assert.equal(tomorrow[2].color, 2);
    const s = {tomorrow: 'Mañana', days_short: L.days_short, months_short: L.months_short, categories: L.categories};
    assert.deepEqual(upcoming(events, '2026-11-03', 7, s).map((e) => e.id), ['d', 'c', 'b', 'e']);
    assert.deepEqual(upcoming(events, '2026-11-03', 7, s, 1).map((e) => e.id), ['e']);
    assert.equal(upcoming(events, '2026-11-03', 7, s, 1)[0].day, 'jue 5');
    // Today's list goes by the event's own day, not by the days it is shown: the feria is not «today» on the 3rd.
    assert.deepEqual(eventsOn(events, '2026-11-03', 0, L.categories).map((e) => e.title), ['Claustro']);
    // A camp of three days is on each of them, with its hour only on the first; ending at midnight, not the next day.
    const camp = [{title: '3º ESO - Acampada', start: '2026-11-04T09:00', end: '2026-11-06T17:00'},
        {title: 'Fiesta', start: '2026-11-04T20:00', end: '2026-11-05T00:00'}];
    assert.deepEqual(eventsOn(camp, '2026-11-03', 1, L.categories).map((e) => e.time + ' ' + e.title),
        ['09:00 Acampada', '20:00 Fiesta']);
    assert.deepEqual(eventsOn(camp, '2026-11-03', 2, L.categories).map((e) => e.time + ' ' + e.title), ['· Acampada']);
    assert.deepEqual(eventsOn(camp, '2026-11-03', 4, L.categories), []);
});
