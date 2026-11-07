// The birthdays, the shelf and the allergens, without a page: what is decided before anything is drawn.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialsOf} from '../src/cumple.js';
import {booksPages} from '../src/biblioteca.js';
import {allergensOf, menuParts, wordsCramped} from '../src/lead.js';
import {contrast, skyAt} from '../src/reposo.js';
import {pagesOf, tableShape} from '../src/tabla.js';
import {deadlineTime, deadlinesPage, deadlinesPages, deadlinesPerPage} from '../src/plazos.js';

test('initials: the first two words, in capitals', () => {
    assert.equal(initialsOf('lucía pérez ruiz'), 'LP');
    assert.equal(initialsOf('Lía'), 'L');
    assert.equal(initialsOf(''), '');
});

test('one page per book, so each one gets its turn with its code', () => {
    assert.equal(booksPages({books: [{}, {}, {}]}), 3);
    assert.equal(booksPages({books: []}), 1);
});

test('allergens: those of its dishes, once; none is nothing, never «without allergens»', () => {
    assert.deepEqual(allergensOf({allergens: [['gluten', 'milk'], ['milk', 'eggs']]}), ['gluten', 'milk', 'eggs']);
    assert.deepEqual(allergensOf({dishes: ['Naranja']}), []);
    assert.deepEqual(allergensOf(undefined), []);
    const parts = menuParts({courses: [{label: 'Primero', dishes: ['Crema'], allergens: [['celery']]},
        {label: 'Segundo', dishes: ['Merluza'], allergens: [['fish']]}]});
    assert.deepEqual(parts.mainAllergens, ['fish']);
    assert.deepEqual(parts.others[0].allergens, ['celery']);
});

test('an icon gives way when the words have paid for it, not before', () => {
    const lead = (cls, step) => ({classList: {contains: (c) => c === cls}, getAttribute: () => String(step), querySelector: () => null});
    assert.equal(wordsCramped(lead('', 0), {style: {}}), false);
    assert.equal(wordsCramped(lead('', 2), {style: {}}), false);
    assert.equal(wordsCramped(lead('', 3), {style: {}}), true);
    assert.equal(wordsCramped(lead('hk-lider-corto', 0), {style: {}}), true);
    assert.equal(wordsCramped(lead('', 0), {style: {fontSize: '40px'}}), true);
});

test('the idle sky: day and night by the hour, or by the weather when there is a place', () => {
    assert.equal(skyAt(12, 0).night, false);
    assert.equal(skyAt(22, 30).night, true);
    assert.equal(skyAt(4, 0).night, true);
    assert.ok(skyAt(9, 0).along < skyAt(15, 0).along);
    assert.ok(skyAt(21, 0).along < skyAt(3, 0).along);
    // A December evening where it is dark by five: the moon, at the start of its arc
    const evening = skyAt(17, 0, 'clearsky_night');
    assert.equal(evening.night, true);
    assert.ok(evening.along <= .05);
    // A June night in the north, still light: the sun, at the end of its arc
    assert.equal(skyAt(22, 0, 'fair_day').night, false);
    assert.ok(skyAt(22, 0, 'fair_day').along <= .95);
    assert.equal(skyAt(12, 0, 'rain').covered, true);
    assert.equal(skyAt(12, 0, 'clearsky_day').covered, false);
    assert.equal(skyAt(12, 0).covered, false);
    assert.equal(skyAt(23, 0, 'rain_night').covered, false);
});

test('a sun needs its sky: the two colours of a centre, measured as the browser gives them', () => {
    assert.ok(contrast('rgb(14, 79, 92)', 'rgb(255, 138, 61)') > 2);
    assert.ok(contrast('rgb(14, 79, 92)', 'rgb(16, 84, 98)') < 1.5);
    assert.equal(contrast('', 'rgb(0, 0, 0)'), 21);
});

test('deadlines: how many fit, by the distance; a day cut by the page comes again with its name', () => {
    assert.equal(deadlinesPerPage(3, true), 7);
    assert.equal(deadlinesPerPage(8, true), 4);
    assert.ok(deadlinesPerPage(5, true, true) < deadlinesPerPage(5, true));
    const item = {days: [
        {date: '2026-11-05', items: new Array(6).fill({course: 'A'})},
        {date: '2026-11-06', items: new Array(6).fill({course: 'B'})},
    ]};
    assert.equal(deadlinesPages(item, 8, true), 3);
    const second = deadlinesPage(item, 1, 4);
    assert.deepEqual(second.days.map((d) => [d.date, d.items.length]), [['2026-11-05', 2], ['2026-11-06', 2]]);
    assert.equal(deadlinesPage(item, 4, 4).at, 1);
    assert.equal(deadlinesPages({days: []}, 3, true), 1);
    assert.deepEqual(deadlinesPage({days: []}, 0, 7).days, []);
});

test('deadlines: the hour, when it says something', () => {
    assert.equal(deadlineTime('23:59'), '');
    assert.equal(deadlineTime('00:00'), '');
    assert.equal(deadlineTime(''), '');
    assert.equal(deadlineTime('14:00'), '14:00');
});

test('a table: no empty columns or rows, six columns at most, and what reads as figures told apart', () => {
    const t = tableShape({title: ' Horario ', head: ['Hora', '', 'Aula', 'Nota'], rows: [['8:00', '', 'Física', '7,5'], ['', '', '', ''], ['9:00–10:00', '', 'Dibujo técnico', '9'], ['10:00', '', '', 'Apto']]});
    assert.equal(t.title, 'Horario');
    assert.deepEqual(t.head, ['Hora', 'Aula', 'Nota']);
    assert.equal(t.rows.length, 3);
    assert.deepEqual(t.figures, [true, false, false]);
    const wide = tableShape({head: [], rows: [['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']]});
    assert.equal(wide.rows[0].length, 6);
    assert.deepEqual(wide.head, []);
    assert.deepEqual(tableShape({}).rows, []);
    assert.deepEqual(tableShape({head: ['A', 'B'], rows: [['1']]}).head, ['A', 'B']);
});

test('pages out of measures: as many as fit, and at least one each', () => {
    assert.deepEqual(pagesOf([10, 10, 10], 25), [[0, 1], [2]]);
    assert.deepEqual(pagesOf([40, 10], 25), [[0], [1]]);
    assert.deepEqual(pagesOf([], 25), [[]]);
    // As even as they can be: not four rows and one alone.
    assert.deepEqual(pagesOf([10, 10, 10, 10, 10], 40), [[0, 1, 2], [3, 4]]);
});
