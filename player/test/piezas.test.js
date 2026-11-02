// The birthdays, the shelf and the allergens, without a page: what is decided before anything is drawn.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {birthdaysPages, birthdaysPerPage, initialsOf} from '../src/cumple.js';
import {booksPages} from '../src/biblioteca.js';
import {allergensOf, menuParts} from '../src/lead.js';

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
