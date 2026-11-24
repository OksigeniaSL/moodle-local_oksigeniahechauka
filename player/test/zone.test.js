// The hour of the centre, whatever time zone the device says it is in: a television on mainland time in a centre on the
// Canary Islands, put right with the server's clock, was an hour ahead.
import {test, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {here, setZone, zoneMinutes} from '../src/zone.js';
import {realClock, simulatedClock} from '../src/clock.js';
import {wallOf} from '../src/rules.js';
import {daysBetween, timeOf} from '../src/jornadas.js';
import {dayOf, hourOf} from '../src/tactil.js';
import {dayOf as birthdayOf} from '../src/cumple-turnos.js';

const CANARY = [{from: 0, minutes: 0}, {from: Date.UTC(2027, 2, 28, 1) / 1000, minutes: 60},
    {from: Date.UTC(2027, 9, 31, 1) / 1000, minutes: 0}];
const ZONES = ['Atlantic/Canary', 'Europe/Madrid', 'UTC', 'America/Bogota', 'Asia/Kolkata', 'Australia/Lord_Howe'];
const own = process.env.TZ;

afterEach(() => {
    setZone(null);
    if (own === undefined) {
        delete process.env.TZ;
    } else {
        process.env.TZ = own;
    }
});

test('the screen writes the hour of the centre from any zone of the device', () => {
    for (const zone of ZONES) {
        process.env.TZ = zone;
        setZone(CANARY);
        const at = Date.UTC(2026, 10, 24, 13, 18, 10);
        assert.equal(wallOf(new Date(at)).stamp, '2026-11-24T13:18', zone);
        assert.equal(timeOf(at), '13:18', zone);
        assert.equal(hourOf(at / 1000), '13:18', zone);
        // In summer, an hour more; the change of hour comes by itself, without another manifest.
        assert.equal(wallOf(new Date(Date.UTC(2027, 2, 28, 0, 59))).stamp, '2027-03-28T00:59', zone);
        assert.equal(wallOf(new Date(Date.UTC(2027, 2, 28, 1, 30))).stamp, '2027-03-28T02:30', zone);
        assert.equal(wallOf(new Date(Date.UTC(2027, 5, 1, 12, 0))).stamp, '2027-06-01T13:00', zone);
        assert.equal(wallOf(new Date(Date.UTC(2027, 10, 2, 12, 0))).stamp, '2027-11-02T12:00', zone);
    }
});

test('the day is the centre’s too', () => {
    for (const zone of ZONES) {
        process.env.TZ = zone;
        setZone(CANARY);
        const late = Date.UTC(2026, 10, 24, 23, 40);
        assert.equal(wallOf(new Date(late)).date, '2026-11-24', zone);
        assert.equal(wallOf(new Date(late)).dow, 2, zone);
        assert.equal(dayOf(late), '2026-11-24', zone);
        assert.equal(birthdayOf(new Date(late)), '2026-11-24', zone);
        assert.equal(daysBetween(late, late + 30 * 60000), 1, zone);
    }
});

test('the television of the case: an hour behind and on mainland time, its screen right', () => {
    process.env.TZ = 'Europe/Madrid';
    const real = Date.now;
    const server = Date.UTC(2026, 10, 24, 13, 18, 10);
    Date.now = () => server - 3627000;
    try {
        const clock = realClock();
        clock.heard(server, Date.now(), Date.now());
        // Put right with the server's time, and written in the device's zone: an hour ahead. As it was.
        assert.equal(clock.wall().stamp, '2026-11-24T14:18');
        setZone(CANARY);
        assert.equal(clock.wall().stamp, '2026-11-24T13:18');
        assert.equal(here(clock.date()).getHours(), 13);
        // The moment itself is not touched: only how it is read.
        assert.ok(Math.abs(clock.now() - server) < 1000);
    } finally {
        Date.now = real;
    }
});

test('the names of the day and the month, too', () => {
    process.env.TZ = 'Australia/Lord_Howe';
    setZone(CANARY);
    const d = here(Date.UTC(2026, 10, 24, 23, 40));
    assert.equal(d.toLocaleDateString('en', {weekday: 'long'}), 'Tuesday');
    assert.equal(d.toLocaleDateString('en', {day: 'numeric', month: 'long'}), 'November 24');
});

test('until a manifest says it, and with one that says nothing sensible, the device’s own zone', () => {
    process.env.TZ = 'Europe/Madrid';
    for (const said of [undefined, null, [], 'x', [{from: 'a', minutes: 0}], [{from: 0, minutes: 5000}]]) {
        setZone(said);
        assert.equal(zoneMinutes(Date.now()), null);
        assert.equal(wallOf(new Date(2026, 10, 24, 9, 5)).stamp, '2026-11-24T09:05');
    }
});

test('a preview of a chosen moment shows that moment', () => {
    process.env.TZ = 'America/Bogota';
    setZone(null);
    assert.equal(simulatedClock('2026-11-24T10:00').wall().stamp, '2026-11-24T10:00');
});
