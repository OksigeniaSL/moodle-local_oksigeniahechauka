// The screen with nothing to show yet: a screen just paired, or a centre with no pictures, nothing today and no agenda. It may
// spend days like this in a hall, so it has to look like a decision and be worth having on the wall. One idea: the day goes by on
// it. The sun of the centre's colours crosses a sky of its colours, one step a minute, over the ground that holds whose screen this
// is and what time it is. Gaudí, 2 November 2026.

function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) {
        n.className = cls;
    }
    if (text !== undefined && text !== null) {
        n.textContent = text;
    }
    return n;
}

const DAY_FROM = 7;
const DAY_TO = 20;
// Skies where a sun would be a lie: everything but clear, fair and partly cloudy.
const CLEAR = /^(clearsky|fair|partlycloudy)/;

function luminance(rgb) {
    const c = rgb.map(function (v) {
        const x = v / 255;
        return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4);
    });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}

/**
 * How far apart two colours are, as computed by the browser («rgb(…)»). 21 if one cannot be read: nothing to correct then.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function contrast(a, b) {
    const parse = function (t) {
        const m = /rgba?\(([^)]+)\)/.exec(t || '');
        return m ? m[1].split(',').slice(0, 3).map(parseFloat) : null;
    };
    const x = parse(a);
    const y = parse(b);
    if (!x || !y) {
        return 21;
    }
    const l = luminance(x);
    const m = luminance(y);
    return (Math.max(l, m) + .05) / (Math.min(l, m) + .05);
}

/**
 * Where the sky is at a given time: day or night, how far along its arc (0 to 1), and whether the sun shows.
 * With a place, the weather says if it is night, which an hour cannot (a December in Wisconsin, a June in Oslo).
 *
 * @param {number} hours
 * @param {number} minutes
 * @param {string} [symbol] the weather's symbol now, if there is a place
 * @returns {{night: boolean, along: number, covered: boolean}}
 */
export function skyAt(hours, minutes, symbol) {
    const h = hours + minutes / 60;
    const night = symbol ? /_night$/.test(symbol) : (h < DAY_FROM || h >= DAY_TO);
    const span = DAY_TO - DAY_FROM;
    let along;
    if (night) {
        along = ((h - DAY_TO + 24) % 24) / (24 - span);
        if (along > 1) {
            along = 0;                         // night already, by the weather, before the hour says so
        }
    } else {
        along = (h - DAY_FROM) / span;
    }
    return {night, along: Math.min(.95, Math.max(.05, along)), covered: !!symbol && !night && !CLEAR.test(symbol)};
}

/**
 * Where the header's parts go, what the sky holds and the code to add the first thing.
 *
 * @param {HTMLElement} into the full-screen layer
 * @param {HTMLElement} head a header of its own: its clock and its weather go on by themselves
 * @param {object} o {qr: the code's box or null, qrLabel, credit, still: nothing moves, primary, accent: as computed}
 * @returns {{node: HTMLElement, tick: function(Date, string=)}}
 */
export function buildIdle(into, head, o) {
    const s = el('section', 'hk-reposo');
    const sky = el('div', 'hk-reposo-cielo');
    const stars = el('i', 'hk-reposo-estrellas');
    const body = el('i', 'hk-reposo-astro');
    // The day's way, in dots: it is what says that the sun is telling the time, not decorating.
    const way = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    way.setAttribute('class', 'hk-reposo-camino');
    way.setAttribute('aria-hidden', 'true');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    way.appendChild(line);
    sky.appendChild(stars);
    sky.appendChild(way);
    sky.appendChild(body);
    ['a', 'b', 'c'].forEach(function (k) {
        sky.appendChild(el('i', 'hk-reposo-nube hk-reposo-nube-' + k));
    });
    s.appendChild(sky);
    if (contrast(o.primary, o.accent) < 1.5) {
        s.setAttribute('data-sol-claro', '');      // a centre's two colours too close for a sun to show
    }
    const ground = el('div', 'hk-reposo-tierra');
    s.appendChild(ground);

    // The name or the logo on one side; on the other the clock, with the date and the weather over it.
    const mark = el('div', 'hk-reposo-marca');
    Array.prototype.slice.call(head.querySelectorAll('.hk-logo-claro, .hk-logo-oscuro, .hk-lugar')).forEach(function (n) {
        mark.appendChild(n);
    });
    head.insertBefore(mark, head.firstChild);
    const hour = head.querySelector('.hk-hora');
    const over = el('div', 'hk-reposo-sobre');
    over.appendChild(head.querySelector('.hk-tiempo'));
    over.appendChild(hour.querySelector('.hk-fecha'));
    hour.insertBefore(over, hour.firstChild);
    ground.appendChild(head);

    if (o.credit) {
        s.appendChild(el('p', 'hk-credito-tiempo', o.credit));
    }
    if (o.qr) {
        const corner = el('aside', 'hk-reposo-qr');
        corner.appendChild(o.qr);
        if (o.qrLabel) {
            corner.appendChild(el('p', 'hk-reposo-qr-texto', o.qrLabel));
        }
        s.appendChild(corner);
    }
    into.appendChild(s);

    let placed = false;
    return {
        node: s,
        /**
         * The sun or the moon in its place on the arc; the words a few pixels off where they were, which is all the rest a panel
         * needs after days of the same picture and nobody sees. Once a minute: the move itself is what takes that minute.
         *
         * @param {Date} d
         * @param {string} [symbol]
         */
        tick(d, symbol) {
            const at = skyAt(d.getHours(), d.getMinutes(), symbol);
            if (at.night) {
                s.setAttribute('data-noche', '');
            } else {
                s.removeAttribute('data-noche');
            }
            if (at.covered) {
                s.setAttribute('data-cubierto', '');
            } else {
                s.removeAttribute('data-cubierto');
            }
            const w = sky.clientWidth;
            const horizon = ground.offsetTop;
            const size = body.offsetWidth;
            if (!w || !size) {
                return;
            }
            const rise = Math.max(horizon - size * .78, 0);
            const angle = at.along * Math.PI;
            const wide = w / 2 - size * .72;           // the sun stays whole on the screen, at either end of its way
            const x = w / 2 - Math.cos(angle) * wide - size / 2;
            const y = horizon - Math.sin(angle) * rise - size / 2;
            line.setAttribute('cx', String(w / 2));
            line.setAttribute('cy', String(horizon));
            line.setAttribute('rx', String(wide));
            line.setAttribute('ry', String(rise));
            if (!placed) {
                body.style.transition = 'none';
            }
            body.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
            if (!placed) {
                void body.offsetWidth;
                body.style.transition = '';
                placed = true;
            }
            if (!o.still) {
                const t = d.getHours() * 60 + d.getMinutes();
                const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
                const dx = Math.sin(t * Math.PI / 97) * rem * 1.4;
                const dy = Math.sin(t * Math.PI / 61) * rem * .7;
                head.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
            }
        },
    };
}
