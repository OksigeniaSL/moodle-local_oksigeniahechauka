// The QR of a web. Two ways: qrPath, the modules of the code as one SVG path (the showcase's plain code), and qrSvg, the
// code drawn to be looked at, in the drawing of nur.click's designed codes (for the centres whose shortener does not
// draw them): round dots, the eyes and alignment patterns whole and, when it fits, an emblem in the middle on its white
// plate. Both stay sharp at any size and need no network. The code is made
// by qrcode-generator (Kazuhiko Arase, MIT).

import qrcode from 'qrcode-generator';

/**
 * The modules of the QR of a text: its size and an SVG path of its dark modules (runs of a row joined), with no quiet
 * zone (the frame around it gives the margin).
 *
 * @param {string} text
 * @returns {{size: number, d: string}}
 */
export function qrPath(text) {
    const q = qrcode(0, 'M');
    // In UTF-8, as qrSvg: the library's own branch for it does not exist, and «ñ» or «€» came out wrong.
    q.addData(utf8(text));
    q.make();
    const size = q.getModuleCount();
    let d = '';
    for (let r = 0; r < size; r++) {
        let c = 0;
        while (c < size) {
            if (!q.isDark(r, c)) {
                c++;
                continue;
            }
            const start = c;
            while (c < size && q.isDark(r, c)) {
                c++;
            }
            d += 'M' + start + ' ' + r + 'h' + (c - start) + 'v1h-' + (c - start) + 'z';
        }
    }
    return {size, d};
}

/**
 * A web as people read it under its QR: without «https://», «www.» or a slash at the end.
 *
 * @param {string} url
 * @returns {string}
 */
export function shortWeb(url) {
    // What is after «?» or «#» (a mark of where the visit comes from) is for the address, not for reading.
    const web = String(url || '').replace(/[?#].*$/, '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
    // Too long to read from afar: where it goes, and the code does the rest.
    return web.length > 34 ? web.split('/')[0] : web;
}

// --- The code to be looked at ------------------------------------------------------------------------------------------

/** The modules' ink: pure black. Any colour, even a deep one, costs readings to the decoders that read edges (zbar). */
export const QR_INK = '#000000';

/** Hechauka's own mark («Dos pantallas», Gaudí), for the screens that are still nobody's: the pairing. */
export const HECHAUKA_EMBLEM = {
    box: '0 0 64 64',
    svg: '<path d="M55.542,10.727 Q56.208,11.033 56.604,11.65 Q57,12.267 57,13 L57,51 Q57,51.733 56.604,52.35 Q56.208,' +
        '52.967 55.542,53.273 L43.542,58.773 Q43.046,59 42.5,59 Q42.003,59 41.543,58.81 Q41.084,58.619 40.732,58.268 ' +
        'Q40.381,57.916 40.19,57.457 Q40,56.997 40,56.5 L40,40.5 L48,40.5 Q50.071,40.5 51.536,39.036 Q53,37.571 53,35' +
        '.5 L53,28.5 Q53,26.429 51.536,24.964 Q50.071,23.5 48,23.5 L40,23.5 L40,7.5 Q40,6.954 40.227,6.458 Q40.435,6.' +
        '006 40.799,5.668 Q41.163,5.33 41.63,5.156 Q42.096,4.983 42.593,5.002 Q43.09,5.02 43.542,5.227 Z M8.458,10.72' +
        '7 L20.458,5.227 Q20.91,5.02 21.407,5.002 Q21.904,4.983 22.37,5.156 Q22.837,5.33 23.201,5.668 Q23.565,6.006 2' +
        '3.773,6.458 Q24,6.954 24,7.5 L24,23.5 L16,23.5 Q13.929,23.5 12.464,24.964 Q11,26.429 11,28.5 L11,35.5 Q11,37' +
        '.571 12.464,39.036 Q13.929,40.5 16,40.5 L24,40.5 L24,56.5 Q24,56.997 23.81,57.457 Q23.619,57.916 23.268,58.2' +
        '68 Q22.916,58.619 22.457,58.81 Q21.997,59 21.5,59 Q20.954,59 20.458,58.773 L8.458,53.273 Q7.792,52.967 7.396' +
        ',52.35 Q7,51.733 7,51 L7,13 Q7,12.267 7.396,11.65 Q7.792,11.033 8.458,10.727 Z M16,27.5 L24,27.5 L24,36.5 L1' +
        '6,36.5 Q15,36.5 15,35.5 L15,28.5 Q15,27.5 16,27.5 Z M40,36.5 L40,27.5 L48,27.5 Q49,27.5 49,28.5 L49,35.5 Q49' +
        ',36.5 48,36.5 Z" fill="#0a2e50"/><path d="M16 25.5H48A3 3 0 0 1 51 28.5V35.5A3 3 0 0 1 48 38.5H16A3 3 0 0 1 ' +
        '13 35.5V28.5A3 3 0 0 1 16 25.5Z" fill="#00b8de"/>',
};

// The widest plate for the emblem, by version (2 to 6) at level H and by height (3, 5, 7… modules): each one leaves every
// block at least half of what H corrects, for the camera (blur, noise, glare). test/qr.test.js counts the codewords
// under every plate this table allows. From version 7 an alignment pattern sits in the very centre, so the emblem goes
// only on codes up to version 6 (a link of up to 58 bytes).
const PLATE = {
    2: [5, 5, 3],
    3: [9, 5, 5, 5, 3],
    4: [7, 7, 7, 7, 7, 7, 3],
    5: [17, 11, 11, 11, 9, 7, 7, 7, 5],
    6: [23, 23, 13, 13, 13, 13, 9, 7, 7, 7, 5],
};

/** The white between the cleared modules' edge and the emblem, in modules (nur.click: 0.3 to the plate, 0.5 more). */
const PLATE_PAD = 0.8;

/** With an emblem, at least this version (0: the smallest that holds it). A bigger one gives a bigger plate but smaller
 * modules, and the bench read it worse from afar. */
const EMBLEM_VERSION = 0;

// The radii of nur.click's corners (its «esquinas»): an eye's ring, outside and inside, and its dot; the same for the
// alignment patterns, which are drawn whole too.
const EYES = {round: [2.3, 1.5, 1], circle: [3.5, 2.5, 1.5], square: [0, 0, 0]};
const ALIGNS = {round: [1.6, 1, 0.5], circle: [2.5, 1.5, 0.5], square: [0, 0, 0]};

/** A dot's radius: nur.click found some readers failing at small sizes with 0.43. */
const DOT = 0.47;

/**
 * A text as the bytes of its UTF-8, one per character: what qrcode-generator writes (it takes the low byte of each).
 *
 * @param {string} text
 * @returns {string}
 */
function utf8(text) {
    try {
        return unescape(encodeURIComponent(String(text)));
    } catch (e) {
        // A lone surrogate: the text as it is.
        return String(text);
    }
}

function make(text, level, version) {
    const q = qrcode(version || 0, level);
    q.addData(utf8(text), 'Byte');
    q.make();
    return q;
}

/**
 * The centres of the alignment patterns of a version (ISO/IEC 18004, annex E).
 *
 * @param {number} version
 * @returns {number[]}
 */
export function alignmentCentres(version) {
    if (version < 2) {
        return [];
    }
    const size = version * 4 + 17;
    const count = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
    const out = [6];
    for (let pos = size - 7; out.length < count; pos -= step) {
        out.splice(1, 0, pos);
    }
    return out;
}

/**
 * A colour as [r, g, b] (0 to 255), from «#rgb», «#rrggbb» or «rgb(…)» / «rgba(…)» (what getComputedStyle gives).
 *
 * @param {string} colour
 * @returns {number[]|null}
 */
function rgbOf(colour) {
    const s = String(colour || '').trim();
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
    if (m) {
        const h = m[1].length === 3 ? m[1].replace(/(.)/g, '$1$1') : m[1];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
    return m ? [+m[1], +m[2], +m[3]].map(function (v) {
        return Math.max(0, Math.min(255, Math.round(v)));
    }) : null;
}

function linear(v) {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function encoded(v) {
    v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
}

function luminance(rgb) {
    return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

function hex(rgb) {
    return '#' + rgb.map(function (v) {
        return (v < 16 ? '0' : '') + v.toString(16);
    }).join('');
}

function toLab(rgb) {
    const r = linear(rgb[0]);
    const g = linear(rgb[1]);
    const b = linear(rgb[2]);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}

/** OKLab to linear RGB, null when it falls outside what a screen shows. */
function fromLab(L, a, b) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    const out = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
    return out.every(function (v) {
        return v >= -0.0001 && v <= 1.0001;
    }) ? out : null;
}

function contrast(rgb) {
    return 1.05 / (luminance(rgb) + 0.05);
}

/**
 * A colour that a camera reads as dark on the white card: the same hue, made deeper (in OKLab, keeping as much of its
 * colour as a screen can show) until its contrast with white reaches the ratio. A light accent (a yellow, a peach)
 * comes out as its deep tone, close to the skins' own «acento-texto».
 *
 * @param {string} colour
 * @param {number} [ratio] the contrast with white, 4.5 by default
 * @param {string} [fallback] for a colour that cannot be read
 * @returns {string} #rrggbb
 */
export function onWhite(colour, ratio, fallback) {
    const want = ratio || 4.5;
    const rgb = rgbOf(colour);
    if (!rgb) {
        return fallback || QR_INK;
    }
    if (contrast(rgb) >= want) {
        return hex(rgb);
    }
    const lab = toLab(rgb);
    const chroma = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
    const hue = Math.atan2(lab[2], lab[1]);
    // At a lightness, the most of its chroma that a screen shows, as bytes.
    const at = function (L) {
        let lo = 0;
        let hi = chroma;
        let got = fromLab(L, 0, 0);
        for (let i = 0; i < 20; i++) {
            const c = (lo + hi) / 2;
            const x = fromLab(L, c * Math.cos(hue), c * Math.sin(hue));
            if (x) {
                lo = c;
                got = x;
            } else {
                hi = c;
            }
        }
        return got.map(function (v) {
            return encoded(Math.max(0, Math.min(1, v)));
        });
    };
    let lo = 0;
    let hi = lab[0];
    let best = [0, 0, 0];
    for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const x = at(mid);
        if (contrast(x) >= want) {
            lo = mid;
            best = x;
        } else {
            hi = mid;
        }
    }
    return hex(best);
}

function num(x) {
    const v = Math.round(x * 1000) / 1000;
    return String(v).replace(/^(-?)0\./, '$1.');
}

/**
 * A rounded rectangle as a closed subpath, clockwise.
 */
function roundRect(x, y, w, h, r) {
    if (!r) {
        return 'M' + num(x) + ' ' + num(y) + 'h' + num(w) + 'v' + num(h) + 'h' + num(-w) + 'z';
    }
    return 'M' + num(x + r) + ' ' + num(y) + 'h' + num(w - 2 * r) +
        'a' + num(r) + ' ' + num(r) + ' 0 0 1 ' + num(r) + ' ' + num(r) + 'v' + num(h - 2 * r) +
        'a' + num(r) + ' ' + num(r) + ' 0 0 1 ' + num(-r) + ' ' + num(r) + 'h' + num(2 * r - w) +
        'a' + num(r) + ' ' + num(r) + ' 0 0 1 ' + num(-r) + ' ' + num(-r) + 'v' + num(2 * r - h) +
        'a' + num(r) + ' ' + num(r) + ' 0 0 1 ' + num(r) + ' ' + num(-r) + 'z';
}

/**
 * A run of dark modules in a row, as one shape: its ends rounded where nothing dark touches them.
 * Corners a (top left), b (top right), c (bottom right) and e (bottom left) are each a radius or 0.
 */
function run(x, y, w, a, b, c, e) {
    const arc = function (r, dx, dy) {
        return r ? 'a' + num(r) + ' ' + num(r) + ' 0 0 1 ' + num(dx) + ' ' + num(dy) : '';
    };
    const line = function (cmd, v) {
        return v ? cmd + num(v) : '';
    };
    return 'M' + num(x + a) + ' ' + y + line('h', w - a - b) + arc(b, b, b) + line('v', 1 - b - c) + arc(c, -c, c) +
        line('h', c + e - w) + arc(e, -e, -e) + (a ? line('v', e + a - 1) + arc(a, a, -a) : '') + 'z';
}

/**
 * The emblem's plate: a centred box of whole modules, odd on both sides (the code has an odd size), the one where the
 * emblem, kept in its shape, comes out largest; or null when the version leaves no room.
 *
 * @param {number} version
 * @param {number} ratio the emblem's width over its height
 * @returns {{w: number, h: number}|null}
 */
export function plateFor(version, ratio) {
    const widths = PLATE[version] || [];
    const r = ratio > 0 ? ratio : 1;
    let best = null;
    widths.forEach(function (most, i) {
        const h = 3 + 2 * i;
        for (let w = 3; w <= most; w += 2) {
            const bw = w - 2 * PLATE_PAD;
            const bh = h - 2 * PLATE_PAD;
            // The emblem fitted inside, as preserveAspectRatio «meet» draws it.
            const shown = Math.min(bw, bh * r) * Math.min(bh, bw / r);
            if (!best || shown > best.shown + 1e-9 || (Math.abs(shown - best.shown) < 1e-9 && w * h < best.w * best.h)) {
                best = {w, h, shown};
            }
        }
    });
    return best ? {w: best.w, h: best.h} : null;
}

/**
 * The parts of a code drawn to be looked at, each an SVG path in the code's modules (0 to size), for qrSvg or a page
 * of its own.
 *
 * @param {string} text
 * @param {object} [o] see qrSvg
 * @returns {{size: number, version: number, level: string, plate: object|null, modules: string, eyes: string[],
 *     aligns: string, ink: string, eyeColours: string[]}}
 */
export function qrShape(text, o) {
    const opt = o || {};
    // By default nur.click's «circulos» and «cuadradas»: the pair that every decoder of the bench reads at least as well
    // as the plain code. Its own default (soft modules, round corners) costs readings on long codes, and OpenCV reads no
    // code with round eyes.
    const style = opt.style === 'soft' || opt.style === 'square' ? opt.style : 'dots';
    const corners = EYES[opt.corners] ? opt.corners : 'square';
    const EYE = EYES[corners];
    const ALIGN = ALIGNS[corners];
    // An emblem asks for the strongest correction, and only on a code that leaves its centre free.
    let q = null;
    let level = opt.level || 'M';
    let plate = null;
    if (opt.emblem) {
        let h = make(text, 'H');
        // A short link makes a small code with a small plate: the emblem asks for a version where it is seen.
        const own = (h.getModuleCount() - 17) / 4;
        const want = Math.min(6, Math.max(own, opt.emblemVersion === undefined ? EMBLEM_VERSION : opt.emblemVersion));
        if (want > own) {
            h = make(text, 'H', want);
        }
        plate = plateFor((h.getModuleCount() - 17) / 4, emblemRatio(opt.emblem));
        if (plate) {
            q = h;
            level = 'H';
        }
    }
    if (!q) {
        q = make(text, level);
    }
    const size = q.getModuleCount();
    const version = (size - 17) / 4;
    // What is drawn apart: the three finders and the alignment patterns.
    const apart = [];
    for (let r = 0; r < size; r++) {
        apart.push([]);
    }
    const mark = function (x, y, w, h) {
        for (let r = y; r < y + h; r++) {
            for (let c = x; c < x + w; c++) {
                apart[r][c] = true;
            }
        }
    };
    // Top left, top right, bottom left.
    const eyes = [[0, 0], [size - 7, 0], [0, size - 7]].map(function (p) {
        mark(p[0], p[1], 7, 7);
        return roundRect(p[0], p[1], 7, 7, EYE[0]) + roundRect(p[0] + 1, p[1] + 1, 5, 5, EYE[1]) +
            roundRect(p[0] + 2, p[1] + 2, 3, 3, EYE[2]);
    });
    let aligns = '';
    const at = alignmentCentres(version);
    at.forEach(function (y) {
        at.forEach(function (x) {
            const onFinder = (x < 9 && y < 9) || (x > size - 9 && y < 9) || (x < 9 && y > size - 9);
            if (!onFinder) {
                mark(x - 2, y - 2, 5, 5);
                aligns += roundRect(x - 2, y - 2, 5, 5, ALIGN[0]) + roundRect(x - 1, y - 1, 3, 3, ALIGN[1]) +
                    roundRect(x, y, 1, 1, ALIGN[2]);
            }
        });
    });
    if (plate) {
        plate.x = (size - plate.w) / 2;
        plate.y = (size - plate.h) / 2;
        mark(plate.x, plate.y, plate.w, plate.h);
    }
    const dark = function (r, c) {
        return r >= 0 && c >= 0 && r < size && c < size && !apart[r][c] && q.isDark(r, c);
    };
    let modules = '';
    for (let r = 0; r < size; r++) {
        let c = 0;
        while (c < size) {
            if (!dark(r, c)) {
                c++;
                continue;
            }
            if (style === 'dots') {
                modules += 'M' + num(c + 0.5 - DOT) + ' ' + num(r + 0.5) + 'a' + num(DOT) + ' ' + num(DOT) + ' 0 1 0 ' +
                    num(2 * DOT) + ' 0a' + num(DOT) + ' ' + num(DOT) + ' 0 1 0 ' + num(-2 * DOT) + ' 0z';
                c++;
                continue;
            }
            // nur.click's «redondeados»: a corner is round where nothing dark touches it on either side.
            const start = c;
            while (dark(r, c)) {
                c++;
            }
            const end = c - 1;
            const s = style === 'square' ? 0 : 0.5;
            modules += run(start, r, c - start, dark(r - 1, start) ? 0 : s, dark(r - 1, end) ? 0 : s,
                dark(r + 1, end) ? 0 : s, dark(r + 1, start) ? 0 : s);
        }
    }
    const ink = onWhite(opt.ink || QR_INK, opt.inkContrast || 7);
    // One colour for the three eyes (accent), or one each (eyes), as nur.click does with a centre's colours.
    const asked = opt.eyes ? [].concat(opt.eyes) : [opt.accent || ''];
    const eyeColours = [0, 1, 2].map(function (i) {
        const c = asked[i % asked.length];
        return c ? onWhite(c, opt.contrast || 4.5, ink) : ink;
    });
    return {size, version, level, plate, modules, eyes, aligns, ink, eyeColours};
}

function emblemRatio(emblem) {
    if (typeof emblem === 'object' && emblem.ratio > 0) {
        return emblem.ratio;
    }
    const box = typeof emblem === 'object' && emblem.box ? String(emblem.box).split(/[\s,]+/) : null;
    return box && +box[3] > 0 ? +box[2] / +box[3] : 1;
}

function attr(v) {
    return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * A QR drawn to be looked at, as SVG markup that scales to its box, in the drawing of nur.click's designed codes (for
 * the centres whose shortener does not draw them): round dots on white, the three eyes and the alignment patterns
 * whole, and, if asked, an emblem in the middle on a white plate (the code then corrects at level H). Black by default:
 * colour, even deep, costs readings to the decoders that read edges. Any colour asked for is made dark enough. No quiet
 * zone by default: the white card around it gives it; `margin` adds one.
 *
 * @param {string} text
 * @param {object} [o] {style: the modules as nur.click's «puntos», 'dots' («circulos», by default), 'soft'
 *     («redondeados») or 'square' («cuadrados»); corners: the eyes as its «esquinas», 'square' («cuadradas», by
 *     default), 'round' («redondeadas») or 'circle' («circulo»); ink: the modules' colour (hex or rgb(); black);
 *     eyes: one colour or three (top left, top right, bottom left); accent: one colour for the three eyes; contrast: the
 *     eyes' least contrast with white (4.5); emblem: an image's URL, or {href, ratio}, or {svg: inner markup, box: its
 *     viewBox, ratio}; emblemVersion: the least version with an emblem (0, the smallest that holds it); margin:
 *     modules of white around (0); background: the white inside the drawing ('#fff'; '' for none); level: without an
 *     emblem ('M')}
 * @returns {string} the <svg>; it throws, as qrPath, when the text does not fit in a code
 */
export function qrSvg(text, o) {
    const opt = o || {};
    const s = qrShape(text, opt);
    const m = opt.margin > 0 ? opt.margin : 0;
    const side = s.size + 2 * m;
    const bg = opt.background === undefined ? '#fff' : opt.background;
    let out = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="' +
        num(-m) + ' ' + num(-m) + ' ' + num(side) + ' ' + num(side) + '" class="hk-qr-dibujo" data-version="' + s.version +
        '" data-nivel="' + s.level + '" aria-hidden="true">';
    if (bg) {
        out += '<rect x="' + num(-m) + '" y="' + num(-m) + '" width="' + num(side) + '" height="' + num(side) +
            '" style="fill:' + attr(bg) + '"/>';
    }
    // The colours go in style: the player's sheets paint every .hk-qr path, and a style wins over them.
    out += '<path d="' + s.modules + '" style="fill:' + s.ink + '"/>';
    if (s.aligns) {
        out += '<path d="' + s.aligns + '" fill-rule="evenodd" style="fill:' + s.ink + '"/>';
    }
    // The eyes of one colour go in one path.
    const groups = {};
    s.eyes.forEach(function (d, i) {
        groups[s.eyeColours[i]] = (groups[s.eyeColours[i]] || '') + d;
    });
    Object.keys(groups).forEach(function (c) {
        out += '<path d="' + groups[c] + '" fill-rule="evenodd" style="fill:' + c + '"/>';
    });
    if (s.plate) {
        const p = s.plate;
        const box = [p.x + PLATE_PAD, p.y + PLATE_PAD, p.w - 2 * PLATE_PAD, p.h - 2 * PLATE_PAD].map(num);
        const e = typeof opt.emblem === 'string' ? {href: opt.emblem} : opt.emblem;
        out += '<path d="' + roundRect(p.x + 0.3, p.y + 0.3, p.w - 0.6, p.h - 0.6, Math.min(2, (Math.min(p.w, p.h) - 0.6) / 4)) +
            '" style="fill:#fff"/>';
        if (e.svg) {
            out += '<svg x="' + box[0] + '" y="' + box[1] + '" width="' + box[2] + '" height="' + box[3] + '" viewBox="' +
                attr(e.box || '0 0 1 1') + '" preserveAspectRatio="xMidYMid meet">' + e.svg + '</svg>';
        } else if (e.href) {
            out += '<image x="' + box[0] + '" y="' + box[1] + '" width="' + box[2] + '" height="' + box[3] + '" ' +
                'preserveAspectRatio="xMidYMid meet" xlink:href="' + attr(e.href) + '"/>';
        }
    }
    return out + '</svg>';
}
