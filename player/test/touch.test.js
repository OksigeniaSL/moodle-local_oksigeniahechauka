import test from 'node:test';
import assert from 'node:assert/strict';
import {shareOf, Touches} from '../src/touch.js';

function fakeWindow(extra) {
    const listeners = {};
    const win = Object.assign({
        innerWidth: 1080,
        innerHeight: 1920,
        devicePixelRatio: 2,
        navigator: {maxTouchPoints: 10},
        PointerEvent: function () {},
        document: {
            addEventListener(type, fn, options) {
                listeners[type] = {fn, options};
            },
        },
    }, extra || {});
    return {win, listeners};
}

test('the place, as a share of the page, kept inside it', () => {
    assert.deepEqual(shareOf(540, 1440, 1080, 1920), {x: 0.5, y: 0.75});
    assert.deepEqual(shareOf(-5, 3000, 1080, 1920), {x: 0, y: 1});
    assert.deepEqual(shareOf(10, 10, 0, 0), {x: 0, y: 0});
});

test('before any touch, only what the device says', () => {
    const {win} = fakeWindow();
    assert.deepEqual(new Touches(win).report(), {points: 10, pointer: true, ratio: 2});
    const old = fakeWindow({navigator: {}, PointerEvent: undefined, devicePixelRatio: undefined}).win;
    assert.deepEqual(new Touches(old).report(), {points: 0, pointer: false, ratio: 1});
});

test('it listens before anything else, without stopping anything, and counts each kind', () => {
    const {win, listeners} = fakeWindow();
    const t = new Touches(win).listen();
    assert.deepEqual(Object.keys(listeners).sort(), ['mousedown', 'pointerdown', 'touchstart']);
    assert.deepEqual(listeners.pointerdown.options, {capture: true, passive: true});
    listeners.pointerdown.fn({type: 'pointerdown', pointerType: 'touch', clientX: 108, clientY: 1728});
    listeners.touchstart.fn({type: 'touchstart', touches: [{clientX: 108, clientY: 1728}]});
    listeners.pointerdown.fn({type: 'pointerdown', pointerType: 'touch', clientX: 972, clientY: 192});
    listeners.mousedown.fn({type: 'mousedown', clientX: 5, clientY: 5});
    assert.deepEqual(t.report(), {
        points: 10, pointer: true, ratio: 2,
        events: {pointerdown: 2, touchstart: 1, mousedown: 1},
        last: {type: 'pointerdown', kind: 'touch', x: 0.9, y: 0.1},
    });
});

test('an event without a place still counts', () => {
    const {win, listeners} = fakeWindow();
    const t = new Touches(win).listen();
    listeners.touchstart.fn({type: 'touchstart', touches: []});
    assert.deepEqual(t.report().events, {pointerdown: 0, touchstart: 1, mousedown: 0});
    assert.equal(t.report().last, null);
});

test('with only a mouse, the mouse is the last one', () => {
    const {win, listeners} = fakeWindow();
    const t = new Touches(win).listen();
    listeners.mousedown.fn({type: 'mousedown', clientX: 540, clientY: 480});
    assert.deepEqual(t.report().last, {type: 'mousedown', kind: '', x: 0.5, y: 0.25});
});

test('without Pointer Events, the touch is the last one', () => {
    const {win, listeners} = fakeWindow({PointerEvent: undefined});
    const t = new Touches(win).listen();
    listeners.touchstart.fn({type: 'touchstart', touches: [{clientX: 108, clientY: 1728}]});
    listeners.mousedown.fn({type: 'mousedown', clientX: 108, clientY: 1728});
    assert.deepEqual(t.report().last, {type: 'touchstart', kind: '', x: 0.1, y: 0.9});
});
