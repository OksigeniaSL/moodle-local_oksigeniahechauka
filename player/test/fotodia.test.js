// «La foto del día»: the picture's shape, the frame it gets from the room, and its movement.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aspectOf, frameOf} from '../src/fotodia.js';
import {rulesOf} from '../src/movimiento.js';

test('the shape comes from the media, else from the orientation, else landscape', () => {
    assert.equal(aspectOf({image: {width: 1600, height: 1267}}), 1600 / 1267);
    assert.equal(aspectOf({image: {}, orientation: 'v'}), 3 / 4);
    assert.equal(aspectOf({image: {}}), 4 / 3);
    assert.equal(aspectOf({image: {width: 0, height: 0}, orientation: 'h'}), 4 / 3);
});

test('a landscape picture on a wide screen takes all the height it can, leaving the words their share', () => {
    const f = frameOf(1800, 800, 4 / 3, true, 0.32);
    assert.ok(f.w <= 1800 * 0.68 && f.h <= 800);
    assert.equal(f.w, Math.floor(Math.min(1800 * 0.68, 800 * 4 / 3)));
});

test('a portrait picture on a wide screen is never cut: it is as tall as the room, and narrower', () => {
    const f = frameOf(1800, 800, 0.67, true, 0.44);
    assert.equal(f.h, Math.floor(Math.floor(800 * 0.67) / 0.67));
    assert.ok(f.h <= 800 && f.w < 600);
});

test('on an upright screen the picture is as wide as the room, or shorter so the words keep their share', () => {
    const wide = frameOf(1000, 1600, 4 / 3, false, 0.34);
    assert.equal(wide.w, 1000);
    const tall = frameOf(1000, 1600, 0.67, false, 0.36);
    assert.ok(tall.h <= 1600 * 0.64 + 1 && tall.w < 1000);
});

test('the slide has its movement: the plate, the picture, the words and the credit last', () => {
    const rules = rulesOf('fotodia');
    assert.ok(rules && rules.length === 6);
    assert.equal(rules[rules.length - 1][0], '.hk-fdd-credito');
});
