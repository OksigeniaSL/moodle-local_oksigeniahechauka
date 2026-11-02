// Oksigenia Hechauka: the «How it works» pieces of the panel. A button with data-hkp-howto="<piece>" opens a dialog with real
// frames of the panel (help/<piece>/<lang>/fNN.webp), a pointer that goes to each control and presses it, and a subtitle per
// step (help/<piece>/<lang>/pasos.json). With a voice clip per step (NN.mp3), the voice sets the pace; without one, the
// time it takes to read the subtitle.
(function() {
    'use strict';
    var CURSOR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2.5l15 8.6-6.7 1.6 3.9 7-2.6 1.5-3.9-7-5 4.6z" ' +
        'fill="#fff" stroke="#1d2125" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    var ICONS = {
        prev: '<path d="M15 6l-6 6 6 6"/>',
        next: '<path d="M9 6l6 6-6 6"/>',
        play: '<path d="M8 5.5v13l10-6.5z" class="f"/>',
        pause: '<path d="M8 5.5v13M16 5.5v13"/>',
        again: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2"/>',
        close: '<path d="M6 6l12 12M18 6L6 18"/>'
    };
    var icon = function(name) {
        return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
    };

    var Piece = function(button) {
        this.button = button;
        this.name = button.getAttribute('data-hkp-howto');
        this.base = button.getAttribute('data-base');
        this.lang = button.getAttribute('data-lang') || 'en';
        this.ui = JSON.parse(button.getAttribute('data-ui') || '{}');
        this.title = button.getAttribute('data-title') || '';
        this.n = 0;
        this.playing = false;
        this.timers = [];
    };

    Piece.prototype.open = function() {
        var self = this;
        var d = document.createElement('dialog');
        d.className = 'hkp-howto-dialog';
        d.setAttribute('aria-label', this.title);
        d.innerHTML = '<header><h2>' + this.title + '</h2><button type="button" class="hkp-howto-x" aria-label="' +
            this.ui.close + '">' + icon('close') + '</button></header>' +
            '<div class="hkp-howto-stage"><img class="is-a" alt=""><img class="is-b" alt="">' +
            '<span class="hkp-howto-cursor">' + CURSOR + '</span></div>' +
            '<footer><div class="hkp-howto-segs"></div><p class="hkp-howto-text" aria-live="polite"></p>' +
            '<div class="hkp-howto-buttons">' +
            '<button type="button" data-do="prev" aria-label="' + this.ui.prev + '">' + icon('prev') + '</button>' +
            '<button type="button" data-do="play" aria-label="' + this.ui.pause + '">' + icon('pause') + '</button>' +
            '<button type="button" data-do="next" aria-label="' + this.ui.next + '">' + icon('next') + '</button>' +
            '</div></footer>';
        // Inside the panel, whose colours it takes; as a modal dialog it is drawn above everything anyway.
        (this.button.closest('.hkp') || document.body).appendChild(d);
        this.d = d;
        this.stage = d.querySelector('.hkp-howto-stage');
        this.cursor = d.querySelector('.hkp-howto-cursor');
        this.text = d.querySelector('.hkp-howto-text');
        this.imgs = [d.querySelector('img.is-a'), d.querySelector('img.is-b')];
        this.front = 0;
        this.audio = new Audio();
        d.querySelector('.hkp-howto-x').addEventListener('click', function() {
            d.close();
        });
        d.addEventListener('close', function() {
            self.stop();
            self.audio.pause();
            d.remove();
            self.button.focus();
        });
        d.querySelector('[data-do="prev"]').addEventListener('click', function() {
            self.go(Math.max(0, self.n - 1), true);
        });
        d.querySelector('[data-do="next"]').addEventListener('click', function() {
            if (self.n + 1 < self.steps.length) {
                self.go(self.n + 1, true);
            }
        });
        d.querySelector('[data-do="play"]').addEventListener('click', function() {
            if (self.ended) {
                self.go(0, true);
            } else if (self.playing) {
                self.pause();
            } else {
                self.go(self.n, true);
            }
        });
        d.showModal();
        fetch(this.base + this.name + '/' + this.lang + '/pasos.json', {credentials: 'same-origin'}).then(function(r) {
            return r.json();
        }).then(function(data) {
            self.steps = data.steps;
            d.querySelector('.hkp-howto-segs').innerHTML = self.steps.map(function() {
                return '<i><b></b></i>';
            }).join('');
            // The frames ahead of time: a step should not wait for its picture.
            self.steps.forEach(function(s) {
                (new Image()).src = self.url(s.frame);
            });
            self.go(0, true);
        });
    };

    Piece.prototype.url = function(file) {
        return this.base + this.name + '/' + this.lang + '/' + file;
    };

    Piece.prototype.stop = function() {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    };

    Piece.prototype.later = function(ms, fn) {
        this.timers.push(setTimeout(fn, ms));
    };

    Piece.prototype.pause = function() {
        this.stop();
        this.audio.pause();
        this.playing = false;
        this.setPlay(false);
    };

    Piece.prototype.setPlay = function(playing) {
        var b = this.d.querySelector('[data-do="play"]');
        b.innerHTML = icon(this.ended ? 'again' : (playing ? 'pause' : 'play'));
        b.setAttribute('aria-label', this.ended ? this.ui.again : (playing ? this.ui.pause : this.ui.play));
    };

    Piece.prototype.point = function(p, press) {
        var self = this;
        this.cursor.style.left = (p[0] * 100) + '%';
        this.cursor.style.top = (p[1] * 100) + '%';
        if (press) {
            this.later(750, function() {
                self.cursor.classList.add('is-press');
                var wave = document.createElement('span');
                wave.className = 'hkp-howto-wave';
                wave.style.left = self.cursor.style.left;
                wave.style.top = self.cursor.style.top;
                self.stage.appendChild(wave);
                self.later(200, function() {
                    self.cursor.classList.remove('is-press');
                });
                self.later(700, function() {
                    wave.remove();
                });
            });
        }
    };

    Piece.prototype.go = function(n, play) {
        var self = this;
        var step = this.steps[n];
        this.stop();
        this.audio.pause();
        this.n = n;
        this.ended = false;
        this.playing = play;
        this.setPlay(play);
        // The picture, crossfaded.
        var back = this.imgs[1 - this.front];
        back.src = this.url(step.frame);
        back.classList.add('is-on');
        this.imgs[this.front].classList.remove('is-on');
        this.front = 1 - this.front;
        this.text.textContent = step.text;
        var segs = this.d.querySelectorAll('.hkp-howto-segs b');
        segs.forEach(function(b, i) {
            b.style.transition = 'none';
            b.style.width = i < n ? '100%' : '0';
        });
        var points = step.points || [];
        this.cursor.classList.toggle('is-hidden', !points.length);
        if (points.length) {
            this.point(points[0], step.click);
        }
        if (!play) {
            return;
        }
        var finish = function(ms) {
            var bar = segs[n];
            if (bar) {
                void bar.offsetWidth;
                bar.style.transition = 'width ' + ms + 'ms linear';
                bar.style.width = '100%';
            }
            if (points[1]) {
                self.later(ms * 0.55, function() {
                    self.point(points[1], step.click);
                });
            }
        };
        var next = function() {
            if (n + 1 < self.steps.length) {
                self.go(n + 1, true);
            } else {
                self.ended = true;
                self.playing = false;
                self.setPlay(false);
            }
        };
        // The voice sets the pace; without it, the time it takes to read the subtitle.
        var words = step.text.split(/\s+/).length;
        var reading = Math.max(3500, words * 380 + 1200);
        this.audio.src = this.url(String(n + 1).padStart(2, '0') + '.mp3');
        this.audio.onended = function() {
            self.later(700, next);
        };
        this.audio.play().then(function() {
            var ms = isFinite(self.audio.duration) ? self.audio.duration * 1000 : reading;
            finish(ms);
        }, function() {
            finish(reading);
            self.later(reading, next);
        });
    };

    document.addEventListener('click', function(e) {
        var button = e.target.closest ? e.target.closest('[data-hkp-howto]') : null;
        if (button) {
            e.preventDefault();
            (new Piece(button)).open();
        }
    });
})();
