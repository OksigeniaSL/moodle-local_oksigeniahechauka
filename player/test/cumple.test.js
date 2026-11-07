// «Hoy cumplen años» without a page: whether it comes out, how long it lasts, who is in it and where the next one goes
// on. For player/test/ (in place of the birthday part of piezas.test.js). All of it, example data.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PARADE_MOST, birthdaysSeconds, birthdaysShow, dayOf, keepNext, keyOf, modeOf, orderOf, perSlide, startOf,
    storeOf} from '../src/cumple-turnos.js';

const people = (n) => Array.from({length: n}, (_, i) => ({id: 100 + i, name: 'Persona ' + i, group: 'Grupo'}));

// A Storage in memory, as the device's.
function storage() {
    const m = {};
    return {getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => {
        m[k] = String(v);
    }, removeItem: (k) => {
        delete m[k];
    }};
}

test('nobody: no slide, and it says so', () => {
    assert.equal(birthdaysShow({people: []}), false);
    assert.equal(birthdaysShow(null), false);
    assert.equal(birthdaysSeconds({people: []}), 0);
    assert.equal(modeOf(0), null);
    assert.equal(birthdaysShow({people: people(1)}), true);
});

test('one to three, the stage; four or more, the parade', () => {
    assert.equal(modeOf(1), 'escenario');
    assert.equal(modeOf(3), 'escenario');
    assert.equal(modeOf(4), 'desfile');
    assert.equal(modeOf(2300), 'desfile');
});

test('how long: each person has their moment, and a parade slide stays around half a minute', () => {
    assert.equal(birthdaysSeconds({people: people(1)}), 11);
    assert.equal(birthdaysSeconds({people: people(2)}), 18);
    assert.equal(birthdaysSeconds({people: people(3)}), 24);
    assert.equal(birthdaysSeconds({people: people(4)}), 21);
    assert.equal(birthdaysSeconds({people: people(5)}), 25);
    // More than five: the same slide, five at a time (PARADE_MOST, so that the slide does not eat the rotation).
    assert.equal(birthdaysSeconds({people: people(15)}), 25);
    assert.equal(perSlide(15), PARADE_MOST);
    // Per person in the parade, between 4 and 5 seconds.
    const each = (birthdaysSeconds({people: people(5)}) - birthdaysSeconds({people: people(4)}));
    assert.ok(each >= 4 && each <= 5, 'each: ' + each);
});

test('the parade goes round the list from where it starts', () => {
    assert.deepEqual(orderOf(15, 0), [0, 1, 2, 3, 4]);
    assert.deepEqual(orderOf(15, 12), [12, 13, 14, 0, 1]);
    assert.deepEqual(orderOf(5, 0), [0, 1, 2, 3, 4]);
});

test('through the day everybody has their moment: each slide goes on where the last one stopped', () => {
    const list = people(15);
    const store = storeOf(storage());
    const today = '2026-11-09';
    const seen = {};
    let from = startOf(list, today, store, 0);
    assert.equal(from, 0);
    for (let slide = 0; slide < 3; slide++) {
        orderOf(list.length, from).forEach((i) => {
            seen[i] = true;
            keepNext(list, today, store, i);
        });
        from = startOf(list, today, store, slide + 1);
    }
    assert.equal(Object.keys(seen).length, 15);
    // Another day starts with the first.
    assert.equal(startOf(list, '2026-11-10', store, 7), 0);
});

test('a slide cut short gives the moment again to whoever did not finish it', () => {
    const list = people(10);
    const store = storeOf(storage());
    keepNext(list, '2026-11-09', store, 0);
    keepNext(list, '2026-11-09', store, 1);
    // Cut during the third: it starts with the third.
    assert.equal(startOf(list, '2026-11-09', store, 0), 2);
});

test('the list changes during the day: the next one is found by who they are, or the place is kept', () => {
    const list = people(10);
    const store = storeOf(storage());
    keepNext(list, '2026-11-09', store, 3);
    // Someone added at the beginning: the same person, one place further.
    const more = [{id: 999, name: 'Nueva'}].concat(list);
    assert.equal(startOf(more, '2026-11-09', store, 0), 5);
    // That person is gone: the same place.
    const fewer = list.filter((p) => p.id !== 104);
    assert.equal(startOf(fewer, '2026-11-09', store, 0), 4);
});

test('without storage it still works, in memory; with nothing kept, the composer\'s turn', () => {
    const broken = {getItem: () => {
        throw new Error('no');
    }, setItem: () => {
        throw new Error('no');
    }, removeItem: () => null};
    const store = storeOf(broken);
    const list = people(15);
    assert.equal(startOf(list, '2026-11-09', store, 1), 5);
    keepNext(list, '2026-11-09', store, 8);
    assert.equal(startOf(list, '2026-11-09', store, 0), 9);
});

test('who a person is: the id, else the name and the group', () => {
    assert.equal(keyOf({id: 7, name: 'A'}), 'i7');
    assert.equal(keyOf({name: ' Ana Ruiz ', group: '3.º A'}), 'nana ruiz|3.º a');
    assert.match(dayOf(new Date(2026, 10, 9)), /^2026-11-09$/);
});
