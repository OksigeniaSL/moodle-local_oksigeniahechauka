// «La semana» without a page: which days, holidays, bands and their lanes, stages.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stageOf} from '../src/agenda.js';
import {weekOf} from '../src/week.js';

const L = {
    days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    days_short: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
        'noviembre', 'diciembre'],
    months_short: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    holiday: 'Festivo', from: 'desde el', until: 'hasta el',
};

test('the stage from the group of a title', () => {
    assert.equal(stageOf('Infantil'), 1);
    assert.equal(stageOf('4º Pri C'), 2);
    assert.equal(stageOf('3º ESO'), 3);
    assert.equal(stageOf('1º Bac Biología'), 4);
    assert.equal(stageOf(''), 0);
    assert.equal(stageOf('Mesorregión'), 0);
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

