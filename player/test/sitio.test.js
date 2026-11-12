// The place of a screen: open or closed now, in words, from the screen's clock.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hm, placeLine, placeState, placeWords, todayHours, weekRows} from '../src/sitio.js';

const LIBRARY = {name: 'Biblioteca', hours: [{days: [1, 2, 3, 4], from: '08:00', until: '17:00'},
    {days: [5], from: '08:00', until: '14:00'}], closed: ['2026-11-04'], words: {open: 'Abierta', closed: 'Cerrada'}};
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const names = {days: DAYS, lower: true, date: (d) => d.slice(8, 10).replace(/^0/, '') + ' de noviembre'};
const w = placeWords({}, {}, LIBRARY);
// 2 November 2026 is a Monday.
const at = (date, h, m) => ({date, min: h * 60 + (m || 0)});
const say = (state, place) => {
    const l = placeLine(state, place ? placeWords({}, {}, place) : w, names);
    return l.more ? l.state + ' · ' + l.more : l.state;
};

test('the hour as it is said', () => {
    assert.equal(hm(8 * 60), '8:00');
    assert.equal(hm(17 * 60 + 5), '17:05');
    assert.equal(hm(1440), '0:00');
});

test('open: until when', () => {
    assert.equal(say(placeState(LIBRARY, at('2026-11-02', 10, 45))), 'Abierta · hasta las 17:00');
    assert.equal(say(placeState(LIBRARY, at('2026-11-06', 13, 59))), 'Abierta · hasta las 14:00');
});

test('closed: when it opens, today, tomorrow, on a weekday or on a date', () => {
    assert.equal(say(placeState(LIBRARY, at('2026-11-02', 7, 10))), 'Cerrada · abre a las 8:00');
    assert.equal(say(placeState(LIBRARY, at('2026-11-02', 17, 0))), 'Cerrada · abre mañana a las 8:00');
    // Tuesday evening: Wednesday the 4th is closed, so Thursday.
    assert.equal(say(placeState(LIBRARY, at('2026-11-03', 18, 0))), 'Cerrada · abre el jueves a las 8:00');
    // Friday afternoon: on Monday.
    assert.equal(say(placeState(LIBRARY, at('2026-11-06', 15, 0))), 'Cerrada · abre el lunes a las 8:00');
    assert.equal(say(placeState(LIBRARY, at('2026-11-07', 11, 0))), 'Cerrada · abre el lunes a las 8:00');
    // A long closing: the date.
    const holidays = Object.assign({}, LIBRARY, {closed: ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']});
    assert.equal(say(placeState(holidays, at('2026-11-06', 15, 0))), 'Cerrada · abre el 16 de noviembre a las 8:00');
    // Never opening in the month ahead: only the state.
    const rare = {hours: [{days: [1], from: '08:00', until: '09:00'}], closed: ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']};
    assert.equal(say(placeState(rare, at('2026-11-02', 10, 0)), rare), 'Cerrado');
});

test('ranges that touch are one, a range may cross midnight, and «24:00» is the end of the day', () => {
    const split = {hours: [{days: [1], from: '08:00', until: '14:00'}, {days: [1], from: '14:00', until: '19:30'}]};
    assert.equal(say(placeState(split, at('2026-11-02', 9, 0)), split), 'Abierto · hasta las 19:30');
    const night = {hours: [{days: [5, 6], from: '20:00', until: '02:00'}]};
    assert.equal(say(placeState(night, at('2026-11-06', 23, 0)), night), 'Abierto · hasta las 2:00');
    assert.equal(say(placeState(night, at('2026-11-07', 1, 30)), night), 'Abierto · hasta las 2:00');
    assert.equal(say(placeState(night, at('2026-11-07', 3, 0)), night), 'Cerrado · abre a las 20:00');
    const late = {hours: [{from: '18:00', until: '24:00'}]};
    assert.equal(say(placeState(late, at('2026-11-02', 23, 59)), late), 'Abierto · hasta las 0:00');
});

test('without hours there is nothing to say', () => {
    assert.equal(placeState(null, at('2026-11-02', 10)), null);
    assert.equal(placeState({name: 'Biblioteca'}, at('2026-11-02', 10)), null);
    assert.deepEqual(placeLine(null, w, names), {state: '', more: ''});
});

test('the words: the labels over the strings over the player\'s; the place\'s own state words over all', () => {
    const own = placeWords({place_until: 'until {time}'}, {place_open: 'Open', place_until: 'x'}, {});
    assert.equal(own.place_open, 'Open');
    assert.equal(own.place_until, 'until {time}');
    assert.equal(own.place_closed, 'Cerrado');
    assert.equal(w.place_open, 'Abierta');
});

test('today\'s hours and the week, the days with the same hours together', () => {
    assert.equal(todayHours(LIBRARY, at('2026-11-02', 10), w), '8:00 – 17:00');
    assert.equal(todayHours(LIBRARY, at('2026-11-04', 10), w), 'Cerrada');
    assert.equal(todayHours(LIBRARY, at('2026-11-07', 10), w), 'Cerrada');
    assert.deepEqual(weekRows(LIBRARY, w, names, 1).map((r) => r.days + ' · ' + r.hours + (r.today ? ' (hoy)' : '')), [
        'Lunes a jueves · 8:00 – 17:00 (hoy)',
        'Viernes · 8:00 – 14:00',
        'Sábado y domingo · Cerrada',
    ]);
    const english = weekRows(LIBRARY, placeWords({}, {place_days_range: '{from} to {until}', place_days_pair: '{from} and {until}',
        place_closed: 'Closed'}, {}), {days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        lower: false}, 6);
    assert.deepEqual(english.map((r) => r.days), ['Monday to Thursday', 'Friday', 'Saturday and Sunday']);
    assert.equal(english[2].today, true);
});
