// The birthdays, the shelf and the allergens, without a page: what is decided before anything is drawn.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {birthdaysPages, birthdaysPerPage, initialsOf} from '../src/cumple.js';
import {booksPages} from '../src/biblioteca.js';
import {allergensOf, menuParts, wordsCramped} from '../src/lead.js';
import {contrast, skyAt} from '../src/reposo.js';

test('how many birthdays fit, by the distance; pages for up to thirty people', () => {
    assert.equal(birthdaysPerPage(3, true), 9);
    assert.equal(birthdaysPerPage(8, true), 4);
    assert.ok(birthdaysPerPage(5, true, true) < birthdaysPerPage(5, true));
    const people = new Array(30).fill({name: 'Ana'});
    assert.equal(birthdaysPages({people}, 3, true), 4);
    assert.equal(birthdaysPages({people: [{name: 'Ana'}]}, 8, true), 1);
    assert.equal(birthdaysPages({people: []}, 3, true), 1);
});

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
