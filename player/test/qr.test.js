// The code drawn to be looked at (qrSvg, in nur.click's drawing): it keeps the code of qrPath, the emblem never takes
// more than half of what level H corrects in any block, and every colour stays dark enough for a camera. Whether a phone reads it is measured apart,
// with real decoders, blur and noise (the art direction's bench); here, what can be proved without a camera.

import {test} from 'node:test';
import assert from 'node:assert/strict';
import qrcode from 'qrcode-generator';
import {qrPath, qrSvg, qrShape, plateFor, onWhite, alignmentCentres, HECHAUKA_EMBLEM, QR_INK} from '../src/qr.js';

const SHORT = 'https://s.example/UCYA';
const LIBRARY = 'https://s.example/biblioteca';
const LONG = 'https://example.org/local/oksigeniahechauka/claim.php?code=KM7Q4X';
const EMBLEM = {svg: '<rect width="10" height="10" rx="2" fill="#1f5f8b"/>', box: '0 0 10 10'};

// --- Where each codeword lies (ISO/IEC 18004, 7.7.3), to count what a plate covers ------------------------------------

// Level H: [blocks, total codewords, data codewords] (table 9); 1-H keeps one codeword for misdecode protection.
const H_BLOCKS = {
    1: [[1, 26, 9]], 2: [[1, 44, 16]], 3: [[2, 35, 13]], 4: [[4, 25, 9]], 5: [[2, 33, 11], [2, 34, 12]],
    6: [[4, 43, 15]], 7: [[4, 39, 13], [1, 40, 14]],
};
const MASKS = [
    (i, j) => (i + j) % 2 === 0, (i) => i % 2 === 0, (i, j) => j % 3 === 0, (i, j) => (i + j) % 3 === 0,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0, (i, j) => (i * j) % 2 + (i * j) % 3 === 0,
    (i, j) => ((i * j) % 2 + (i * j) % 3) % 2 === 0, (i, j) => ((i * j) % 3 + (i + j) % 2) % 2 === 0,
];

function functionMap(version) {
    const n = version * 4 + 17;
    const f = Array.from({length: n}, () => new Array(n).fill(false));
    const box = (x, y, w, h) => {
        for (let r = y; r < y + h; r++) {
            for (let c = x; c < x + w; c++) {
                f[r][c] = true;
            }
        }
    };
    box(0, 0, 9, 9);
    box(n - 8, 0, 8, 9);
    box(0, n - 8, 9, 8);
    for (let i = 0; i < n; i++) {
        f[6][i] = true;
        f[i][6] = true;
    }
    const at = alignmentCentres(version);
    for (const y of at) {
        for (const x of at) {
            if (!((x < 9 && y < 9) || (x > n - 9 && y < 9) || (x < 9 && y > n - 9))) {
                box(x - 2, y - 2, 5, 5);
            }
        }
    }
    if (version >= 7) {
        box(n - 11, 0, 3, 6);
        box(0, n - 11, 6, 3);
    }
    return f;
}

/** The modules that carry data, in the order of their bits. */
function order(version) {
    const n = version * 4 + 17;
    const f = functionMap(version);
    const out = [];
    let up = true;
    for (let col = n - 1; col > 0; col -= 2) {
        if (col === 6) {
            col--;
        }
        for (let k = 0; k < n; k++) {
            const row = up ? n - 1 - k : k;
            for (let c = 0; c < 2; c++) {
                if (!f[row][col - c]) {
                    out.push([row, col - c]);
                }
            }
        }
        up = !up;
    }
    return out;
}

function blocks(version) {
    const out = [];
    H_BLOCKS[version].forEach(([count, total, data]) => {
        for (let i = 0; i < count; i++) {
            out.push({total, data});
        }
    });
    return out;
}

/** For each codeword of the interleaved sequence, its block. */
function blockOf(version) {
    const bs = blocks(version);
    const out = [];
    const most = Math.max(...bs.map((b) => b.data));
    for (let j = 0; j < most; j++) {
        bs.forEach((b, i) => j < b.data && out.push(i));
    }
    for (let j = 0; j < bs[0].total - bs[0].data; j++) {
        bs.forEach((b, i) => out.push(i));
    }
    return out;
}

/** The share of its correction that a centred plate of w × h takes in the worst block (Infinity on a pattern). */
function damage(version, w, h) {
    const n = version * 4 + 17;
    const f = functionMap(version);
    const of = blockOf(version);
    const bs = blocks(version);
    const where = new Map();
    order(version).forEach(([r, c], bit) => where.set(r * n + c, bit >> 3));
    const hit = new Set();
    for (let r = (n - h) / 2; r < (n + h) / 2; r++) {
        for (let c = (n - w) / 2; c < (n + w) / 2; c++) {
            if (f[r][c]) {
                return Infinity;
            }
            const cw = where.get(r * n + c);
            if (cw < of.length) {
                hit.add(cw);
            }
        }
    }
    const per = bs.map(() => 0);
    hit.forEach((cw) => per[of[cw]]++);
    return Math.max(...per.map((k, i) => k / Math.floor((bs[i].total - bs[i].data - (version === 1 ? 1 : 0)) / 2)));
}

test('the codeword map is the real one: a code of qrcode-generator reads back through it', () => {
    for (let v = 1; v <= 7; v++) {
        const room = blocks(v).reduce((s, b) => s + b.data, 0) - 2;
        const text = ('https://example.org/' + 'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(3)).slice(0, room);
        const q = qrcode(v, 'H');
        q.addData(text, 'Byte');
        q.make();
        const of = blockOf(v);
        const bs = blocks(v);
        const read = MASKS.some((mask) => {
            const bytes = new Array(of.length).fill(0);
            order(v).slice(0, of.length * 8).forEach(([r, c], i) => {
                bytes[i >> 3] |= ((q.isDark(r, c) ? 1 : 0) ^ (mask(r, c) ? 1 : 0)) << (7 - (i & 7));
            });
            const per = bs.map(() => []);
            bytes.forEach((b, i) => per[of[i]].push(b));
            const data = [].concat(...per.map((p, i) => p.slice(0, bs[i].data)));
            const bit = (i) => (data[i >> 3] >> (7 - (i & 7))) & 1;
            const take = (at, len) => {
                let x = 0;
                for (let i = 0; i < len; i++) {
                    x = x * 2 + bit(at + i);
                }
                return x;
            };
            if (take(0, 4) !== 4 || take(4, 8) !== text.length) {
                return false;
            }
            let s = '';
            for (let i = 0; i < text.length; i++) {
                s += String.fromCharCode(take(12 + i * 8, 8));
            }
            return s === text;
        });
        assert.ok(read, 'version ' + v);
    }
});

test('every plate the emblem can get leaves half of what H corrects, in every block', () => {
    for (let v = 1; v <= 7; v++) {
        const seen = new Set();
        for (let ratio = 0.25; ratio <= 4; ratio *= 1.1) {
            const p = plateFor(v, ratio);
            if (!p) {
                continue;
            }
            seen.add(p.w + '×' + p.h);
            assert.ok(p.w % 2 === 1 && p.h % 2 === 1, 'odd sides');
            const d = damage(v, p.w, p.h);
            assert.ok(d <= 0.5, 'version ' + v + ', plate ' + p.w + '×' + p.h + ' takes ' + d.toFixed(2));
        }
        if (v === 1 || v >= 7) {
            assert.equal(seen.size, 0, 'no emblem on version ' + v);
        } else {
            assert.ok(seen.size > 0, 'some emblem on version ' + v);
        }
    }
});

test('a wide emblem gets a wide plate, a tall one a tall plate', () => {
    const square = plateFor(6, 1);
    const wide = plateFor(6, 3);
    const tall = plateFor(6, 1 / 3);
    assert.equal(square.w, square.h);
    assert.ok(wide.w > wide.h);
    assert.ok(tall.h > tall.w);
});

// --- The code itself ---------------------------------------------------------------------------------------------------

test('without an emblem it is the code of qrPath: level M, the same size', () => {
    for (const t of [SHORT, LIBRARY, LONG, 'https://example.org/' + 'x'.repeat(200)]) {
        const s = qrShape(t);
        assert.equal(s.level, 'M');
        assert.equal(s.size, qrPath(t).size);
        assert.equal(s.plate, null);
        assert.match(qrSvg(t), new RegExp('^<svg [^>]*viewBox="0 0 ' + s.size + ' ' + s.size + '"'));
    }
});

test('qrPath is as it was: one path of whole runs, no quiet zone', () => {
    const p = qrPath(SHORT);
    assert.equal(p.size, 25);
    assert.match(p.d, /^M0 0h7v1h-7z/);
});

test('with an emblem and a short link: level H, the plate in the middle and nothing drawn under it', () => {
    for (const [t, version, side] of [[SHORT, 3, 5], [LIBRARY, 4, 7]]) {
        for (const style of ['dots', 'soft', 'square']) {
            const s = qrShape(t, {emblem: EMBLEM, style});
            assert.equal(s.level, 'H');
            assert.equal(s.version, version);
            assert.deepEqual([s.plate.w, s.plate.h], [side, side]);
            assert.equal(s.plate.x * 2 + s.plate.w, s.size);
            assert.equal(s.plate.y * 2 + s.plate.h, s.size);
            // Each module (a dot, or a run of a row) starts at «M x y» inside its first module: none inside the plate.
            const starts = s.modules.match(/M[\d.]+ [\d.]+/g).map((m) => m.slice(1).split(' ').map(Number));
            for (const [x, y] of starts) {
                const c = Math.floor(x);
                const r = Math.floor(y);
                assert.ok(!(c >= s.plate.x && c < s.plate.x + s.plate.w && r >= s.plate.y && r < s.plate.y + s.plate.h),
                    style + ': a module at ' + c + ',' + r + ' under the plate');
            }
        }
        const svg = qrSvg(t, {emblem: EMBLEM});
        assert.match(svg, /data-nivel="H"/);
        assert.match(svg, /<svg x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" viewBox="0 0 10 10"/);
    }
});

test('emblemVersion: a bigger code for a bigger plate (9 × 9 at version 5, as nur.click\'s logo)', () => {
    const s = qrShape(SHORT, {emblem: EMBLEM, emblemVersion: 5});
    assert.equal(s.version, 5);
    assert.deepEqual([s.plate.w, s.plate.h], [9, 9]);
});

test('by default, nur.click\'s «circulos» and «cuadradas»; its own default, «redondeados» and «redondeadas», on asking', () => {
    const d = qrShape(SHORT);
    assert.doesNotMatch(d.modules, /h/);
    assert.match(d.modules, /a\.47 \.47 0 1 0 \.94 0/);
    assert.doesNotMatch(d.eyes.join(''), /a/);
    const n = qrShape(SHORT, {style: 'soft', corners: 'round'});
    assert.match(n.modules, /h/);
    assert.match(n.eyes[0], /^M2\.3 0h2\.4a2\.3 2\.3 0 0 1/);
    assert.match(qrShape(SHORT, {style: 'square'}).modules, /^M\d+ \d+h\d+v1h-\d+z/);
});

test('a link too long for an emblem keeps level M and no plate, rather than a centre the code needs', () => {
    const s = qrShape(LONG, {emblem: EMBLEM});
    assert.equal(s.level, 'M');
    assert.equal(s.plate, null);
    assert.doesNotMatch(qrSvg(LONG, {emblem: EMBLEM}), /<image|viewBox="0 0 10 10"/);
});

test('an emblem by its address: an <image> with the address escaped', () => {
    const svg = qrSvg(SHORT, {emblem: 'https://example.org/logo.php?a=1&b="2"'});
    assert.match(svg, /<image [^>]*xlink:href="https:\/\/example\.org\/logo\.php\?a=1&amp;b=&quot;2&quot;"/);
    assert.match(svg, /xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/);
});

test('Hechauka\'s mark fits as an emblem', () => {
    const svg = qrSvg(SHORT, {emblem: HECHAUKA_EMBLEM});
    assert.match(svg, /viewBox="0 0 64 64"/);
    assert.match(svg, /#00b8de/);
});

test('three eyes, each a ring and its dot, and every alignment pattern apart', () => {
    for (const t of [SHORT, LONG, 'https://example.org/' + 'x'.repeat(200)]) {
        const s = qrShape(t);
        assert.equal(s.eyes.length, 3);
        s.eyes.forEach((d) => assert.equal(d.match(/M/g).length, 3));
        const at = alignmentCentres(s.version);
        const count = s.version < 2 ? 0 : at.length * at.length - 3;
        assert.equal((s.aligns.match(/M/g) || []).length, count * 3, 'version ' + s.version);
    }
});

test('the alignment centres are where qrcode-generator puts its patterns', () => {
    for (let v = 2; v <= 40; v++) {
        const q = qrcode(v, 'L');
        q.addData('x');
        q.make();
        const n = q.getModuleCount();
        const at = alignmentCentres(v);
        assert.equal(at[0], 6);
        assert.equal(at[at.length - 1], n - 7);
        for (const y of at) {
            for (const x of at) {
                if ((x < 9 && y < 9) || (x > n - 9 && y < 9) || (x < 9 && y > n - 9)) {
                    continue;
                }
                assert.ok(q.isDark(y, x) && !q.isDark(y - 1, x) && q.isDark(y - 2, x), 'version ' + v + ' at ' + x + ',' + y);
            }
        }
    }
});

test('dots: each module its own dot', () => {
    const s = qrShape(SHORT);
    assert.ok(s.modules.length > 0);
    assert.doesNotMatch(s.modules, /h/);
    assert.equal(s.modules.match(/M/g).length, s.modules.match(/z/g).length);
});

test('the colours go in style, so the player\'s sheets (.hk-qr path) do not paint over them', () => {
    const svg = qrSvg(SHORT, {accent: '#0e4f5c'});
    assert.match(svg, /fill-rule="evenodd" style="fill:#0e4f5c"/);
    assert.match(svg, new RegExp('style="fill:' + QR_INK + '"'));
});

test('as nur.click with a centre\'s colours: the modules in its main colour, each eye in one of its colours', () => {
    const s = qrShape(SHORT, {ink: '#0e4f5c', eyes: ['#a8481a', '#4f6b2d', '#0e4f5c']});
    assert.equal(s.ink, '#0e4f5c');
    assert.deepEqual(s.eyeColours, ['#a8481a', '#4f6b2d', '#0e4f5c']);
    const svg = qrSvg(SHORT, {ink: '#0e4f5c', eyes: ['#a8481a', '#4f6b2d', '#0e4f5c']});
    assert.equal(svg.match(/fill-rule="evenodd" style="fill:#a8481a"/g).length, 1);
    // A main colour too light for the modules (a dark theme's) comes out deeper.
    assert.ok(contrast(qrShape(SHORT, {ink: '#17707f'}).ink) >= 7);
});

test('the text goes in UTF-8', () => {
    // Eight «ñ» are sixteen bytes in UTF-8: more than version 1 at M holds (14).
    assert.equal(qrShape('ñ'.repeat(8)).version, 2);
});

test('a text too long for any code throws, as qrPath', () => {
    assert.throws(() => qrSvg('x'.repeat(3000)));
});

// --- The eyes' colour --------------------------------------------------------------------------------------------------

function contrast(hex) {
    const lin = (i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 1.05 / (0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5) + 0.05);
}

test('a light accent comes out deep enough for a camera, its hue kept', () => {
    for (const c of ['#ff8a3d', '#ff9a54', '#ffb48a', '#f6d32d', '#e8a33a', '#00b8de', '#ffffff', 'rgb(255, 138, 61)']) {
        const out = onWhite(c);
        assert.match(out, /^#[0-9a-f]{6}$/);
        assert.ok(contrast(out) >= 4.5, c + ' gives ' + out);
        assert.ok(contrast(out) < 5.2, c + ' gives ' + out + ': not darker than it needs');
    }
    // The orange stays orange: more red than green, more green than blue.
    const o = onWhite('#ff8a3d');
    assert.ok(parseInt(o.slice(1, 3), 16) > parseInt(o.slice(3, 5), 16));
    assert.ok(parseInt(o.slice(3, 5), 16) > parseInt(o.slice(5, 7), 16));
});

test('a colour already dark enough stays as it is; one that cannot be read gives the ink', () => {
    assert.equal(onWhite('#0e4f5c'), '#0e4f5c');
    assert.equal(onWhite('#A8480A'), '#a8480a');
    assert.equal(onWhite('rgb(14, 79, 92)'), '#0e4f5c');
    assert.equal(onWhite('var(--x)'), QR_INK);
    assert.deepEqual(qrShape(SHORT, {accent: 'nonsense'}).eyeColours, [QR_INK, QR_INK, QR_INK]);
});
