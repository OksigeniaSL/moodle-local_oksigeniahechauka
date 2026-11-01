// «Sorpresas»: now and then a character crosses the screen on a layer of its own, stops, looks at whoever is there, makes a
// gesture and runs away. It knows nothing of what goes on under it: slides come and go, and it carries on. Only an urgent
// notice takes it off, and a screen that keeps still never has one.
//
// A sheet is the art direction's (kit/hechauka-sorpresas): pages of frames and an atlas that says everything. Nothing
// here repaints: a frame with `overflow: hidden` holds each page as an <img> on its layer, and each step changes only
// `transform` (and the shadow's `opacity`), never `background-position`. The position goes forward with the frame
// (speed / fps px at each change), never on a clock of its own: the sheet is drawn in the frame that moves at `speed`, so
// what is planted stays planted only if both change together.

const LEAST_MINUTES = 15;
const STEP_BASE = 1080;
// Bigger from afar, and softer: the sheets are drawn for 1080.
const BY_DISTANCE = {3: 1, 5: 1.25, 8: 1.5};
// Stands off the very edge of the screen.
const EDGE = 6;

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
        this.root.appendChild(this.shadow);
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
        const s = m.estados[state].sombra[i];
        this.shadow.style.transform = 'translate3d(' + (s[0] - s[1] * 0.56) + 'px,0,0) scaleX(' + (s[1] * 1.12 / 100) + ')';
        this.shadow.style.opacity = s[2];
        this.root.style.transform = 'translate3d(' + (x - m.anchor.x) + 'px,' + (y - m.anchor.y) + 'px,0) scale(' +
            (mirrored ? -scale : scale) + ',' + scale + ')';
    }

    /**
     * @param {{dir: number, from: number, turns: number, exit: number}} plan
     * @param {number} floor the height it walks on
     * @param {number} scale
     * @param {string} gesture
     * @param {function(): void} done
     */
    run(plan, floor, scale, gesture, done) {
        const m = this.atlas.meta;
        const steps = [{state: 'cruza', times: plan.turns}, {state: 'para', times: 1}, {state: gesture, times: 1},
            {state: 'huye', times: 0}];
        let x = plan.from;
        let step = 0;
        let time = 0;
        let i = 0;
        let due = performance.now();
        this.root.style.visibility = 'visible';
        const frame = () => {
            const now = steps[step];
            const st = m.estados[now.state];
            this.draw(now.state, i, x, floor, scale, plan.dir < 0);
            due += 1000 / st.fps;
            x += plan.dir * (st.speed || 0) * scale / st.fps;
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

export class Surprises {
    /**
     * @param {HTMLElement} frame what it walks over
     * @param {object} hooks {quiet: a screen that keeps still, floor: the height to walk on, or null for the bottom,
     *     note: tells of what failed}
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
     * @param {object|undefined} surprises {every: minutes, characters: [{id, atlas}]}, or nothing if off
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
     * @param {{id: string, atlas: string}} [character] this one; else one of those chosen
     */
    askNow(character) {
        this.asked = character || this.pick();
    }

    pick() {
        return this.characters.length ? this.characters[Math.floor(Math.random() * this.characters.length)] : null;
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
            const asked = this.asked;
            this.asked = null;
            this.go(asked);
        } else if (!onlyAsked && this.every && now >= this.due) {
            this.due = dueAfter(now, this.every, Math.random);
            this.go(this.pick());
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
            const gestures = atlas.meta.gestos;
            const gesture = gestures[Math.floor(Math.random() * gestures.length)];
            this.frame.appendChild(this.layer);
            const walk = new Walk(this.layer, atlas, base, ['cruza', 'para', gesture, 'huye']);
            return walk.prepare().then(() => {
                if (holding.cut) {
                    walk.remove();
                    return;
                }
                this.walk = walk;
                const scale = scaleOf(window.innerWidth, window.innerHeight, this.distance);
                const floor = this.hooks.floor();
                walk.run(walkOf(atlas.meta, window.innerWidth, scale, Math.random),
                    floor === null ? window.innerHeight - EDGE * scale : floor, scale, gesture, () => {
                        this.stop();
                    });
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
