// «Sorpresas»: now and then a character crosses the screen on a layer of its own, stops, looks at whoever is there, makes a
// gesture and runs away. It knows nothing of what goes on under it: slides come and go, and it carries on. Only an urgent
// notice takes it off, and a screen that keeps still never has one.
//
// A sheet is the art direction's (kit/hechauka-sorpresas): pages of frames and an atlas that says everything. Nothing
// here repaints: a frame with `overflow: hidden` holds each page as an <img> on its layer, and each step changes only
// `transform` (and the shadow's `opacity`), never `background-position`. The position goes forward with the frame (speed /
// fps px at each change or, in what flies, the state's `avance`: a [dx, dy] per frame), never on a clock of its own: the sheet
// is drawn in the frame that moves that way, so what is planted stays planted only if both change together.
//
// What falls over the whole screen (`tipo: capas`, snow and rain) has no frames: tiles that join on their four sides, one element per
// layer, each moved by a CSS animation of `transform` on the compositor, with no code per frame. What swims brings its water in
// its atlas (`agua`), made the same way; and who comes with steam, the steam (`vaho`), with its cut in step with the sheet.

const LEAST_MINUTES = 15;
// An order waits this long for the manifest that says who comes out: it may have been given right after turning them on.
const ORDER_WAITS_MS = 5 * 60000;
const STEP_BASE = 1080;
// Bigger from afar, and softer: the sheets are drawn for 1080.
const BY_DISTANCE = {3: 1, 5: 1.25, 8: 1.5};
// Stands off the very edge of the screen.
const EDGE = 6;
// Without news from the server for this long, it no longer knows what the sky is doing.
const SKY_LASTS_MS = 3 * 3600000;
// The thread of what hangs: one element, stretched from above the screen to where it holds on. Nothing to paint, whatever its length.
const THREAD_WIDE = 7;
const THREAD_ABOVE = 4;
const THREAD_TEXELS = 'linear-gradient(to right, rgba(34,30,48,0) 7.14%, rgba(34,30,48,.3) 21.43%, rgba(140,138,150,.8) 35.71%, ' +
    'rgba(255,255,255,.92) 50%, rgba(140,138,150,.8) 64.29%, rgba(34,30,48,.3) 78.57%, rgba(34,30,48,0) 92.86%)';

function css(node, styles) {
    Object.keys(styles).forEach(function (k) {
        node.style[k] = styles[k];
    });
}

/**
 * When the next one comes: about every so many minutes, never at a beat you could set a watch by, and never closer than
 * LEAST_MINUTES.
 *
 * @param {number} now milliseconds
 * @param {number} minutes
 * @param {function(): number} random from 0 to 1
 * @returns {number} milliseconds
 */
export function dueAfter(now, minutes, random) {
    return now + Math.max(LEAST_MINUTES, minutes * (0.75 + 0.5 * random())) * 60000;
}

/**
 * How big it goes.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} distance 3, 5 or 8 metres
 * @returns {number}
 */
export function scaleOf(width, height, distance) {
    return Math.min(width, height) / STEP_BASE * (BY_DISTANCE[distance] || 1);
}

/**
 * The walk: it comes in by one side from out of sight, a whole number of turns of its loop (it can stop only where a turn
 * ends), stops a good way into the screen and runs out by the other side.
 *
 * @param {object} meta the atlas's
 * @param {number} width of the screen
 * @param {number} scale
 * @param {function(): number} random from 0 to 1
 * @returns {{dir: number, from: number, turns: number, exit: number}}
 */
export function walkOf(meta, width, scale, random) {
    const dir = random() < 0.5 ? 1 : -1;
    const cross = meta.estados.cruza;
    const turn = cross.speed * cross.frames / cross.fps * scale;
    // From where it enters: the part of the cell that goes first has to start out of sight.
    const ahead = (meta.cell.w - meta.anchor.x) * scale;
    const behind = meta.anchor.x * scale;
    const into = width * (0.2 + 0.25 * random());
    const turns = Math.max(1, Math.ceil((into + ahead) / turn));
    const stop = dir > 0 ? into : width - into;
    return {dir, turns, from: stop - dir * turns * turn, exit: dir > 0 ? width + behind : -behind};
}

/**
 * The way of one who comes with steam: where the veil goes on this screen, how many turns of each loop, and the steps in order. He comes up behind the steam to the
 * porthole, drops out of sight, and comes back up with the squeegee, from out of sight, so that he ends with the top of his cell on the top of the screen.
 *
 * @param {object} meta the atlas's
 * @param {number} width of the screen
 * @param {number} height of the screen
 * @param {number} scale
 * @param {string} gesture
 * @param {boolean} slips whether his feet go half way up
 * @returns {{shape: object, k: number, ox: number, oy: number, x: number, over: number, steps: object[]}}
 */
export function cleanOf(meta, width, height, scale, gesture, slips) {
    const est = meta.estados;
    const v = meta.vaho;
    const sum = (state) => est[state].avance.reduce((total, step) => total + step[1], 0) * scale;
    const shape = width >= height ? v.ancha : v.alta;
    // The picture covers the screen, centred, with its own proportions: the porthole stays round.
    const k = Math.max(width / shape.w, height / shape.h);
    const ox = (width - shape.w * k) / 2;
    const oy = (height - shape.h * k) / 2;
    const below = (meta.cell.h - meta.anchor.y) * scale;
    const stop = oy + shape.hueco[1] * k + (meta.anchor.y - v.cara_y) * scale;
    const turn = -sum('cruza');
    const brake = -sum('para');
    const turns = Math.max(1, Math.ceil((height + below - (stop + brake)) / turn));
    const over = (v.barra.corte - v.barra.arriba) * scale;
    const top = meta.anchor.y * scale;
    const up = -sum('limpia');
    const from = height + over - (est.limpia.corte[0] - meta.anchor.y) * scale;
    const times = Math.max(2, Math.ceil((from - top) / up));
    const first = Math.max(1, Math.round(times * v.resbala_a));
    const steps = [
        {state: 'cruza', times: turns, y: stop + brake + turns * turn, behind: true},
        {state: 'para', times: 1},
        {state: 'baja', times: 1},
        {state: 'cae', times: 0, leaves: height + below},
        {state: 'limpia', times: slips ? first : times, y: top + times * up, wait: v.espera, behind: false},
    ].concat(slips ? [{state: 'resbala', times: 1}, {state: 'limpia', times: times - first}] : [], [
        {state: gesture, times: 1},
        {state: 'huye', times: 0, leaves: -below},
    ]);
    return {shape, k, ox, oy, x: ox + shape.hueco[0] * k, over, steps};
}

/**
 * What hangs comes down instead of crossing: whole turns of its loop, as many as it takes to start out of sight, so that it
 * brakes just at the height it stops at. It leaves upwards.
 *
 * @param {object} meta the atlas's
 * @param {number} width of the screen
 * @param {number} stop the height it stops at
 * @param {number} scale
 * @param {function(): number} random from 0 to 1
 * @returns {{dir: number, turns: number, from: number, top: number, exit: number}}
 */
export function hangOf(meta, width, stop, scale, random) {
    const sum = (state) => meta.estados[state].avance.reduce((total, step) => total + step[1], 0) * scale;
    const turn = sum('cruza');
    const brake = sum('para');
    const below = (meta.cell.h - meta.anchor.y) * scale;
    const turns = Math.max(1, Math.ceil((stop - brake + below) / turn));
    const side = meta.anchor.x * scale;
    return {dir: random() < 0.5 ? 1 : -1, turns, from: side + random() * (width - 2 * side), top: stop - brake - turns * turn,
        exit: -below};
}

/**
 * The height its anchor goes at. What walks, on the ticker if it is in sight and if not on the bottom edge; what flies has no
 * floor: anywhere within the heights its atlas says (`altura`, at base 1080), on any shape of screen. What hangs stops there.
 *
 * @param {object} meta the atlas's
 * @param {number} height of the screen
 * @param {number} scale
 * @param {number|null} ticker where the ticker starts, if it is in sight
 * @param {function(): number} random from 0 to 1
 * @returns {number}
 */
export function heightOf(meta, height, scale, ticker, random) {
    if (meta.altura) {
        return (meta.altura[0] + random() * (meta.altura[1] - meta.altura[0])) * height / STEP_BASE;
    }
    return ticker === null ? height - EDGE * scale : ticker;
}

/**
 * Which pages a walk needs: fewer than all of them, with one gesture.
 *
 * @param {object} atlas
 * @param {string[]} states
 * @returns {number[]}
 */
export function pagesOf(atlas, states) {
    const seen = {};
    states.forEach(function (state) {
        const frames = atlas.meta.estados[state].frames;
        for (let i = 0; i < frames; i++) {
            seen[frameOf(atlas, state, i).page || 0] = true;
        }
    });
    return Object.keys(seen).map(Number).sort(function (a, b) {
        return a - b;
    });
}

/**
 * The files of a surprise, beside its atlas.
 *
 * @param {object} atlas
 * @returns {string[]}
 */
export function filesOf(atlas) {
    const files = atlas.meta.pages || atlas.meta.capas.map(function (capa) {
        return capa.image;
    });
    const steam = atlas.meta.vaho;
    if (steam) {
        return files.concat([steam.ancha.image, steam.ancha.tapon.image, steam.alta.image, steam.alta.tapon.image, steam.barra.image],
            steam.borde ? [steam.borde.image] : []);
    }
    return atlas.meta.agua ? files.concat(atlas.meta.agua.capas.map(function (capa) {
        return capa.image;
    })) : files;
}

/**
 * Whether a date is within the days a centre has set for something seasonal, year after year. It may go over New Year.
 *
 * @param {{from: string, until: string}|undefined} season each as "MM-DD"; nothing means all year
 * @param {Date} date
 * @returns {boolean}
 */
export function inSeason(season, date) {
    if (!season) {
        return true;
    }
    const two = (n) => (n < 10 ? '0' : '') + n;
    const day = two(date.getMonth() + 1) + '-' + two(date.getDate());
    return season.from <= season.until ? day >= season.from && day <= season.until : day >= season.from || day <= season.until;
}

/**
 * Whether it is raining where the screen is, from the weather it already shows.
 *
 * @param {object|undefined} weather the manifest's
 * @param {number} heard how many milliseconds ago the server was last heard
 * @returns {boolean}
 */
export function isRaining(weather, heard) {
    return !!(weather && weather.now && /rain|sleet/.test(weather.now.symbol || '')) && heard < SKY_LASTS_MS;
}

/**
 * A layer of what falls, at the size of the screen. While it falls one tile it drifts a whole number of tile widths, so its
 * loop closes by itself; in whole pixels, or a fraction would show as a jump at each turn. The time does not change with the size.
 *
 * @param {object} capa the atlas's
 * @param {number} scale
 * @returns {{w: number, h: number, seconds: number, turns: number}}
 */
export function tileOf(capa, scale) {
    const seconds = capa.h / capa.velocidad[1];
    return {w: Math.round(capa.w * scale), h: Math.round(capa.h * scale), seconds,
        turns: Math.round(capa.velocidad[0] * seconds / capa.w)};
}

function frameOf(atlas, state, i) {
    return atlas.frames[state + '_' + (i < 10 ? '0' : '') + i];
}

/**
 * The water a creature comes with: no frames and no code per frame. A parent goes up, stays and goes down, with one CSS transition
 * each way; under it, one more that sways a few px; and under that the layers, each moved by one CSS animation of `transform`. The
 * body is a row of one px of gradient stretched across the screen, so it weighs nothing. The bubbles are in a box with
 * `overflow: hidden`, so that what reaches the surface is gone.
 */
class Water {
    constructor(layer, water, base) {
        this.water = water;
        this.base = base;
        this.timers = [];
        this.style = null;
        this.gone = false;
        this.root = document.createElement('div');
        css(this.root, {position: 'absolute', left: '0', top: '0', width: '100%', height: '0', willChange: 'transform', visibility: 'hidden'});
        layer.appendChild(this.root);
    }

    /** Waits for the tiles. */
    prepare() {
        this.images = this.water.capas.map((capa) => {
            const image = new Image();
            image.src = this.base + capa.image;
            return image;
        });
        return Promise.all(this.images.map(function (img) {
            return new Promise(function (resolve, reject) {
                img.onload = resolve;
                img.onerror = reject;
            });
        }));
    }

    /** Builds it for this screen and has it painted once, almost invisible, where it will end up. */
    mount(width, height, scale) {
        const a = this.water;
        const n = a.nivel;
        const rules = [];
        const tall = height * n.alto;
        // past the bottom of the screen, because it sways
        const reach = tall + 60 * scale;
        this.top = height - tall;
        this.bottom = height + 60 * scale;
        const sway = document.createElement('div');
        rules.push('@keyframes hk-water-n{from{transform:translate3d(0,' + (-n.meneo[0] * scale) + 'px,0)}to{transform:translate3d(0,' + (n.meneo[0] * scale) + 'px,0)}}');
        css(sway, {position: 'absolute', left: '0', top: '0', width: '100%', height: '0', willChange: 'transform',
            animation: 'hk-water-n ' + (n.meneo[1] / 2) + 's cubic-bezier(.37,0,.63,1) infinite alternate'});
        const c0 = a.cuerpo[0];
        const stops = ['rgba(' + c0.slice(1, 4).join(',') + ',0) 0', 'rgba(' + c0.slice(1, 4).join(',') + ',' + c0[4] + ') ' + (a.cuerpo_fundido * scale) + 'px'];
        a.cuerpo.slice(1).forEach(function (p) {
            stops.push('rgba(' + p.slice(1, 4).join(',') + ',' + p[4] + ') ' + (p[0] * 100) + '%');
        });
        const body = document.createElement('div');
        css(body, {position: 'absolute', left: '0', top: (a.cuerpo_y * scale) + 'px', width: '1px', height: (reach - a.cuerpo_y * scale) + 'px',
            background: 'linear-gradient(to bottom,' + stops.join(',') + ')', transformOrigin: '0 0', transform: 'scale(' + width + ',1)', willChange: 'transform'});
        sway.appendChild(body);
        a.capas.forEach((capa, i) => {
            const w = Math.round(capa.w * scale);
            const h = Math.round(capa.h * scale);
            const name = 'hk-water-' + i;
            const el = document.createElement('div');
            css(el, {backgroundImage: 'url("' + this.base + capa.image + '")', backgroundSize: w + 'px ' + h + 'px', willChange: 'transform', position: 'absolute', left: '0'});
            if (capa.repite === 'x') {
                const vx = capa.velocidad[0];
                rules.push('@keyframes ' + name + '{from{transform:translate3d(' + (vx > 0 ? -w : 0) + 'px,0,0)}to{transform:translate3d(' + (vx > 0 ? 0 : -w) + 'px,0,0)}}');
                css(el, {top: (capa.y * scale) + 'px', width: (width + w) + 'px', height: h + 'px', backgroundRepeat: 'repeat-x',
                    animation: name + ' ' + (capa.w / Math.abs(vx)) + 's linear infinite'});
                sway.appendChild(el);
            } else {
                const vy = capa.velocidad[1];
                const boxH = reach - capa.y * scale;
                const box = document.createElement('div');
                css(box, {position: 'absolute', left: '0', top: (capa.y * scale) + 'px', width: '100%', height: boxH + 'px', overflow: 'hidden'});
                rules.push('@keyframes ' + name + '{from{transform:translate3d(0,' + (vy > 0 ? -h : 0) + 'px,0)}to{transform:translate3d(0,' + (vy > 0 ? 0 : -h) + 'px,0)}}');
                css(el, {top: '0', width: '100%', height: (boxH + h) + 'px', backgroundRepeat: 'repeat',
                    animation: name + ' ' + (capa.h / Math.abs(vy)) + 's linear infinite'});
                box.appendChild(el);
                sway.appendChild(box);
            }
        });
        this.style = document.createElement('style');
        this.style.textContent = rules.join('\n');
        document.head.appendChild(this.style);
        this.root.appendChild(sway);
        css(this.root, {transform: 'translate3d(0,' + this.top + 'px,0)', opacity: '0.001', visibility: 'visible', transition: 'none'});
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    css(this.root, {transform: 'translate3d(0,' + this.bottom + 'px,0)', opacity: '1'});
                    requestAnimationFrame(resolve);
                });
            });
        });
    }

    /** Up, and the creature `bicho_a` seconds later. */
    rise(creature) {
        const n = this.water.nivel;
        css(this.root, {transition: 'transform ' + n.sube + 's cubic-bezier(' + n.curva_sube.join(',') + ')', transform: 'translate3d(0,' + this.top + 'px,0)'});
        this.timers.push(setTimeout(creature, n.bicho_a * 1000));
    }

    /** @param {function(): void} done */
    fall(done) {
        const n = this.water.nivel;
        css(this.root, {transition: 'transform ' + n.baja + 's cubic-bezier(' + n.curva_baja.join(',') + ')', transform: 'translate3d(0,' + this.bottom + 'px,0)'});
        this.timers.push(setTimeout(done, n.baja * 1000));
    }

    /** Off the screen, and its tiles and rules with it. */
    remove() {
        this.gone = true;
        this.timers.forEach(clearTimeout);
        if (this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
        if (this.style && this.style.parentNode) {
            this.style.parentNode.removeChild(this.style);
        }
        (this.images || []).forEach(function (img) {
            img.onload = null;
            img.onerror = null;
            img.src = '';
        });
        this.images = [];
    }
}

/** One character on its way, from the moment its pages are ready until it is out of the screen. */
class Walk {
    constructor(layer, atlas, base, states) {
        const m = atlas.meta;
        this.atlas = atlas;
        this.layer = layer;
        this.page = -1;
        this.timer = 0;
        this.water = m.agua ? new Water(layer, m.agua, base) : null;
        this.root = document.createElement('div');
        css(this.root, {position: 'absolute', left: '0', top: '0', width: m.cell.w + 'px', height: m.cell.h + 'px',
            willChange: 'transform', visibility: 'hidden', transformOrigin: m.anchor.x + 'px ' + m.anchor.y + 'px'});
        this.shadow = document.createElement('div');
        css(this.shadow, {position: 'absolute', left: '0', top: (m.anchor.y - 11) + 'px', width: '100px', height: '22px',
            transformOrigin: '0 50%', willChange: 'transform, opacity',
            background: 'radial-gradient(closest-side, rgba(20,24,16,.42), rgba(20,24,16,.22) 55%, rgba(20,24,16,0))'});
        const box = document.createElement('div');
        css(box, {position: 'absolute', left: '0', top: '0', width: m.cell.w + 'px', height: m.cell.h + 'px',
            overflow: 'hidden'});
        this.images = {};
        pagesOf(atlas, states).forEach((p) => {
            const img = new Image();
            css(img, {position: 'absolute', left: '0', top: '0', willChange: 'transform', visibility: 'hidden'});
            img.src = base + m.pages[p];
            this.images[p] = img;
            box.appendChild(img);
        });
        // What goes on a glass has none.
        if (Object.keys(m.estados).some(function (k) {
            return !!m.estados[k].sombra;
        })) {
            this.root.appendChild(this.shadow);
        }
        this.root.appendChild(box);
        // What hangs has its thread behind it, at scale 1 from the start: only `transform` changes.
        this.thread = null;
        if (m.estados.cruza.hilo) {
            this.thread = document.createElement('div');
            css(this.thread, {position: 'absolute', left: '0', top: '0', width: THREAD_WIDE + 'px', height: '1px',
                background: THREAD_TEXELS, willChange: 'transform', visibility: 'hidden',
                transformOrigin: (THREAD_WIDE / 2) + 'px 0', transform: 'translate3d(0,0,0) scale(1,1)'});
            layer.appendChild(this.thread);
        }
        layer.appendChild(this.root);
    }

    /** Waits for the pages and has them decoded now, not in the middle of the walk. */
    prepare() {
        const images = Object.keys(this.images).map((p) => this.images[p]);
        return Promise.all(images.map(function (img) {
            return new Promise(function (resolve, reject) {
                if (img.complete && img.naturalWidth) {
                    resolve();
                    return;
                }
                img.onload = resolve;
                img.onerror = reject;
            });
        }).concat(this.water ? [this.water.prepare()] : [])).then(() => new Promise((resolve) => {
            this.root.style.visibility = 'visible';
            this.root.style.opacity = '0.001';
            if (this.thread) {
                this.thread.style.opacity = '0.001';
                this.thread.style.visibility = 'visible';
            }
            images.forEach(function (img) {
                img.style.visibility = 'visible';
            });
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    images.forEach(function (img) {
                        img.style.visibility = 'hidden';
                    });
                    this.root.style.opacity = '1';
                    this.root.style.visibility = 'hidden';
                    if (this.thread) {
                        this.thread.style.opacity = '1';
                        this.thread.style.visibility = 'hidden';
                    }
                    resolve();
                });
            });
        }));
    }

    draw(state, i, x, y, scale, mirrored) {
        const m = this.atlas.meta;
        const f = frameOf(this.atlas, state, i);
        const page = f.page || 0;
        if (page !== this.page) {
            if (this.page >= 0) {
                this.images[this.page].style.visibility = 'hidden';
            }
            this.images[page].style.visibility = 'visible';
            this.page = page;
        }
        this.images[page].style.transform = 'translate3d(' + (-f.frame.x) + 'px,' + (-f.frame.y) + 'px,0)';
        const shadow = m.estados[state].sombra;
        if (shadow) {
            const s = shadow[i];
            this.shadow.style.transform = 'translate3d(' + (s[0] - s[1] * 0.56) + 'px,0,0) scaleX(' + (s[1] * 1.12 / 100) + ')';
            this.shadow.style.opacity = s[2];
        }
        const hilo = m.estados[state].hilo;
        if (hilo) {
            const px = x + (hilo[i][0] - m.anchor.x) * (mirrored ? -scale : scale);
            const py = y + (hilo[i][1] - m.anchor.y) * scale;
            const dx = px - this.threadX;
            const dy = py + THREAD_ABOVE;
            this.thread.style.transform = 'translate3d(' + (this.threadX - THREAD_WIDE / 2) + 'px,' + (-THREAD_ABOVE) + 'px,0) rotate(' +
                Math.atan2(-dx, dy) + 'rad) scale(' + scale + ',' + Math.sqrt(dx * dx + dy * dy) + ')';
            if ((py > 0) !== this.threadSeen) {
                this.threadSeen = py > 0;
                this.thread.style.visibility = this.threadSeen ? 'visible' : 'hidden';
            }
        }
        this.root.style.transform = 'translate3d(' + (x - m.anchor.x) + 'px,' + (y - m.anchor.y) + 'px,0) scale(' +
            (mirrored ? -scale : scale) + ',' + scale + ')';
    }

    /**
     * @param {{dir: number, from: number, turns: number, exit: number, top: (number|undefined)}} plan with `top`, it hangs
     * @param {number} height the height its anchor starts at, if it does not hang
     * @param {number} scale
     * @param {string} gesture
     * @param {function(): void} done
     */
    run(plan, height, scale, gesture, done) {
        const m = this.atlas.meta;
        const steps = [{state: 'cruza', times: plan.turns}, {state: 'para', times: 1}, {state: gesture, times: 1},
            {state: 'huye', times: 0}];
        let x = plan.from;
        let y = plan.top === undefined ? height : plan.top;
        // On a whole pixel, for it to be as sharp as it can when still.
        this.threadX = Math.round(plan.from) + 0.5;
        this.threadSeen = false;
        let step = 0;
        let time = 0;
        let i = 0;
        let due = performance.now();
        this.root.style.visibility = 'visible';
        const frame = () => {
            const now = steps[step];
            const st = m.estados[now.state];
            this.draw(now.state, i, x, y, scale, plan.dir < 0);
            due += 1000 / st.fps;
            if (st.avance) {
                x += plan.dir * st.avance[i][0] * scale;
                y += st.avance[i][1] * scale;
            } else {
                x += plan.dir * (st.speed || 0) * scale / st.fps;
            }
            i++;
            if (i >= st.frames) {
                i = 0;
                time++;
                if (now.times && time >= now.times) {
                    step++;
                    time = 0;
                }
            }
            if (now.state === 'huye' && (plan.top !== undefined ? y < plan.exit : (plan.dir > 0 ? x > plan.exit : x < plan.exit))) {
                done();
                return;
            }
            this.timer = setTimeout(frame, Math.max(0, due - performance.now()));
        };
        frame();
    }

    /** Off the screen, and its pages out of memory. */
    remove() {
        clearTimeout(this.timer);
        if (this.water) {
            this.water.remove();
        }
        if (this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
        if (this.thread && this.thread.parentNode) {
            this.thread.parentNode.removeChild(this.thread);
        }
        Object.keys(this.images).forEach((p) => {
            this.images[p].onload = null;
            this.images[p].onerror = null;
            this.images[p].src = '';
        });
        this.images = {};
    }
}

/** One who comes with steam: the veil, its cut, the cover over the porthole and the squeegee, all moved in the same step as the sheet. */
class Clean extends Walk {
    constructor(layer, atlas, base, states, plan, width, height, scale) {
        super(layer, atlas, base, states);
        const v = atlas.meta.vaho;
        const shape = plan.shape;
        const cover = shape.tapon;
        const bar = v.barra;
        this.plan = plan;
        this.height = height;
        this.scale = scale;
        this.barAt = Math.round(bar.corte * scale);
        this.timers = [];
        this.veilOn = true;
        this.barOn = false;
        this.shownCover = 1;
        this.root.style.zIndex = '1';
        this.fading = null;
        if (v.borde) {
            // What comes in first: a soft ring at the size of its little picture, stretched by the compositor.
            this.fading = new Image();
            css(this.fading, {position: 'absolute', left: '0', top: '0', width: v.borde.w + 'px', height: v.borde.h + 'px', transformOrigin: '0 0', willChange: 'transform, opacity', zIndex: '2', opacity: '0.001',
                transform: 'translate3d(0,0,0) scale(1)'});
            this.fading.src = base + v.borde.image;
            layer.appendChild(this.fading);
        }
        this.width = width;
        this.cut = document.createElement('div');
        this.back = document.createElement('div');
        this.bar = document.createElement('div');
        this.veil = new Image();
        this.cover = new Image();
        css(this.cut, {position: 'absolute', left: '0', top: '0', width: width + 'px', height: height + 'px', overflow: 'hidden', willChange: 'transform', zIndex: '2'});
        css(this.back, {position: 'absolute', left: '0', top: '0', width: width + 'px', height: height + 'px', willChange: 'transform'});
        // At scale 1 the first time they are seen: what the browser keeps painted is the picture, not a whole screen of it (from memory of the compositor, to be verified).
        this.place = (image, x, y, w, h, k) => css(image, {position: 'absolute', left: '0', top: '0', width: w + 'px', height: h + 'px', transformOrigin: '0 0',
            willChange: 'transform, opacity', transform: 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + k + ')'});
        this.veilAt = [plan.ox, plan.oy, shape.w, shape.h];
        this.coverAt = [plan.ox + cover.x * plan.k, plan.oy + cover.y * plan.k, cover.w, cover.h];
        this.place(this.veil, this.veilAt[0], this.veilAt[1], shape.w, shape.h, 1);
        this.place(this.cover, this.coverAt[0], this.coverAt[1], cover.w, cover.h, 1);
        this.veil.style.opacity = '0.001';
        this.cover.style.opacity = '0.001';
        const barH = Math.round(bar.h * scale);
        css(this.bar, {position: 'absolute', left: '0', top: '0', width: width + 'px', height: barH + 'px', zIndex: '3', willChange: 'transform', visibility: 'hidden',
            backgroundImage: 'url("' + base + bar.image + '")', backgroundRepeat: 'repeat-x', backgroundSize: Math.round(bar.w * scale) + 'px ' + barH + 'px',
            transform: 'translate3d(0,' + (-barH) + 'px,0)'});
        this.veil.src = base + shape.image;
        this.cover.src = base + cover.image;
        this.back.appendChild(this.veil);
        this.back.appendChild(this.cover);
        this.cut.appendChild(this.back);
        layer.appendChild(this.cut);
        layer.appendChild(this.bar);
    }

    /** Waits for the veil and for the pages, paints them once, almost invisible, and takes the veil to the size of the screen. */
    prepare() {
        return Promise.all([this.veil, this.cover].concat(this.fading ? [this.fading] : []).map(function (img) {
            return new Promise(function (resolve, reject) {
                if (img.complete && img.naturalWidth) {
                    resolve();
                    return;
                }
                img.onload = resolve;
                img.onerror = reject;
            });
        })).then(() => super.prepare()).then(() => {
            const k = this.plan.k;
            this.place(this.veil, this.veilAt[0], this.veilAt[1], this.veilAt[2], this.veilAt[3], k);
            this.place(this.cover, this.coverAt[0], this.coverAt[1], this.coverAt[2], this.coverAt[3], k);
            this.veil.style.opacity = '0.001';
            this.cover.style.opacity = '0.001';
            return new Promise(function (resolve) {
                requestAnimationFrame(resolve);
            });
        });
    }

    /** What the cover, the cut and the squeegee do in this frame: the same task as the sheet, so they cannot get out of step. */
    drawSteam(st, i, y) {
        if (st.tapon && st.tapon[i] !== this.shownCover) {
            this.cover.style.opacity = st.tapon[i];
            this.shownCover = st.tapon[i];
        }
        if (!st.corte) {
            return;
        }
        const c = st.corte[i];
        if (c === null) {
            if (this.barOn) {
                this.dropBar();
            }
            return;
        }
        const at = Math.round(y + (c - this.atlas.meta.anchor.y) * this.scale);
        if (!this.barOn) {
            this.barOn = true;
            this.bar.style.visibility = 'visible';
        }
        this.barY = at;
        this.bar.style.transform = 'translate3d(0,' + (at - this.barAt) + 'px,0)';
        if (this.veilOn) {
            this.cut.style.transform = 'translate3d(0,' + (at - this.height) + 'px,0)';
            this.back.style.transform = 'translate3d(0,' + (this.height - at) + 'px,0)';
            if (at < -this.plan.over - 2) {
                // No steam left: it stops costing.
                this.veilOn = false;
                this.cut.style.visibility = 'hidden';
                this.veil.src = '';
                this.cover.src = '';
            }
        }
    }

    /** He has got out from under it: it falls off the bottom with one transition, whose curve is exactly t². */
    dropBar() {
        const to = this.height + this.plan.over + 4;
        const seconds = Math.sqrt(2 * (to - this.barY) / (this.atlas.meta.vaho.caida * this.scale));
        this.barOn = false;
        this.bar.style.transition = 'transform ' + seconds + 's cubic-bezier(.33333,0,.66667,.33333)';
        this.bar.style.transform = 'translate3d(0,' + (to - this.barAt) + 'px,0)';
        this.timers.push(setTimeout(() => {
            this.bar.style.visibility = 'hidden';
        }, seconds * 1000));
    }

    /** @param {number} mirrored -1 to go the other way round, 1 not; @param {function(): void} done */
    run(mirrored, done) {
        const m = this.atlas.meta;
        const v = m.vaho;
        const steps = this.plan.steps;
        const scale = this.scale;
        const fade = 'opacity ' + (v.entra - v.velo_a) + 's cubic-bezier(' + v.curva_entra.join(',') + ') ' + v.velo_a + 's';
        this.veil.style.transition = fade;
        this.cover.style.transition = fade;
        this.veil.style.opacity = '1';
        this.cover.style.opacity = '1';
        if (this.fading) {
            const sx = this.width / v.borde.w;
            const sy = this.height / v.borde.h;
            const at = (s) => 'translate3d(' + (this.width * (1 - s) / 2) + 'px,' + (this.height * (1 - s) / 2) + 'px,0) scale(' + (sx * s) + ',' + (sy * s) + ')';
            this.style = document.createElement('style');
            this.style.textContent = '@keyframes hk-edge-o{' + v.borde_op.map((k) => (100 * k[0] / v.entra) + '%{opacity:' + k[1] + '}').join('') + '}' +
                '@keyframes hk-edge-t{from{transform:' + at(v.borde_escala[0]) + '}to{transform:' + at(v.borde_escala[1]) + '}}';
            document.head.appendChild(this.style);
            this.fading.style.animation = 'hk-edge-o ' + v.entra + 's linear both,hk-edge-t ' + v.entra + 's cubic-bezier(' + v.borde_curva.join(',') + ') both';
            this.timers.push(setTimeout(() => this.dropFading(), v.entra * 1000));
        }
        // From then on the cover follows the atlas, frame by frame.
        this.timers.push(setTimeout(() => {
            this.cover.style.transition = 'none';
        }, v.entra * 1000));
        this.timers.push(setTimeout(() => {
            let y = 0;
            let step = 0;
            let time = 0;
            let i = 0;
            let due = performance.now();
            this.root.style.visibility = 'visible';
            const frame = () => {
                const now = steps[step];
                const st = m.estados[now.state];
                if (i === 0 && time === 0) {
                    if (now.y !== undefined) {
                        y = now.y;
                    }
                    if (now.behind !== undefined) {
                        // It changes while he is out of sight: behind the steam, or on top of the squeegee.
                        this.root.style.zIndex = now.behind ? '1' : '4';
                    }
                }
                this.draw(now.state, i, this.plan.x, y, scale, mirrored < 0);
                this.drawSteam(st, i, y);
                due += 1000 / st.fps;
                y += st.avance[i][1] * scale;
                i++;
                if (i >= st.frames) {
                    i = 0;
                    time++;
                    if (now.times && time >= now.times) {
                        step++;
                        time = 0;
                    }
                }
                if (now.leaves !== undefined && (now.leaves > 0 ? y > now.leaves : y < now.leaves)) {
                    if (now.state === 'huye') {
                        done();
                        return;
                    }
                    step++;
                    i = 0;
                    time = 0;
                }
                if (i === 0 && time === 0 && steps[step].wait) {
                    due += steps[step].wait * 1000;
                }
                this.timer = setTimeout(frame, Math.max(0, due - performance.now()));
            };
            frame();
        }, v.bicho_a * 1000));
    }

    /** Its seconds are over: out, with its picture and its rules. */
    dropFading() {
        if (this.fading && this.fading.parentNode) {
            this.fading.parentNode.removeChild(this.fading);
        }
        if (this.fading) {
            this.fading.src = '';
        }
        this.fading = null;
        if (this.style && this.style.parentNode) {
            this.style.parentNode.removeChild(this.style);
        }
    }

    remove() {
        this.timers.forEach(clearTimeout);
        this.timers = [];
        this.dropFading();
        [this.cut, this.bar].forEach(function (el) {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        this.veil.src = '';
        this.cover.src = '';
        super.remove();
    }
}

/** What falls over the whole screen, from the moment its tiles are ready until it has faded. */
class Fall {
    constructor(layer, atlas, base, width, height, scale) {
        const m = atlas.meta;
        this.timer = 0;
        this.seconds = m.dura;
        this.root = document.createElement('div');
        css(this.root, {position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', visibility: 'hidden'});
        this.images = [];
        this.layers = [];
        this.moves = [];
        const rules = [];
        m.capas.forEach((capa, i) => {
            const t = tileOf(capa, scale);
            const name = 'hk-fall-' + i;
            const shown = capa.opacidad === undefined ? 1 : capa.opacidad;
            rules.push('@keyframes ' + name + '-m{from{transform:translate3d(' + (t.turns > 0 ? -t.turns * t.w : 0) + 'px,' + (-t.h) +
                'px,0)}to{transform:translate3d(' + (t.turns < 0 ? t.turns * t.w : 0) + 'px,0,0)}}');
            rules.push('@keyframes ' + name + '-f{0%{opacity:0}' + (100 * m.entra / m.dura) + '%{opacity:' + shown + '}' +
                (100 * (m.dura - m.sale) / m.dura) + '%{opacity:' + shown + '}100%{opacity:0}}');
            this.moves.push(name + '-m ' + t.seconds + 's linear infinite,' + name + '-f ' + m.dura + 's linear both');
            const image = new Image();
            image.src = base + capa.image;
            this.images.push(image);
            // Each with its own fade: on a common parent, the compositor would draw two whole screens into one surface more.
            const el = document.createElement('div');
            css(el, {position: 'absolute', left: '0', top: '0', width: (width + Math.abs(t.turns) * t.w) + 'px',
                height: (height + t.h) + 'px', backgroundImage: 'url("' + base + capa.image + '")', backgroundRepeat: 'repeat',
                backgroundSize: t.w + 'px ' + t.h + 'px', willChange: 'transform, opacity', opacity: '0.001'});
            this.layers.push(el);
            this.root.appendChild(el);
        });
        this.style = document.createElement('style');
        this.style.textContent = rules.join('\n');
        document.head.appendChild(this.style);
        layer.appendChild(this.root);
    }

    /** Waits for the tiles and paints them once, almost invisible, so that decoding them does not land in the middle of the fall. */
    prepare() {
        return Promise.all(this.images.map(function (img) {
            return new Promise(function (resolve, reject) {
                if (img.complete && img.naturalWidth) {
                    resolve();
                    return;
                }
                img.onload = resolve;
                img.onerror = reject;
            });
        })).then(() => new Promise(function (resolve) {
            requestAnimationFrame(function () {
                requestAnimationFrame(resolve);
            });
        })).then(() => {
            this.root.style.visibility = 'visible';
            return new Promise(function (resolve) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(resolve);
                });
            });
        });
    }

    /** @param {function(): void} done */
    run(done) {
        this.layers.forEach((el, i) => {
            el.style.opacity = '';
            el.style.animation = this.moves[i];
        });
        this.timer = setTimeout(done, this.seconds * 1000);
    }

    /** Off the screen, and its tiles and rules with it. */
    remove() {
        clearTimeout(this.timer);
        if (this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
        if (this.style.parentNode) {
            this.style.parentNode.removeChild(this.style);
        }
        this.images.forEach(function (img) {
            img.onload = null;
            img.onerror = null;
            img.src = '';
        });
        this.images = [];
    }
}

export class Surprises {
    /**
     * @param {HTMLElement} frame what it walks over
     * @param {object} hooks {quiet: a screen that keeps still, floor: the height to walk on, or null for the bottom,
     *     raining: whether it is raining right now, note: tells of what failed}
     */
    constructor(frame, hooks) {
        this.frame = frame;
        this.hooks = hooks;
        this.characters = [];
        this.every = 0;
        this.distance = 3;
        this.due = 0;
        this.walk = null;
        this.asked = null;
        this.atlases = {};
        this.layer = document.createElement('div');
        css(this.layer, {position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', overflow: 'hidden',
            zIndex: '30', pointerEvents: 'none'});
    }

    /**
     * What the manifest says.
     *
     * @param {object|undefined} surprises {every: minutes, characters: [{id, atlas, season, when}]}, or nothing if off
     * @param {number} distance
     * @param {number} now
     */
    configure(surprises, distance, now) {
        this.distance = distance;
        this.characters = (surprises && surprises.characters) || [];
        const every = (surprises && surprises.every) || 0;
        if (!this.characters.length) {
            this.every = 0;
            this.due = 0;
            return;
        }
        if (every !== this.every || !this.due) {
            this.every = every;
            this.due = dueAfter(now, every, Math.random);
        }
    }

    /**
     * One now, without waiting for its turn.
     *
     * @param {{id: string, atlas: string}} [character] this one; else one of those chosen, when it comes out
     */
    askNow(character) {
        this.asked = {who: character || null, at: Date.now()};
    }

    /**
     * Who comes out: those whose time it is, by their season or by the sky. With an order, and nobody else, any of those chosen,
     * so that it is not lost.
     *
     * @param {number} now milliseconds
     * @param {boolean} [ordered]
     * @returns {{id: string, atlas: string}|null}
     */
    pick(now, ordered) {
        const date = new Date(now);
        const raining = this.hooks.raining();
        const due = this.characters.filter(function (c) {
            return inSeason(c.season, date) && (c.when !== 'rain' || raining);
        });
        const from = due.length || !ordered ? due : this.characters;
        return from.length ? from[Math.floor(Math.random() * from.length)] : null;
    }

    /**
     * Each second.
     *
     * @param {number} now milliseconds
     * @param {boolean} allowed nothing urgent on it and the screen on
     * @param {boolean} [onlyAsked] only when asked, not by itself (the panel's preview)
     */
    tick(now, allowed, onlyAsked) {
        if (!allowed || this.hooks.quiet()) {
            this.asked = null;
            this.stop();
            return;
        }
        if (this.walk) {
            return;
        }
        if (this.asked) {
            const who = this.asked.who || this.pick(now, true);
            if (who) {
                this.asked = null;
                this.go(who);
                return;
            }
            if (now - this.asked.at > ORDER_WAITS_MS) {
                this.asked = null;
            }
        }
        if (!onlyAsked && this.every && now >= this.due) {
            this.due = dueAfter(now, this.every, Math.random);
            this.go(this.pick(now));
        }
    }

    /** Fetches what it needs, and off it goes. */
    go(character) {
        if (!character) {
            return;
        }
        const base = character.atlas.slice(0, character.atlas.lastIndexOf('/') + 1);
        const known = this.atlases[character.id];
        // Holds the place while it is prepared: only one at a time.
        const holding = {remove: function () {
            holding.cut = true;
        }};
        this.walk = holding;
        (known ? Promise.resolve(known) : fetch(character.atlas).then(function (r) {
            return r.json();
        })).then((atlas) => {
            this.atlases[character.id] = atlas;
            this.frame.appendChild(this.layer);
            const width = window.innerWidth;
            const height = window.innerHeight;
            const scale = scaleOf(width, height, this.distance);
            const done = () => {
                this.stop();
            };
            let walk;
            let start;
            if (atlas.meta.tipo === 'capas') {
                walk = new Fall(this.layer, atlas, base, width, height, scale);
                start = () => walk.run(done);
            } else if (atlas.meta.vaho) {
                const gesture = atlas.meta.gestos[Math.floor(Math.random() * atlas.meta.gestos.length)];
                const slips = Math.random() < atlas.meta.vaho.resbala_p;
                const states = ['cruza', 'para', 'baja', 'cae', 'limpia', gesture, 'huye'].concat(slips ? ['resbala'] : []);
                walk = new Clean(this.layer, atlas, base, states, cleanOf(atlas.meta, width, height, scale, gesture, slips), width, height,
                    scale);
                start = () => walk.run(Math.random() < 0.5 ? 1 : -1, done);
            } else {
                const gestures = atlas.meta.gestos;
                const gesture = gestures[Math.floor(Math.random() * gestures.length)];
                walk = new Walk(this.layer, atlas, base, ['cruza', 'para', gesture, 'huye']);
                const stop = heightOf(atlas.meta, height, scale, this.hooks.floor(), Math.random);
                const plan = atlas.meta.estados.cruza.hilo ? hangOf(atlas.meta, width, stop, scale, Math.random) :
                    walkOf(atlas.meta, width, scale, Math.random);
                const run = (end) => walk.run(plan, stop, scale, gesture, end);
                // What comes with water: the water rises, the creature comes a moment later and, once it is gone, the water goes down.
                start = () => {
                    if (!walk.water) {
                        run(done);
                        return;
                    }
                    walk.water.mount(width, height, scale).then(() => {
                        if (!walk.water.gone) {
                            walk.water.rise(() => run(() => walk.water.fall(done)));
                        }
                    });
                };
            }
            return walk.prepare().then(() => {
                if (holding.cut) {
                    walk.remove();
                    return;
                }
                this.walk = walk;
                start();
            }, function (e) {
                walk.remove();
                throw e;
            });
        }).catch((e) => {
            if (this.walk === holding) {
                this.walk = null;
            }
            this.hooks.note('surprise ' + character.id + ': ' + (e && e.message || 'its files do not load'));
        });
    }

    /** Off the screen, if it is on it. */
    stop() {
        if (this.walk) {
            this.walk.remove();
            this.walk = null;
        }
        if (this.layer.parentNode) {
            this.layer.parentNode.removeChild(this.layer);
        }
    }
}
