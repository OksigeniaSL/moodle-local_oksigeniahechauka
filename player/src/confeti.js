// The party of «Hoy cumplen años»: paper confetti in a single canvas, and balloons that rise slowly at the back.
// Gaudí, 7 November 2026.
//
// Confetti: at most 80 pieces alive, drawn at half resolution (a quarter of the pixels; paper does not need more) and
// only while there is something in the air: once the last piece has fallen the loop stops and the canvas is cleared.
// Each piece is a little card that turns and flips as it falls (its height goes with the cosine of the flip, and the
// back is a shade darker), with the drag of paper, so it floats rather than drops.
// Balloons: plain HTML with an SVG inside, moved by CSS (transform only), so the compositor carries them; the canvas
// never draws them.
//
// Chromium 56: canvas 2D with setTransform, requestAnimationFrame, no Path2D needed, no ES2017+ calls.

/** The most pieces alive at once, whatever is asked. */
export const MOST = 80;

/** How much party each level brings. */
export const LEVELS = {
    sobria: {burst: 34, again: 0, rain: 30, balloons: 3, colours: 2, shapes: ['rect']},
    elegante: {burst: 54, again: 24, rain: 44, balloons: 4, colours: 3, shapes: ['rect', 'rect', 'square']},
    juguetona: {burst: 80, again: 40, rain: 70, balloons: 6, colours: 7, shapes: ['rect', 'square', 'dot', 'curl']},
};

/** One of the three names, from anything (a skin's variable, the screen's choice). */
export function levelOf(value) {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'sobria' || v === '0') {
        return 'sobria';
    }
    if (v === 'juguetona' || v === '2') {
        return 'juguetona';
    }
    return 'elegante';
}

function rgbOf(colour) {
    const c = String(colour || '').trim();
    let m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) {
        return [0, 1, 2].map(function (i) {
            return parseInt(m[1].charAt(i) + m[1].charAt(i), 16);
        });
    }
    m = /^#([0-9a-f]{6})$/i.exec(c);
    if (m) {
        return [0, 2, 4].map(function (i) {
            return parseInt(m[1].substr(i, 2), 16);
        });
    }
    m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(c);
    if (m) {
        return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
    }
    return null;
}

function luminance(rgb) {
    const f = function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

/** The contrast of two colours, 1 to 21. */
export function contrast(a, b) {
    const x = rgbOf(a);
    const y = rgbOf(b);
    if (!x || !y) {
        return 1;
    }
    const la = luminance(x);
    const lb = luminance(y);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** A colour mixed with white, k of it (0 to 1), as rgb(). */
export function lighter(colour, k) {
    const c = rgbOf(colour);
    if (!c) {
        return colour;
    }
    return 'rgb(' + c.map(function (v) {
        return Math.round(v + (255 - v) * k);
    }).join(',') + ')';
}

/**
 * The colour, lightened on a dark ground (darkened on a light one) only as much as it takes to read at «least» on it; null when
 * it would need more than «most» of white or black.
 *
 * @param {string} colour
 * @param {string} ground
 * @param {number} least the contrast it must reach (4.5 for text)
 * @param {number} [most] how much it may change, 0 to 1 (all of it, when not given)
 * @returns {string|null}
 */
export function readable(colour, ground, least, most) {
    const c = rgbOf(colour);
    const g = rgbOf(ground);
    if (!c || !g) {
        return colour;
    }
    const top = most === undefined ? 1 : most;
    const up = luminance(g) < 0.18;
    for (let k = 0; k <= top + 0.001; k += 0.05) {
        const x = k === 0 ? colour : (up ? lighter(colour, k) : darker(colour, k));
        if (contrast(x, ground) >= least) {
            return x;
        }
    }
    return null;
}

function darker(colour, k) {
    const c = rgbOf(colour);
    if (!c) {
        return colour;
    }
    return 'rgb(' + c.map(function (v) {
        return Math.round(v * (1 - k));
    }).join(',') + ')';
}

/**
 * The confetti's colours, from the skin on that node: the accent first, then white paper, then the centre's own
 * colours; none that would vanish on the ground it falls over.
 *
 * @param {HTMLElement} node
 * @param {string} level
 * @returns {string[]}
 */
export function coloursOf(node, level) {
    const cs = getComputedStyle(node);
    const v = function (name) {
        return (cs.getPropertyValue(name) || '').trim();
    };
    const ground = v('--hk-primario') || '#1f5f8b';
    const wanted = ['--hk-acento', '--hk-sobre-primario', '--hk-marca-2', '--hk-marca-4', '--hk-marca-3', '--hk-evento',
        '--hk-menu', '--hk-superficie'];
    const out = [];
    wanted.forEach(function (name) {
        const c = v(name);
        if (c && rgbOf(c) && contrast(c, ground) >= 1.6 && out.indexOf(c) === -1) {
            out.push(c);
        }
    });
    // A centre whose colours are all near its main one still gets paper: white and a warm gold.
    if (out.length < 2) {
        out.push('#ffffff', '#f2c35b');
    }
    if (level === 'juguetona') {
        return out.slice(0, LEVELS[level].colours);
    }
    // The elegant and the sober ones: white paper and a pale gold of the accent, which catches the light; the elegant
    // one also the accent itself. Nothing else of the skin.
    const accent = v('--hk-acento');
    const paper = v('--hk-sobre-primario') || '#ffffff';
    const gold = accent ? lighter(accent, 0.45) : '#f2c35b';
    if (level === 'sobria') {
        return [paper, gold];
    }
    return accent && contrast(accent, ground) >= 1.6 ? [accent, paper, gold] : [paper, gold];
}

/**
 * The confetti of one slide.
 *
 * @param {HTMLCanvasElement} canvas over the whole slide, at its size in CSS
 * @param {object} o {colours: [...], level: 'sobria'|'elegante'|'juguetona', rem: px of a rem}
 * @constructor
 */
export function Confetti(canvas, o) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.colours = (o.colours || ['#ffffff']).map(function (c) {
        return [c, darker(c, 0.22)];
    });
    this.level = LEVELS[o.level] ? o.level : 'elegante';
    this.rem = o.rem || 10;
    this.pieces = [];
    this.raf = 0;
    this.last = 0;
    this.scale = 0.5;
    this.frames = 0;
    this.dirty = null;
    this.measure();
}

/** The canvas at half the size it is shown at. */
Confetti.prototype.measure = function () {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.max(1, Math.round(w * this.scale));
    this.canvas.height = Math.max(1, Math.round(h * this.scale));
};

Confetti.prototype.piece = function (x, y, vx, vy) {
    const r = this.rem;
    const shapes = LEVELS[this.level].shapes;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const c = this.colours[Math.floor(Math.random() * this.colours.length)];
    let w = r * (1.5 + Math.random() * 0.9);
    let h = r * (0.65 + Math.random() * 0.35);
    if (shape === 'square') {
        w = h = r * (1.0 + Math.random() * 0.4);
    } else if (shape === 'dot') {
        w = h = r * (0.9 + Math.random() * 0.4);
    } else if (shape === 'curl') {
        w = r * (2.8 + Math.random() * 1.4);
        h = r * 0.4;
    }
    return {
        x: x, y: y, vx: vx, vy: vy, w: w, h: h, shape: shape, front: c[0], back: c[1],
        rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 7,
        flip: Math.random() * Math.PI * 2, flipSpeed: 5 + Math.random() * 7,
        sway: 0.6 + Math.random() * 1.4, swayAt: Math.random() * Math.PI * 2, age: 0,
        life: 3.4 + Math.random() * 1.6,
    };
};

Confetti.prototype.room = function (n) {
    // Never more than MOST: the oldest give way.
    const over = this.pieces.length + n - MOST;
    if (over > 0) {
        this.pieces.splice(0, over);
    }
};

/**
 * A burst from behind something (a face): up and out, as from a party popper behind it.
 *
 * @param {number} x in CSS px of the canvas
 * @param {number} y
 * @param {number} [n] how many; by default the level's
 * @param {number} [radius] where they start from, around the point
 */
Confetti.prototype.burst = function (x, y, n, radius) {
    const count = Math.min(MOST, n || LEVELS[this.level].burst);
    const r = this.rem;
    const rad = radius || 0;
    this.room(count);
    for (let i = 0; i < count; i++) {
        // A fan upwards, wider for the playful ones.
        const spread = this.level === 'juguetona' ? 1.45 : 1.15;
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2 * spread;
        const speed = r * (65 + Math.random() * 80);
        const sx = x + Math.cos(a) * rad * 0.8;
        const sy = y + Math.sin(a) * rad * 0.6;
        this.pieces.push(this.piece(sx, sy, Math.cos(a) * speed * 1.2, Math.sin(a) * speed));
    }
    this.run();
};

/** A gentle fall from the top, over the whole width. */
Confetti.prototype.rain = function (n) {
    const count = Math.min(MOST, n || LEVELS[this.level].rain);
    const r = this.rem;
    this.room(count);
    for (let i = 0; i < count; i++) {
        const p = this.piece(Math.random() * this.w, -r * (2 + Math.random() * 30), (Math.random() - 0.5) * r * 8,
            r * (6 + Math.random() * 8));
        p.life += 1.5;
        this.pieces.push(p);
    }
    this.run();
};

Confetti.prototype.run = function () {
    if (this.raf) {
        return;
    }
    const self = this;
    this.last = 0;
    const step = function (t) {
        self.raf = 0;
        if (self.tick(t)) {
            self.raf = requestAnimationFrame(step);
        }
    };
    this.raf = requestAnimationFrame(step);
};

/** One frame; false when nothing is left in the air. */
Confetti.prototype.tick = function (t) {
    const dt = this.last ? Math.min(0.05, (t - this.last) / 1000) : 0.016;
    this.last = t;
    this.frames++;
    const ctx = this.ctx;
    const s = this.scale;
    const r = this.rem;
    const gravity = r * 70;
    // Paper: much drag, so after the first push it floats down at a few rem a second.
    const drag = Math.pow(0.12, dt);
    const fall = r * 16;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Only where there was paper last frame: on a screen without a GPU, what is not touched is not composited again.
    const d = this.dirty;
    if (d) {
        ctx.clearRect(d[0], d[1], d[2] - d[0], d[3] - d[1]);
    } else {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const keep = [];
    for (let i = 0; i < this.pieces.length; i++) {
        const p = this.pieces[i];
        p.age += dt;
        p.vx *= drag;
        p.vy = p.vy * drag + gravity * dt;
        if (p.vy > fall) {
            p.vy = fall + (p.vy - fall) * 0.6;
        }
        p.swayAt += dt * 2.4;
        p.x += (p.vx + Math.sin(p.swayAt) * p.sway * r * 6) * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        p.flip += p.flipSpeed * dt;
        if (p.y > this.h + r * 4 || p.age > p.life) {
            continue;
        }
        keep.push(p);
        const reach = p.w;
        x0 = Math.min(x0, p.x - reach);
        y0 = Math.min(y0, p.y - reach);
        x1 = Math.max(x1, p.x + reach);
        y1 = Math.max(y1, p.y + reach);
        const fade = p.life - p.age < 0.6 ? (p.life - p.age) / 0.6 : 1;
        const flip = Math.cos(p.flip);
        const cos = Math.cos(p.rot) * s;
        const sin = Math.sin(p.rot) * s;
        ctx.globalAlpha = fade;
        ctx.fillStyle = flip >= 0 ? p.front : p.back;
        if (p.shape === 'dot') {
            ctx.setTransform(cos, sin, -sin * flip, cos * flip, p.x * s, p.y * s);
            ctx.beginPath();
            ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.shape === 'curl') {
            // A streamer: a thin ribbon that waves.
            ctx.setTransform(cos, sin, -sin, cos, p.x * s, p.y * s);
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = p.h;
            ctx.beginPath();
            ctx.moveTo(-p.w / 2, 0);
            ctx.bezierCurveTo(-p.w / 6, -p.w / 3 * flip, p.w / 6, p.w / 3 * flip, p.w / 2, 0);
            ctx.stroke();
        } else {
            const fh = Math.max(0.12, Math.abs(flip));
            ctx.setTransform(cos, sin, -sin * fh, cos * fh, p.x * s, p.y * s);
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
    }
    ctx.globalAlpha = 1;
    this.pieces = keep;
    if (!keep.length) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.dirty = null;
        return false;
    }
    this.dirty = [Math.max(0, Math.floor(x0 * s) - 2), Math.max(0, Math.floor(y0 * s) - 2),
        Math.min(this.canvas.width, Math.ceil(x1 * s) + 2), Math.min(this.canvas.height, Math.ceil(y1 * s) + 2)];
    return true;
};

/** Everything stops and the canvas is left clear. */
Confetti.prototype.stop = function () {
    if (this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
    }
    this.pieces = [];
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

// A balloon, 100 × 170: the body with its shine, the knot and the string.
const BALLOON = '<svg viewBox="0 0 100 170" aria-hidden="true">' +
    '<path class="hk-globo-cuerpo" d="M50 4C75 4 93 25 93 53C93 84 71 108 53 115L47 115C29 108 7 84 7 53C7 25 25 4 50 4Z"/>' +
    '<path class="hk-globo-cuerpo" d="M43 122L50 113L57 122Z"/>' +
    '<ellipse cx="33" cy="36" rx="8" ry="15" transform="rotate(-24 33 36)" fill="#ffffff" opacity=".38"/>' +
    '<path class="hk-globo-hilo" d="M50 122C44 136 57 148 49 168"/></svg>';

/**
 * The balloons at the back: their markup, each with its place, its speed and how far through its climb it starts, so
 * that the slide opens with some already in the air.
 *
 * @param {string} level
 * @param {boolean} still a screen that keeps still: they stand at the bottom
 * @returns {string}
 */
export function balloonsHtml(level, still) {
    const n = LEVELS[level].balloons;
    // Spread along the width, away from the very centre where the name is.
    const lanes = [3, 97, 90, 10, 16, 84, 94, 6];
    let html = '<div class="hk-cumple-globos" aria-hidden="true">';
    for (let i = 0; i < n; i++) {
        const left = lanes[i % lanes.length];
        const seconds = 17 + (i * 5) % 9;
        const into = -((i * 0.37) % 1) * seconds;
        const sway = 3.2 + (i % 3) * 0.7;
        const style = still ? 'left:' + left + '%;' :
            'left:' + left + '%;-webkit-animation-duration:' + seconds + 's;animation-duration:' + seconds + 's;' +
            '-webkit-animation-delay:' + into.toFixed(2) + 's;animation-delay:' + into.toFixed(2) + 's';
        const swayStyle = still ? '' : '-webkit-animation-duration:' + sway + 's;animation-duration:' + sway + 's;' +
            '-webkit-animation-delay:-' + (i * 0.9).toFixed(1) + 's;animation-delay:-' + (i * 0.9).toFixed(1) + 's';
        html += '<div class="hk-globo hk-globo-' + (i % 4) + (i % 2 ? ' hk-globo-chico' : '') + '" style="' + style + '">' +
            '<div class="hk-globo-vaiven" style="' + swayStyle + '">' + BALLOON + '</div></div>';
    }
    return html + '</div>';
}
