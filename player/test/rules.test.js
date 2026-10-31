// The schedule rules of the contract, on fixed wall times: nothing here depends on the clock of the machine.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dayNumber, eventOver, inRange, isDark, isLive, isPowerOn, liveItems, matchesWhen, wallOf, weekdayOf}
    from '../src/rules.js';

function wall(stamp) {
    const [date, hm] = stamp.split('T');
    const [h, m] = hm.split(':').map(Number);
    return {date, dow: weekdayOf(dayNumber(date)), min: h * 60 + m, stamp};
}

test('weekdays: 2 November 2026 is a Monday, 8 November a Sunday', () => {
    assert.equal(weekdayOf(dayNumber('2026-11-02')), 1);
    assert.equal(weekdayOf(dayNumber('2026-11-08')), 7);
    assert.equal(weekdayOf(dayNumber('1970-01-01')), 4);
});

test('wallOf reads the local clock of a Date', () => {
    const w = wallOf(new Date(2026, 10, 2, 9, 5));
    assert.deepEqual(w, {date: '2026-11-02', dow: 1, min: 545, stamp: '2026-11-02T09:05'});
});

test('no «when» is always on', () => {
    assert.equal(matchesWhen(undefined, wall('2026-11-02T10:00')), true);
    assert.equal(matchesWhen({}, wall('2026-11-02T10:00')), true);
});

test('first and last day are both included', () => {
    const when = {from: '2026-11-02', until: '2026-11-06'};
    assert.equal(matchesWhen(when, wall('2026-11-01T23:59')), false);
    assert.equal(matchesWhen(when, wall('2026-11-02T00:00')), true);
    assert.equal(matchesWhen(when, wall('2026-11-06T23:59')), true);
    assert.equal(matchesWhen(when, wall('2026-11-07T00:00')), false);
});

test('weekdays of the rule', () => {
    const when = {days: [1, 3, 5]};
    assert.equal(matchesWhen(when, wall('2026-11-02T10:00')), true);
    assert.equal(matchesWhen(when, wall('2026-11-03T10:00')), false);
    assert.equal(matchesWhen(when, wall('2026-11-04T10:00')), true);
});

test('time ranges: start included, end excluded, and across midnight', () => {
    assert.equal(inRange(['08:00', '10:30'], 8 * 60), true);
    assert.equal(inRange(['08:00', '10:30'], 10 * 60 + 30), false);
    assert.equal(inRange(['22:00', '02:00'], 23 * 60), true);
    assert.equal(inRange(['22:00', '02:00'], 60), true);
    assert.equal(inRange(['22:00', '02:00'], 12 * 60), false);
    const when = {times: [['08:00', '09:00'], ['14:00', '15:00']]};
    assert.equal(matchesWhen(when, wall('2026-11-02T14:30')), true);
    assert.equal(matchesWhen(when, wall('2026-11-02T11:00')), false);
});

test('every two weeks counts from the week of the first day', () => {
    // From Wednesday 4 November: weeks of 2, 16 and 30 November are on; 9 and 23 are off.
    const when = {from: '2026-11-04', every: 2, days: [1]};
    assert.equal(matchesWhen(when, wall('2026-11-02T10:00')), false);
    assert.equal(matchesWhen(when, wall('2026-11-09T10:00')), false);
    assert.equal(matchesWhen(when, wall('2026-11-16T10:00')), true);
    assert.equal(matchesWhen(when, wall('2026-11-23T10:00')), false);
    assert.equal(matchesWhen(when, wall('2026-11-30T10:00')), true);
    assert.equal(matchesWhen({from: '2026-11-04', every: 2}, wall('2026-11-05T10:00')), true);
});

test('every three weeks, across the end of a year', () => {
    const when = {from: '2026-12-21', every: 3};
    assert.equal(matchesWhen(when, wall('2026-12-23T10:00')), true);
    assert.equal(matchesWhen(when, wall('2026-12-30T10:00')), false);
    assert.equal(matchesWhen(when, wall('2027-01-11T10:00')), true);
});

test('an event goes away once it is over', () => {
    const ev = {type: 'event', start: '2026-11-02T10:30', end: '2026-11-02T11:30'};
    assert.equal(eventOver(ev, wall('2026-11-02T11:00')), false);
    assert.equal(eventOver(ev, wall('2026-11-02T11:30')), true);
    assert.equal(eventOver({type: 'event', start: '2026-11-02T10:30'}, wall('2026-11-02T10:31')), true);
    const allday = {type: 'event', start: '2026-11-02', allday: true};
    assert.equal(eventOver(allday, wall('2026-11-02T23:00')), false);
    assert.equal(eventOver(allday, wall('2026-11-03T00:00')), true);
    assert.equal(isLive(ev, wall('2026-11-02T12:00')), false);
});

test('power hours', () => {
    const power = [{days: [1, 2, 3, 4, 5], on: '07:30', off: '18:30'}];
    assert.equal(isPowerOn(power, wall('2026-11-02T07:29')), false);
    assert.equal(isPowerOn(power, wall('2026-11-02T07:30')), true);
    assert.equal(isPowerOn(power, wall('2026-11-02T18:30')), false);
    assert.equal(isPowerOn(power, wall('2026-11-07T10:00')), false);
    assert.equal(isPowerOn(undefined, wall('2026-11-07T10:00')), true);
});

test('the dark theme: always, never or by hours', () => {
    assert.equal(isDark({mode: 'dark'}, wall('2026-11-02T12:00')), true);
    assert.equal(isDark({mode: 'light'}, wall('2026-11-02T22:00')), false);
    const auto = {mode: 'auto', dark_from: '19:00', dark_until: '07:30'};
    assert.equal(isDark(auto, wall('2026-11-02T20:00')), true);
    assert.equal(isDark(auto, wall('2026-11-02T06:00')), true);
    assert.equal(isDark(auto, wall('2026-11-02T12:00')), false);
});

test('live items of a zone, in their order', () => {
    const items = [
        {id: 'b', zone: 'main', order: 2},
        {id: 'a', zone: 'main', order: 1},
        {id: 'c', zone: 'side', order: 0},
        {id: 'd', zone: 'main', order: 3, when: {until: '2026-11-01'}},
    ];
    assert.deepEqual(liveItems(items, 'main', wall('2026-11-02T10:00')).map((i) => i.id), ['a', 'b']);
});
