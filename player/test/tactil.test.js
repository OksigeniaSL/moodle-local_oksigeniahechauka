// The touch screen (src/tactil.js): which doors come out and in what order, the front from afar, the door a touched slide
// opens, the welcome of a visit an hour before, the menus of the week, the clock of the touches and its counts.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    DOORS, IdleClock, contactHas, aboutHas, doorOfSlide, doorsShown, frontDoors, hourOf, linkOf, menuWeek, nextOf, say,
    visitToWelcome, visitsLeft,
} from '../src/tactil.js';
import {FOOD} from '../src/comida.js';
import {Played} from '../src/played.js';
import {readdirSync} from 'node:fs';

const ALL = DOORS.map(function (d) {
    return d.key;
});
// Monday 2 November 2026, 10:45, in the device's time zone.
const NOW = new Date(2026, 10, 2, 10, 45).getTime();
const at = (h, m) => Math.round(new Date(2026, 10, 2, h, m).getTime() / 1000);

function data(o) {
    return Object.assign({
        touch: {doors: ALL, idle: 60},
        now: NOW,
        menuWeek: [{date: '2026-11-02', closed: false, menus: [{courses: [{label: 'Primero', dishes: [{text: 'Lentejas', allergens: [], icon: 'lentils'}]}]}]}],
        agenda: {days: [{date: '2026-11-03', day: 3, weekday: 'martes', label: 'Mañana', events: [{time: '10:00', title: 'Residencia'}]}]},
        albums: [{id: 'a1', name: 'El huerto', photos: [{url: 'media/huerto.jpg'}]}],
        notices: [{title: 'Salida temprana'}],
        books: {books: [{title: 'Un libro'}]},
        channels: [],
        instagram: null,
        about: {words: 'Un colegio de Infantil y Primaria.'},
        visit: {visits: [{id: 1, timestart: at(11, 0), timeend: at(11, 45), hosts: [{name: 'Ana Martín', role: 'Jefa de estudios'}]}]},
        openacts: null,
        contact: {address: 'Calle de Ejemplo, 12'},
    }, o || {});
}

test('only the doors of the list, in its order, and only those with something to show', () => {
    const shown = doorsShown(data()).map((d) => d.key);
    assert.deepEqual(shown, ['menu', 'agenda', 'photos', 'notices', 'library', 'about', 'visit', 'centre']);
    const some = doorsShown(data({touch: {doors: ['centre', 'menu']}})).map((d) => d.key);
    assert.deepEqual(some, ['centre', 'menu']);
    assert.deepEqual(doorsShown(data({touch: {doors: []}})), []);
    // A day with the canteen closed has no menu door; no notices, no notices door.
    const none = doorsShown(data({menuWeek: [{date: '2026-11-02', closed: true, menus: []}], notices: []})).map((d) => d.key);
    assert.equal(none.indexOf('menu'), -1);
    assert.equal(none.indexOf('notices'), -1);
});

test('the front from afar: two doors of the families, one of the visitors and «Más puertas»', () => {
    const f = frontDoors(doorsShown(data()));
    assert.deepEqual(f.doors.map((d) => d.key), ['menu', 'agenda', 'about']);
    assert.equal(f.more, true);
    // Four or fewer: all of them, and no «Más puertas».
    const few = frontDoors(doorsShown(data({touch: {doors: ['menu', 'centre']}})));
    assert.deepEqual(few.doors.map((d) => d.key), ['menu', 'centre']);
    assert.equal(few.more, false);
    // Only families' doors: the first three.
    const fam = frontDoors(doorsShown(data({touch: {doors: ['menu', 'agenda', 'photos', 'notices', 'library']}})));
    assert.deepEqual(fam.doors.map((d) => d.key), ['menu', 'agenda', 'photos']);
});

test('a touched slide opens its door: a photo of an album, that album at that photo', () => {
    const shown = doorsShown(data());
    assert.deepEqual(doorOfSlide({comp: 'foto-sola', items: [{album: {id: 'a1'}, media: {url: 'x'}}]}, shown),
        {key: 'photos', album: 'a1', media: {url: 'x'}});
    assert.equal(doorOfSlide({comp: 'agenda', items: []}, shown).key, 'agenda');
    assert.equal(doorOfSlide({comp: 'menus', items: []}, shown).key, 'menu');
    // A slide whose door is not out opens the doors.
    assert.equal(doorOfSlide({comp: 'canal', items: []}, shown), null);
    assert.equal(doorOfSlide(null, shown), null);
});

test('the welcome of a visit: from an hour before it starts until it ends, the first first', () => {
    const item = data().visit;
    assert.equal(visitToWelcome(item, new Date(2026, 10, 2, 9, 59).getTime()), null);
    assert.equal(visitToWelcome(item, new Date(2026, 10, 2, 10, 0).getTime()).id, 1);
    assert.equal(visitToWelcome(item, new Date(2026, 10, 2, 11, 44).getTime()).id, 1);
    assert.equal(visitToWelcome(item, new Date(2026, 10, 2, 11, 45).getTime()), null);
    // Without anybody who receives them, no welcome.
    assert.equal(visitToWelcome({visits: [{id: 2, timestart: at(11, 0), timeend: at(12, 0), hosts: []}]}, NOW), null);
    // The door stays all day while one is to come.
    assert.equal(visitsLeft(item, new Date(2026, 10, 2, 8, 0).getTime()).length, 1);
    assert.equal(visitsLeft(item, new Date(2026, 10, 2, 12, 0).getTime()).length, 0);
    assert.equal(hourOf(at(11, 0)), '11:00');
});

test('the menus of the coming days, each dish with its allergens and its drawing', () => {
    const items = [
        {type: 'menu', date: '2026-11-01', menus: [{courses: [{label: 'P', dishes: ['Ayer']}]}]},
        {type: 'menu', date: '2026-11-03', menus: [{name: 'A', courses: [{label: 'Primero', dishes: ['Crema', 'Sopa'], allergens: [['milk'], []], icons: ['cream', '']}]}]},
        {type: 'menu', date: '2026-11-02', menus: [{courses: [{label: 'Primero', dishes: ['Lentejas']}]}], allergennames: {milk: 'Leche'}},
    ];
    const w = menuWeek(items, '2026-11-02');
    assert.deepEqual(w.map((d) => d.date), ['2026-11-02', '2026-11-03']);
    assert.deepEqual(w[1].menus[0].courses[0].dishes, [{text: 'Crema', allergens: ['milk'], icon: 'cream'},
        {text: 'Sopa', allergens: [], icon: ''}]);
    assert.deepEqual(w[0].names, {milk: 'Leche'});
    // A day with no dishes is a day with no canteen.
    assert.equal(menuWeek([{type: 'menu', date: '2026-11-02', menus: []}], '2026-11-02')[0].closed, true);
});

test('every drawing the server may name is in player/comida', () => {
    const files = readdirSync(new URL('../comida/', import.meta.url)).filter((f) => /\.svg$/.test(f)).map((f) => f.slice(0, -4));
    assert.deepEqual(FOOD.slice().sort(), files.sort());
    assert.ok(FOOD.indexOf('lentils') >= 0);
});

test('«Llévenselo al móvil»: the links of the touch, and those the contract already carries', () => {
    assert.equal(linkOf('menu', data()), '');
    assert.equal(linkOf('menu', data({touch: {doors: ALL, links: {menu: 'https://centro.example/menu'}}})), 'https://centro.example/menu');
    assert.equal(linkOf('menu', data({touch: {doors: ALL, links: {menu: 'javascript:alert(1)'}}})), '');
    assert.equal(linkOf('centre', data({contact: {geo: 'https://osm.org/x', web: 'https://centro.example'}})), 'https://osm.org/x');
    assert.equal(linkOf('about', data({contact: {web: 'https://centro.example'}})), 'https://centro.example');
    assert.equal(linkOf('openacts', data({openacts: {acts: [{act: {web: 'https://centro.example/jornada'}}]}})), 'https://centro.example/jornada');
    assert.ok(contactHas({phone: '900 123 456'}));
    assert.ok(!contactHas({phone: ' '}));
    assert.ok(aboutHas({day: [{title: 'Entramos'}]}));
    assert.ok(!aboutHas({words: ''}));
});

test('the clock of the touches: near, the last ten seconds said, and back', () => {
    const c = new IdleClock(60);
    assert.equal(c.state(0).state, 'far');
    c.touched(1000);
    assert.equal(c.state(1000 + 49000).state, 'near');
    const w = c.state(1000 + 52000);
    assert.equal(w.state, 'warn');
    assert.equal(w.left, 8);
    assert.equal(c.state(1000 + 60000).state, 'back');
    c.touched(30000);
    assert.equal(c.state(30000 + 40000).state, 'near');
    assert.equal(c.end(30000 + 45000), 74);
    assert.equal(c.state(0).state, 'far');
    // A short idle warns a third of it.
    const short = new IdleClock(12);
    short.touched(0);
    assert.equal(short.state(7000).state, 'near');
    assert.equal(short.state(9000).state, 'warn');
});

test('the counts go through played: door-<door> with its seconds, and touch with how long', () => {
    const p = new Played();
    p.add(['door-menu'], 12.4);
    p.add(['door-menu'], 3);
    p.add(['touch'], 40);
    assert.deepEqual(p.counts, {'door-menu': [2, 15], 'touch': [1, 40]});
});

test('the words: the site\'s first, the Spanish ones when it has not sent them, with their blanks', () => {
    assert.equal(say({}, 'touch_back_in', {n: 7}), 'Vuelve al inicio en 7 s');
    assert.equal(say({touch_back_in: 'Back in {n} s'}, 'touch_back_in', {n: 7}), 'Back in 7 s');
    assert.equal(say({}, 'touch_welcome', {t: '11:00'}), '¿Vienen a la visita de las 11:00? Los recibe');
});

test('what comes next: today, the first not started yet; else the next day', () => {
    const days = [{date: '2026-11-02', today: true, events: [{time: '10:30', title: 'Teatro'}, {time: '12:00', title: 'Charla'},
        {time: '', title: 'Todo el día'}]}, {date: '2026-11-03', today: false, events: [{time: '10:00', title: 'Residencia'}]}];
    assert.equal(nextOf(days, NOW).ev.title, 'Charla');
    assert.equal(nextOf(days, new Date(2026, 10, 2, 9, 0).getTime()).ev.title, 'Teatro');
    assert.equal(nextOf(days, new Date(2026, 10, 2, 18, 0).getTime()).ev.title, 'Residencia');
    assert.equal(nextOf([], NOW), null);
});
