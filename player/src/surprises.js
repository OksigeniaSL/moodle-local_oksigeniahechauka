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
// layer, each moved by a CSS animation of `transform` on the compositor, with no code per frame.

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
 * The height its anchor goes at. What walks, on the ticker if it is in sight and if not on the bottom edge; what flies has no
 * floor: anywhere within the heights its atlas says (`altura`, at base 1080), on any shape of screen.
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
    return atlas.meta.pages || atlas.meta.capas.map(function (capa) {
        return capa.image;
    });
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

/** One character on its way, from the moment its pages are ready until it is out of the screen. */
class Walk {
    constructor(layer, atlas, base, states) {
        const m = atlas.meta;
        this.atlas = atlas;
        this.layer = layer;
        this.page = -1;
        this.timer = 0;
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
        })).then(() => new Promise((resolve) => {
            this.root.style.visibility = 'visible';
            this.root.style.opacity = '0.001';
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
        this.root.style.transform = 'translate3d(' + (x - m.anchor.x) + 'px,' + (y - m.anchor.y) + 'px,0) scale(' +
            (mirrored ? -scale : scale) + ',' + scale + ')';
    }

    /**
     * @param {{dir: number, from: number, turns: number, exit: number}} plan
     * @param {number} height the height its anchor starts at
     * @param {number} scale
     * @param {string} gesture
     * @param {function(): void} done
     */
    run(plan, height, scale, gesture, done) {
        const m = this.atlas.meta;
        const steps = [{state: 'cruza', times: plan.turns}, {state: 'para', times: 1}, {state: gesture, times: 1},
            {state: 'huye', times: 0}];
        let x = plan.from;
        let y = height;
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
            if (now.state === 'huye' && (plan.dir > 0 ? x > plan.exit : x < plan.exit)) {
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
        if (this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
        Object.keys(this.images).forEach((p) => {
            this.images[p].onload = null;
            this.images[p].onerror = null;
            this.images[p].src = '';
        });
        this.images = {};
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
            } else {
                const gestures = atlas.meta.gestos;
                const gesture = gestures[Math.floor(Math.random() * gestures.length)];
                walk = new Walk(this.layer, atlas, base, ['cruza', 'para', gesture, 'huye']);
                start = () => walk.run(walkOf(atlas.meta, width, scale, Math.random),
                    heightOf(atlas.meta, height, scale, this.hooks.floor(), Math.random), scale, gesture, done);
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
