// What the device says about touch, and the touches that really reach the page: how many of each kind of event and where
// the last one fell, as a share of the page. It only listens, so nothing on the screen changes. The heartbeat carries it,
// and the server can tell whether a touch screen's touches get to the player and whether they turn with the picture.

const EVENTS = ['pointerdown', 'touchstart', 'mousedown'];
// Only counted: a finger the browser took for its own gesture, and the click the browser makes of a touch. Far fewer clicks
// than touches: the frame of the screen moves or holds the finger too much for the browser to call it a tap.
const COUNTED = ['pointercancel', 'click'];

// The place of an event, as a share of the page from its top left corner, rounded to two decimals.
export function shareOf(x, y, width, height) {
    const share = function (v, size) {
        return size > 0 ? Math.round(Math.max(0, Math.min(1, v / size)) * 100) / 100 : 0;
    };
    return {x: share(x, width), y: share(y, height)};
}

export class Touches {
    constructor(win) {
        this.win = win;
        this.counts = {};
        this.last = null;
    }

    // Listens on the whole page, before anything else and without stopping anything.
    listen() {
        const self = this;
        const doc = this.win.document;
        EVENTS.concat(COUNTED).forEach(function (type) {
            doc.addEventListener(type, function (e) {
                self.seen(e);
            }, {capture: true, passive: true});
        });
        return this;
    }

    seen(e) {
        this.counts[e.type] = (this.counts[e.type] || 0) + 1;
        // One touch comes as several events (a pointer, a touch, then a mouse of the browser's own): the last place is
        // the one of the richest kind the page gets, which says whether it was a finger.
        const counts = this.counts;
        if (COUNTED.indexOf(e.type) !== -1) {
            return;
        }
        if (EVENTS.slice(0, EVENTS.indexOf(e.type)).some(function (type) {
            return counts[type];
        })) {
            return;
        }
        const point = e.touches && e.touches.length ? e.touches[0] : e;
        if (typeof point.clientX !== 'number') {
            return;
        }
        const place = shareOf(point.clientX, point.clientY, this.win.innerWidth, this.win.innerHeight);
        this.last = {type: e.type, kind: e.pointerType || '', x: place.x, y: place.y};
    }

    // For the heartbeat: what the device says, and what came since the page opened.
    report() {
        const nav = this.win.navigator || {};
        const out = {
            points: nav.maxTouchPoints || 0,
            pointer: typeof this.win.PointerEvent === 'function',
            ratio: Math.round((this.win.devicePixelRatio || 1) * 100) / 100,
        };
        const counts = this.counts;
        if (Object.keys(counts).length) {
            out.events = {};
            EVENTS.concat(COUNTED).forEach(function (type) {
                out.events[type] = counts[type] || 0;
            });
            out.last = this.last;
        }
        return out;
    }
}
