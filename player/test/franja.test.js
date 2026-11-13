// The birthday strip's garland and paper, without a page.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {garland, garlandPlan, paper, stripKey} from '../src/franja.js';

test('the garland hangs from a point every 200 to 250 px at 3 m, with pennants of 22 to 26 px', () => {
    // At 3 m on a 1080 screen the garland is 4.8 rem: 48 px.
    for (const w of [1920, 1080, 1280]) {
        const p = garlandPlan(w, 48);
        assert.ok(p.span >= 200 && p.span <= 260, w + ': ' + p.span);
        assert.equal(p.points.length, p.swags.length + 1);
        assert.ok(p.fw >= 22 && p.fw <= 26, String(p.fw));
        // Every pennant hangs inside the garland's height.
        p.swags.forEach((s) => s.flags.forEach((f) => assert.ok(f.y + p.fh <= 48 + 0.5)));
    }
    // From afar it grows with the letter: the same number of swags, larger.
    const far = garlandPlan(1920, 79);
    assert.ok(far.span > 300 && far.fw > 36);
});

test('the pennants lean along the string: down on the way in, level in the middle, up on the way out', () => {
    const p = garlandPlan(1920, 48);
    const flags = p.swags[0].flags;
    assert.ok(flags[0].a > 0.05);
    assert.ok(flags[flags.length - 1].a < -0.05);
    assert.ok(Math.abs(flags[0].a + flags[flags.length - 1].a) < 1e-9);
});

test('the four colours of the skin take turns; each swag is an element of its own, the points a still drawing', () => {
    const svg = garland(1920, 48);
    const swags = svg.match(/class="hk-franja-tramo"/g).length;
    assert.equal(swags, garlandPlan(1920, 48).swags.length);
    for (const k of [0, 1, 2, 3]) {
        assert.ok(svg.indexOf('hk-franja-banderin-' + k) !== -1);
    }
    assert.equal((svg.match(/<circle/g) || []).length, swags + 1);
});

test('the printed confetti is always the same for the same size', () => {
    assert.equal(paper(1920, 140, 17), paper(1920, 140, 17));
    assert.ok((paper(1920, 140, 17).match(/hk-franja-confeti-/g) || []).length > 20);
});

test('on a screen the strip never takes the photo by its address, which asks for the key: only from the device', () => {
    const item = {people: [{name: 'A', photo: {sha1: 'x', url: 'https://moodle.example/api/media.php?f=1'}}]};
    assert.equal(stripKey(item, () => null), 'A|||');
    assert.equal(stripKey(item, () => 'blob:1'), 'A|||blob:1');
    // Without a device (the panel's preview), its address.
    assert.equal(stripKey(item, null), 'A|||https://moodle.example/api/media.php?f=1');
});

