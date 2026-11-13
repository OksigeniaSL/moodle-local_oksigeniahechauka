// «La biblioteca celebra»: when it comes, which moment each time, and what the slide takes of the item.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Composer} from '../src/compose.js';
import {momentsOf, momentsPages} from '../src/celebra.js';

const moments = {id: 'm', type: 'moments', label: 'La biblioteca celebra', moments: [
    {kind: 'loans', text: 'Este curso ya van 1.000 libros prestados.'},
    {kind: 'book', text: '«Momo» ha llegado esta semana a las 100 salidas.', cover: {id: 1}},
    {kind: 'first', text: '12 lectores se han llevado esta semana su primer libro.'},
]};

test('what the library celebrates comes one slide in sixteen, the next moment each time', () => {
    const c = new Composer();
    const seen = [];
    for (let i = 0; i < 60; i++) {
        seen.push(c.next([], 4, true, {moments, distance: 3}));
    }
    const party = seen.filter((x) => x.comp === 'celebra');
    assert.ok(party.length >= 3 && party.length <= 4, 'celebra: ' + party.length);
    assert.deepEqual(party.map((x) => x.extra.page).slice(0, 3), [0, 1, 2]);
    assert.equal(party[0].extra.item, moments);
    assert.equal(party[0].seconds, 12);
});

test('with the books and the birthdays too, each keeps its turn and they never come together', () => {
    const c = new Composer();
    const birthdays = {id: 'b', type: 'birthdays', people: [{name: 'A'}]};
    const books = {id: 'l', type: 'books', books: [{title: 'T'}]};
    const seen = [];
    for (let i = 0; i < 64; i++) {
        seen.push(c.next([], 4, true, {birthdays, books, moments, distance: 3}).comp);
    }
    const party = seen.filter((x) => x === 'celebra').length;
    const shelf = seen.filter((x) => x === 'biblioteca').length;
    assert.ok(party >= 2, 'celebra: ' + party);
    assert.ok(shelf >= 3, 'biblioteca: ' + shelf);
    for (let i = 1; i < seen.length; i++) {
        assert.ok(!(seen[i] === 'celebra' && seen[i - 1] === 'biblioteca'), 'the library twice in a row at ' + i);
    }
});

test('a showcase does not celebrate: it only has pictures', () => {
    const c = new Composer();
    const seen = [];
    for (let i = 0; i < 40; i++) {
        seen.push(c.next([], 4, true, {use: 'showcase', moments}).comp);
    }
    assert.ok(!seen.includes('celebra'));
});

test('four moments at most, and none without its sentence', () => {
    const many = {moments: [{kind: 'a', text: '1'}, {kind: 'b', text: ''}, {kind: 'c', text: '3'}, {kind: 'd', text: '4'},
        {kind: 'e', text: '5'}, {kind: 'f', text: '6'}]};
    assert.deepEqual(momentsOf(many).map((m) => m.text), ['1', '3', '4', '5']);
    assert.equal(momentsPages(many), 4);
    assert.equal(momentsPages(null), 1);
    assert.deepEqual(momentsOf({}), []);
});
