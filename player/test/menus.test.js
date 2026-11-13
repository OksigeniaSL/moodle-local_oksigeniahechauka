// «Los menús de hoy»: what the slide takes of the menu item, how the menus go into pages, which dishes share a cell and
// what a menu is called on its column.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {menuShort, menusData, menusPages, rowCells} from '../src/menus.js';
import {rulesOf} from '../src/movimiento.js';

const dish = (label, text, codes) => ({label, dishes: [text], allergens: [codes || []]});
// The four menus of a real day of a school's canteen (13 November 2026), with example allergens.
const item = {id: 'm1', type: 'menu', label: 'Menú de hoy', allergennames: {fish: 'Pescado'}, menus: [
    {name: 'Menú A', courses: [dish('Primero', 'Judías compuestas'), dish('Segundo', 'Fogonero al horno con papas guisadas', ['fish']),
        dish('Postre', 'Plátano')]},
    {name: 'Menú B', courses: [dish('Segundo', 'Pabellón criollo con huevo frito'), dish('Postre', 'Plátano')]},
    {name: 'Menú C (vegetariano)', courses: [dish('Primero', 'Guiso de judías'), dish('Segundo', 'Tempura de verduras'),
        dish('Postre', 'Plátano')]},
    {name: 'Menú D (hipocalórico)', courses: [dish('Primero', 'Crema de calabaza'),
        dish('Segundo', 'Fogonero al horno con papas guisadas', ['fish']), dish('Postre', 'Plátano')]},
]};

test('a menu is called by what goes before in its name, and its kind apart', () => {
    assert.deepEqual(menuShort('Menú C (vegetariano)'), {word: 'Menú', short: 'C'});
    assert.deepEqual(menuShort('Menu 2'), {word: 'Menu', short: '2'});
    assert.deepEqual(menuShort('Menú sin gluten'), {word: 'Menú', short: 'sin gluten'});
    assert.deepEqual(menuShort('Infantil'), {word: '', short: 'Infantil'});
    const d = menusData(item, 'Menú');
    assert.deepEqual(d.menus.map((m) => m.short), ['A', 'B', 'C', 'D']);
    assert.deepEqual(d.menus.map((m) => m.kind), ['', '', 'vegetariano', 'hipocalórico']);
});

test('the courses in the order they first come, and a menu without one has none', () => {
    const d = menusData(item, 'Menú');
    assert.deepEqual(d.courses.map((c) => c.label), ['Primero', 'Segundo', 'Postre']);
    assert.equal(d.menus[1].by.primero, undefined);
    assert.equal(d.menus[0].by.segundo.text, 'Fogonero al horno con papas guisadas');
    assert.deepEqual(d.menus[0].by.segundo.allergens, ['fish']);
    assert.equal(d.label, 'Menú de hoy');
});

test('no slide on a day without canteen', () => {
    assert.equal(menusData(null, 'Menú'), null);
    assert.equal(menusData({closed: true, title: 'No hay comedor'}, 'Menú'), null);
    assert.equal(menusData({menus: []}, 'Menú'), null);
});

test('the pages by distance, the menus spread evenly and never one alone after a full page', () => {
    assert.deepEqual(menusPages(4, true, 3), [[[0, 1, 2, 3]]]);
    assert.deepEqual(menusPages(4, true, 5), [[[0, 1]], [[2, 3]]]);
    assert.deepEqual(menusPages(4, true, 8), [[[0]], [[1]], [[2]], [[3]]]);
    assert.deepEqual(menusPages(5, true, 3), [[[0, 1, 2]], [[3, 4]]]);
    assert.deepEqual(menusPages(6, true, 3), [[[0, 1, 2]], [[3, 4, 5]]]);
    // Upright: two tables, one over the other.
    assert.deepEqual(menusPages(4, false, 3), [[[0, 1], [2, 3]]]);
    assert.deepEqual(menusPages(3, false, 3), [[[0, 1], [2]]]);
    assert.deepEqual(menusPages(6, false, 3), [[[0, 1], [2]], [[3, 4], [5]]]);
    assert.deepEqual(menusPages(2, false, 8), [[[0]], [[1]]]);
    assert.deepEqual(menusPages(4, false, 5), [[[0, 1]], [[2, 3]]]);
    assert.deepEqual(menusPages(1, true, 3), [[[0]]]);
});

test('a dish shared by menus side by side is one cell; apart, each its own', () => {
    const d = menusData(item, 'Menú');
    const all = [0, 1, 2, 3];
    // The dessert of all four: one cell.
    assert.deepEqual(rowCells(d, all, 'postre').map((c) => c.menus), [[0, 1, 2, 3]]);
    // The second of A and D, with others between: four cells.
    assert.deepEqual(rowCells(d, all, 'segundo').map((c) => c.menus), [[0], [1], [2], [3]]);
    // The first: B has none, an empty cell of its own.
    const first = rowCells(d, all, 'primero');
    assert.deepEqual(first.map((c) => c.menus), [[0], [1], [2], [3]]);
    assert.equal(first[1].dish, null);
    // Side by side on a page of their own, A and D would share it.
    assert.deepEqual(rowCells(d, [0, 3], 'segundo').map((c) => c.menus), [[0, 3]]);
});

test('the same dish with other allergens is not the same cell', () => {
    const other = JSON.parse(JSON.stringify(item));
    other.menus[1].courses[1].allergens = [['milk']];
    const d = menusData(other, 'Menú');
    // B's dessert, with milk: A alone, B alone, C and D together.
    assert.deepEqual(rowCells(d, [0, 1, 2, 3], 'postre').map((c) => c.menus), [[0], [1], [2, 3]]);
});

test('the slide has its movement: the plate, the label, the letters, the rows', () => {
    const rules = rulesOf('menus');
    assert.ok(rules && rules.length >= 5);
    assert.deepEqual(rules.map((r) => r[0]).slice(0, 3), ['.hk-menus', '.hk-menus-pieza', '.hk-menus-etiqueta']);
});
