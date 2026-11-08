// Oksigenia Hechauka: the birthday card of the dashboard, its moving parts (art direction, 8 November 2026).
//
// The look and the way in are all CSS (greeting.css): the card is complete without this file. This adds what CSS cannot
// do: the burst of paper confetti from behind the picture, timed with the CSS; the creature of the name when there is
// no picture (BichitoHk, from bichito-hechauka.js, loaded before this file); the picture as a button for more confetti;
// the Access panel's «pause animations»; a page opened in a background tab waits to party until it is seen; and the
// way out, HkGreeting.leave(card), for the inline script of the plugin to call when the server has closed the card.
//
// A plain script, not an AMD module: in Moodle 5.3, Firefox 98 does not start AMD modules, and the card has to work
// there too. Chrome 93 and Firefox 98 and later; nothing newer than ES2017 is called.
//
//   HkGreeting.start(card)   sets a card up (done by itself, for every .hk-greeting on the page, when this file runs)
//   HkGreeting.leave(card)   the bunting goes up, the balloons fly away, the card folds and is removed; a Promise
//   HkGreeting.burst(card)   one more burst of confetti from behind the picture
(function () {
    'use strict';

    if (window.HkGreeting) {
        window.HkGreeting.scan();
        return;
    }

    // When the burst goes, counted from the moment the picture starts to open (its CSS animation, delay included).
    var BURST_AT = 980;
    // A burst more than this late, after the picture has settled, would look unrelated: it is left out.
    var BURST_LATEST = 2600;
    var MOST = 90;

    function motionAllowed(card) {
        if (card.classList.contains('is-still')) {
            return false;
        }
        return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    // The Access panel's «Pausar animaciones», which styles cannot read.
    function accessPaused() {
        try {
            return JSON.parse(window.localStorage.getItem('oksiacSettings') || '{}').pauseAnim === true;
        } catch (e) {
            return false;
        }
    }

    // --- Colours --------------------------------------------------------------------------------------------------
    function rgbOf(colour) {
        var c = String(colour || '').trim();
        var m = /^#([0-9a-f]{3})$/i.exec(c);
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
        return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])] : null;
    }

    function luminance(rgb) {
        var f = function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
    }

    function mix(rgb, to, k) {
        return 'rgb(' + rgb.map(function (v, i) {
            return Math.round(v + (to[i] - v) * k);
        }).join(',') + ')';
    }

    // The paper: the site's gold and its brand colour, lighter and as it is, and white. Nothing that is not the site's.
    function coloursOf(card) {
        var cs = getComputedStyle(card);
        var gold = rgbOf(cs.getPropertyValue('--hkg-gold')) || [240, 173, 78];
        var main = rgbOf(cs.getPropertyValue('--hkg-main')) || [15, 108, 191];
        var white = [255, 255, 255];
        return [mix(gold, white, 0), mix(gold, white, 0.45), mix(main, white, 0.55), mix(main, white, 0.15), '#ffffff',
            mix(gold, white, 0)];
    }

    function darker(colour, k) {
        var c = rgbOf(colour);
        return c ? mix(c, [0, 0, 0], k) : colour;
    }

    // --- The confetti: paper cards that turn and flip as they fall, on one canvas over the page, only while it flies --
    var sky = null;

    function Sky() {
        var canvas = document.createElement('canvas');
        canvas.className = 'hk-greeting-confetti';
        canvas.setAttribute('aria-hidden', 'true');
        // Over the page and under Moodle's bar (1030), never in the way of a click.
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1029;pointer-events:none';
        document.body.appendChild(canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.pieces = [];
        this.raf = 0;
        this.last = 0;
        this.dirty = null;
        this.measure();
    }

    Sky.prototype.measure = function () {
        this.scale = Math.min(2, window.devicePixelRatio || 1);
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.canvas.width = Math.round(this.w * this.scale);
        this.canvas.height = Math.round(this.h * this.scale);
        this.dirty = null;
    };

    Sky.prototype.piece = function (x, y, vx, vy, colours, unit) {
        var shapes = ['rect', 'rect', 'rect', 'square', 'square', 'curl'];
        var shape = shapes[Math.floor(Math.random() * shapes.length)];
        var front = colours[Math.floor(Math.random() * colours.length)];
        var w = unit * (1.5 + Math.random() * 0.9);
        var h = unit * (0.62 + Math.random() * 0.34);
        if (shape === 'square') {
            w = h = unit * (0.95 + Math.random() * 0.4);
        } else if (shape === 'curl') {
            w = unit * (2.6 + Math.random() * 1.2);
            h = unit * 0.36;
        }
        return {
            x: x, y: y, vx: vx, vy: vy, w: w, h: h, shape: shape, front: front, back: darker(front, 0.22), unit: unit,
            rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 8,
            flip: Math.random() * Math.PI * 2, flipSpeed: 5 + Math.random() * 7,
            sway: 0.6 + Math.random() * 1.4, swayAt: Math.random() * Math.PI * 2, age: 0,
            life: 3.2 + Math.random() * 1.6
        };
    };

    // A burst from behind a circle: from its rim, up and out, as from a party popper hidden behind it.
    Sky.prototype.burst = function (cx, cy, radius, count, colours) {
        var unit = 6.5;
        var over = this.pieces.length + count - MOST;
        if (over > 0) {
            this.pieces.splice(0, over);
        }
        // The fan leans a little towards the words, over the card rather than off its top.
        var lean = document.documentElement.dir === 'rtl' ? -0.3 : 0.3;
        for (var i = 0; i < count; i++) {
            var a = -Math.PI / 2 + lean + (Math.random() - 0.5) * 2.7;
            var speed = unit * (46 + Math.random() * 60);
            var sx = cx + Math.cos(a) * radius * 0.92;
            var sy = cy + Math.sin(a) * radius * 0.92;
            this.pieces.push(this.piece(sx, sy, Math.cos(a) * speed * 1.45, Math.sin(a) * speed, colours, unit));
        }
        this.run();
    };

    Sky.prototype.run = function () {
        if (this.raf) {
            return;
        }
        var self = this;
        this.last = 0;
        var step = function (t) {
            self.raf = 0;
            if (self.tick(t)) {
                self.raf = window.requestAnimationFrame(step);
            } else {
                self.remove();
            }
        };
        this.raf = window.requestAnimationFrame(step);
    };

    Sky.prototype.tick = function (t) {
        var dt = this.last ? Math.min(0.05, (t - this.last) / 1000) : 0.016;
        this.last = t;
        var ctx = this.ctx;
        var s = this.scale;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Only where there was paper the frame before.
        var d = this.dirty;
        if (d) {
            ctx.clearRect(d[0], d[1], d[2] - d[0], d[3] - d[1]);
        } else {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        var x0 = Infinity;
        var y0 = Infinity;
        var x1 = -Infinity;
        var y1 = -Infinity;
        var keep = [];
        // Paper: much drag, so after the first push it floats down rather than drops.
        var drag = Math.pow(0.12, dt);
        for (var i = 0; i < this.pieces.length; i++) {
            var p = this.pieces[i];
            var gravity = p.unit * 70;
            var fall = p.unit * 17;
            p.age += dt;
            p.vx *= drag;
            p.vy = p.vy * drag + gravity * dt;
            if (p.vy > fall) {
                p.vy = fall + (p.vy - fall) * 0.6;
            }
            p.swayAt += dt * 2.4;
            p.x += (p.vx + Math.sin(p.swayAt) * p.sway * p.unit * 6) * dt;
            p.y += p.vy * dt;
            p.rot += p.spin * dt;
            p.flip += p.flipSpeed * dt;
            if (p.y > this.h + 40 || p.age > p.life) {
                continue;
            }
            keep.push(p);
            x0 = Math.min(x0, p.x - p.w);
            y0 = Math.min(y0, p.y - p.w);
            x1 = Math.max(x1, p.x + p.w);
            y1 = Math.max(y1, p.y + p.w);
            var fade = p.life - p.age < 0.7 ? (p.life - p.age) / 0.7 : 1;
            var flip = Math.cos(p.flip);
            var cos = Math.cos(p.rot) * s;
            var sin = Math.sin(p.rot) * s;
            ctx.globalAlpha = fade;
            ctx.fillStyle = flip >= 0 ? p.front : p.back;
            if (p.shape === 'curl') {
                ctx.setTransform(cos, sin, -sin, cos, p.x * s, p.y * s);
                ctx.strokeStyle = ctx.fillStyle;
                ctx.lineWidth = p.h;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-p.w / 2, 0);
                ctx.bezierCurveTo(-p.w / 6, -p.w / 3 * flip, p.w / 6, p.w / 3 * flip, p.w / 2, 0);
                ctx.stroke();
            } else {
                var fh = Math.max(0.12, Math.abs(flip));
                ctx.setTransform(cos, sin, -sin * fh, cos * fh, p.x * s, p.y * s);
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            }
        }
        ctx.globalAlpha = 1;
        this.pieces = keep;
        if (!keep.length) {
            return false;
        }
        this.dirty = [Math.max(0, Math.floor(x0 * s) - 2), Math.max(0, Math.floor(y0 * s) - 2),
            Math.min(this.canvas.width, Math.ceil(x1 * s) + 2), Math.min(this.canvas.height, Math.ceil(y1 * s) + 2)];
        return true;
    };

    Sky.prototype.remove = function () {
        if (this.raf) {
            window.cancelAnimationFrame(this.raf);
            this.raf = 0;
        }
        this.pieces = [];
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        if (sky === this) {
            sky = null;
        }
    };

    window.addEventListener('resize', function () {
        if (sky) {
            sky.measure();
        }
    });

    // One burst from behind the picture of a card, if it is in sight and motion is allowed.
    function burst(card, count) {
        if (!card || !motionAllowed(card) || document.hidden) {
            return;
        }
        var face = card.querySelector('.hk-greeting-face');
        if (!face) {
            return;
        }
        var r = face.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) {
            return;
        }
        if (!sky) {
            sky = new Sky();
        }
        sky.burst(r.left + r.width / 2, r.top + r.height / 2, r.width / 2, count || 84, coloursOf(card));
    }

    // --- The creature of the name, when there is no picture ------------------------------------------------------
    function creature(card) {
        var initial = card.querySelector('[data-hk-bichito]');
        if (!initial || !window.BichitoHk || initial.parentNode.querySelector('.hk-greeting-creature')) {
            return;
        }
        var box = document.createElement('span');
        box.className = 'hk-greeting-creature';
        box.setAttribute('aria-hidden', 'true');
        try {
            box.innerHTML = window.BichitoHk.svg(initial.getAttribute('data-hk-bichito'), {bg: true});
        } catch (e) {
            return;
        }
        initial.parentNode.appendChild(box);
        // Painted first, then shown, so it fades in.
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                initial.parentNode.classList.add('has-creature');
            });
        });
    }

    // --- The picture as a button for more confetti --------------------------------------------------------------
    function moreButton(card) {
        var face = card.querySelector('.hk-greeting-face');
        var label = card.getAttribute('data-more');
        if (!face || !label || !motionAllowed(card)) {
            return;
        }
        face.setAttribute('role', 'button');
        face.setAttribute('tabindex', '0');
        face.setAttribute('aria-label', label);
        face.setAttribute('title', label);
        var last = 0;
        var again = function () {
            var now = Date.now();
            if (now - last < 700) {
                return;
            }
            last = now;
            burst(card, 30);
        };
        face.addEventListener('click', again);
        face.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                again();
            }
        });
    }

    // --- The party, timed with the CSS -------------------------------------------------------------------------------
    // How far the way in has gone, from the picture's own CSS animation; null when it cannot be read.
    function elapsed(card) {
        var face = card.querySelector('.hk-greeting-face');
        if (!face || !face.getAnimations) {
            return null;
        }
        var list = face.getAnimations();
        for (var i = 0; i < list.length; i++) {
            if (list[i].animationName === 'hkg-pop') {
                // Not yet started on the first frame: it is at its very beginning.
                return list[i].currentTime === null ? 0 : list[i].currentTime;
            }
        }
        // No running animation: the way in is over (or there was none).
        return Infinity;
    }

    function party(card) {
        if (card.classList.contains('is-seen') || !motionAllowed(card)) {
            return;
        }
        var go = function () {
            var at = elapsed(card);
            if (at === null) {
                at = 0;
            }
            if (at > BURST_LATEST) {
                return;
            }
            window.setTimeout(function () {
                burst(card, 84);
            }, Math.max(0, BURST_AT - at));
        };
        if (!document.hidden) {
            go();
            return;
        }
        // Opened in a tab nobody is looking at: the CSS waits, and all of it starts when the tab is seen.
        card.classList.add('is-waiting');
        var seen = function () {
            if (document.hidden) {
                return;
            }
            document.removeEventListener('visibilitychange', seen);
            card.classList.remove('is-waiting');
            go();
        };
        document.addEventListener('visibilitychange', seen);
    }

    // Whatever of the way in is still running ends at once: the way out works with transitions.
    function settle(card) {
        if (!card.getAnimations) {
            return;
        }
        card.getAnimations({subtree: true}).forEach(function (a) {
            try {
                a.finish();
            } catch (e) {
                a.cancel();
            }
        });
    }

    /**
     * The way out, once the card is closed: the bunting goes up, the balloons fly away, the words fade, and the card
     * folds up and is removed, the page below coming up smoothly. If the focus was in the card, it goes to the page.
     *
     * @param {HTMLElement} card
     * @returns {Promise}
     */
    function leave(card) {
        return new Promise(function (resolve) {
            if (!card || !card.parentNode || card.classList.contains('is-leaving')) {
                resolve();
                return;
            }
            var main = card.parentNode;
            var hadFocus = card.contains(document.activeElement);
            var still = !motionAllowed(card);
            settle(card);
            if (sky) {
                sky.remove();
            }
            // The plugin's script may have put .is-closing on already, when the button was pressed: that much of the
            // way out has been seen while the server answered.
            var since = card.hkClosingAt ? Date.now() - card.hkClosingAt : 0;
            card.classList.add('is-closing');
            card.style.height = card.getBoundingClientRect().height + 'px';
            window.setTimeout(function () {
                card.classList.add('is-leaving');
                card.style.minHeight = '0px';
                card.style.height = '0px';
                window.setTimeout(function () {
                    if (card.parentNode) {
                        card.parentNode.removeChild(card);
                    }
                    if (hadFocus && main.focus) {
                        if (!main.hasAttribute('tabindex')) {
                            main.setAttribute('tabindex', '-1');
                            main.addEventListener('blur', function () {
                                main.removeAttribute('tabindex');
                            }, {once: true});
                        }
                        main.focus({preventScroll: true});
                    }
                    resolve();
                }, still ? 220 : 480);
            }, still ? 0 : Math.max(60, 420 - since));
        });
    }

    // A last word alone on its line reads badly: the last two words go together (with four words or more, so a short
    // title can still break where it must on a phone). Browsers that balance lines do it anyway; this is for the rest.
    function noWidow(el) {
        if (!el) {
            return;
        }
        var nodes = [];
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }
        var words = el.textContent.trim().split(/\s+/).length;
        for (var i = nodes.length - 1; i >= 0 && words >= 4; i--) {
            var t = nodes[i].nodeValue.replace(/\s+$/, '');
            var at = t.lastIndexOf(' ');
            if (at > 0) {
                nodes[i].nodeValue = t.slice(0, at) + ' ' + t.slice(at + 1);
                return;
            }
        }
    }

    function start(card) {
        if (!card || card.hasAttribute('data-hk-ready')) {
            return;
        }
        card.setAttribute('data-hk-ready', '1');
        noWidow(card.querySelector('.hk-greeting-title'));
        noWidow(card.querySelector('.hk-greeting-line'));
        if (accessPaused()) {
            card.classList.add('is-still');
        }
        // A brand so light that white text would not read on it: the field is deepened more.
        var main = rgbOf(getComputedStyle(card).getPropertyValue('--hkg-main'));
        if (main && luminance(main) > 0.36) {
            card.classList.add('is-light-brand');
        }
        creature(card);
        moreButton(card);
        // Closing early, before the way in has ended: it ends now, so the way out starts from the still card.
        var form = card.querySelector('form.hk-greeting-close');
        if (form) {
            form.addEventListener('submit', function () {
                card.hkClosingAt = Date.now();
                settle(card);
                if (sky) {
                    sky.remove();
                }
            });
        }
        party(card);
    }

    function scan() {
        var cards = document.querySelectorAll('.hk-greeting');
        for (var i = 0; i < cards.length; i++) {
            start(cards[i]);
        }
    }

    window.HkGreeting = {start: start, leave: leave, burst: burst, scan: scan};
    scan();
})();
