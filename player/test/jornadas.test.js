// «Puertas abiertas» without a page: where each act is (the days before, its day, while it lasts), how often it comes and
// in which order, the words of how near it is, its hours and its turns, the places left, when «have already come» is
// said, and that the sheet stays with what Chromium 56 understands. The times are local, as the device's.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OPEN_EVERY, actShows, cameShows, daysBetween, hoursOf, isFull, leftToSay, openActsNow, phaseOf, turnsOf, whenWords}
    from '../src/jornadas.js';
import {Composer} from '../src/compose.js';

// A local moment: 2026-11-<day> at <h>:<m>, in seconds.
const at = (day, h, m) => Math.floor(new Date(2026, 10, day, h || 0, m || 0).getTime() / 1000);
const ms = (day, h, m) => at(day, h, m) * 1000;
const act = (o) => Object.assign({kind: 'openday', name: 'Jornada de puertas abiertas', place: 'Salón de actos',
    timestart: at(21, 10), timeend: at(21, 13), web: 'https://centro.example/jornada'}, o || {});
const S = {open_today: 'Hoy', open_tomorrow: 'Mañana', open_this: 'Este {day}', open_in: 'Faltan {n} días',
    days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], place_time_range: '{from} – {until}'};

test('an act is shown up to thirty days before, on its day, and while it lasts; not after, nor too far', () => {
    const a = act();
    assert.equal(phaseOf(a, ms(21, 11)), 'ahora');
    assert.equal(phaseOf(a, ms(21, 9, 30)), 'hoy');
    assert.equal(phaseOf(a, ms(20, 23, 59)), 'antes');
    assert.equal(phaseOf(a, ms(21, 13)), null, 'over at its end');
    assert.equal(phaseOf(a, ms(21, 18)), null);
    assert.equal(phaseOf(act({timestart: at(21, 10) + 31 * 86400, timeend: at(21, 13) + 31 * 86400}), ms(21, 10)), null);
    assert.equal(phaseOf(act({timestart: at(21, 10) + 30 * 86400, timeend: at(21, 13) + 30 * 86400}), ms(21, 9)), 'antes');
    assert.equal(daysBetween(ms(20, 23, 50), ms(21, 0, 10)), 1, 'calendar days, not 24 hours');
});

test('an act needs its name and its start', () => {
    assert.ok(actShows(act()));
    assert.equal(actShows(act({name: '  '})), false);
    assert.equal(actShows(act({timestart: 0})), false);
    assert.equal(actShows(null), false);
});

test('how often: every other slide while one lasts, and only those; one in four on its day; eight its week; fourteen before', () => {
    const talk = act({kind: 'other', name: 'Charla para familias', timestart: at(26, 18), timeend: at(26, 19)});
    const item = {type: 'openacts', acts: [talk, act()]};
    const live = openActsNow(item, ms(21, 11));
    assert.equal(live.every, OPEN_EVERY.ahora);
    assert.deepEqual(live.acts.map((x) => x.act.name), ['Jornada de puertas abiertas'], 'that day the screens are its');
    assert.equal(openActsNow(item, ms(21, 8)).every, OPEN_EVERY.hoy);
    const week = openActsNow(item, ms(15, 12));
    assert.equal(week.every, OPEN_EVERY.semana);
    assert.deepEqual(week.acts.map((x) => x.act.name), ['Jornada de puertas abiertas', 'Charla para familias'],
        'in the order they start');
    assert.equal(openActsNow(item, ms(3, 12)).every, OPEN_EVERY.antes);
    assert.equal(openActsNow(item, ms(27, 12)), null, 'all over');
    assert.equal(openActsNow({type: 'openacts', acts: []}, ms(3, 12)), null);
    assert.equal(openActsNow(null, ms(3, 12)), null);
});

test('the composer gives its turn at its cadence, never two in a row, and one act a turn', () => {
    const queue = [1, 2, 3, 4, 5, 6].map((n) => ({id: 'p' + n, type: 'image', media: {width: 1920, height: 1080}}));
    const talk = act({kind: 'other', name: 'Charla', timestart: at(26, 18), timeend: at(26, 19)});
    const before = openActsNow({acts: [act(), talk]}, ms(3, 12));
    const c = new Composer();
    const seen = [];
    for (let i = 0; i < 60; i++) {
        const r = c.next(queue, 2, true, {openacts: before});
        seen.push(r.comp === 'jornadas' ? r.extra.item.name : '-');
    }
    const shown = seen.filter((x) => x !== '-');
    assert.ok(shown.length >= 3 && shown.length <= 5, 'one in fourteen: ' + shown.length);
    assert.deepEqual(shown.slice(0, 2), ['Jornada de puertas abiertas', 'Charla'], 'one act a turn');
    const d = new Composer();
    const day = openActsNow({acts: [act()]}, ms(21, 11));
    const run = [];
    for (let i = 0; i < 20; i++) {
        run.push(d.next(queue, 2, true, {openacts: day}).comp);
    }
    assert.ok(run.filter((x) => x === 'jornadas').length >= 9, 'every other slide while it lasts');
    for (let i = 1; i < run.length; i++) {
        assert.ok(!(run[i] === 'jornadas' && run[i - 1] === 'jornadas'), 'never two in a row');
    }
    const e = new Composer();
    const shop = [];
    for (let i = 0; i < 12; i++) {
        shop.push(e.next(queue, 0, true, {use: 'showcase', openacts: day}).comp);
    }
    assert.ok(shop.filter((x) => x === 'jornadas').length >= 3, 'a showcase too, one in three, while it lasts');
    const f = new Composer();
    for (let i = 0; i < 30; i++) {
        assert.notEqual(f.next(queue, 0, true, {use: 'showcase', openacts: before}).comp, 'jornadas',
            'a showcase does not invite days before');
    }
});

test('the words of how near: today, tomorrow, this weekday, or how many days are left', () => {
    const a = act();
    assert.equal(whenWords(a, ms(21, 8), S), 'Hoy');
    assert.equal(whenWords(a, ms(20, 12), S), 'Mañana');
    assert.equal(whenWords(a, ms(17, 12), S), 'Este sábado');
    assert.equal(whenWords(a, ms(17, 12), S, true), 'Este Sábado', 'the weekday as the site writes it, in English or German');
    assert.equal(whenWords(a, ms(3, 12), S), 'Faltan 18 días');
});

test('the hours and the turns, with their state now', () => {
    assert.equal(hoursOf(act(), S), '10:00\u00a0–\u00a013:00', 'never broken inside');
    assert.equal(hoursOf(act({timeend: 0}), S), '10:00');
    const turns = [{timestart: at(21, 11), timeend: at(21, 12), full: true}, {timestart: at(21, 10), timeend: at(21, 11)},
        {timestart: at(21, 12), timeend: at(21, 13), full: false}];
    assert.deepEqual(turnsOf(act({turns}), ms(21, 11, 30)).map((t) => t.at + ' ' + t.state),
        ['10:00 pasado', '11:00 ahora', '12:00 libre'], 'in order; the one now is now, full or not');
    assert.deepEqual(turnsOf(act({turns}), ms(17, 12)).map((t) => t.state), ['libre', 'lleno', 'libre']);
});

test('full, and the places left only when they are few', () => {
    assert.equal(isFull(act({capacity: 80, signed: 80})), true);
    assert.equal(isFull(act({turns: [{timestart: at(21, 10), full: true}, {timestart: at(21, 11), full: true}]})), true);
    assert.equal(isFull(act({turns: [{timestart: at(21, 10), full: true}, {timestart: at(21, 11)}]})), false);
    assert.equal(leftToSay(act({capacity: 80, signed: 30})), 0, 'fifty left: not said');
    assert.equal(leftToSay(act({capacity: 80, signed: 62})), 18, 'a quarter of eighty: said');
    assert.equal(leftToSay(act({capacity: 30, signed: 22})), 8);
    assert.equal(leftToSay(act({capacity: 30, signed: 30})), 0);
    assert.equal(leftToSay(act()), 0, 'without a capacity, nothing');
});

test('«have already come» from a handful of families, never two', () => {
    assert.equal(cameShows(2, 40), false);
    assert.equal(cameShows(9, 40), false);
    assert.equal(cameShows(10, 40), true);
    assert.equal(cameShows(23, 40), true);
    assert.equal(cameShows(5, 8), true, 'a small act: half of those signed up, five at least');
    assert.equal(cameShows(4, 6), false);
    assert.equal(cameShows(null, 40), false);
});

test('the sheet stays with what Chromium 56 understands', () => {
    const css = readFileSync(new URL('../jornadas.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const bad of [/\bgap\s*:/, /\bclamp\(/, /aspect-ratio/, /\binset\s*:/, /:has\(/, /color-mix/, /\bmin\(/, /\bmax\(/]) {
        assert.doesNotMatch(css, bad, String(bad));
    }
});
