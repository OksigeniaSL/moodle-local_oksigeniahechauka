// The Hechauka player: one web page for every screen. It knows the contract (docs/contract.md) and nothing about the
// server behind it. Three modes:
// - screen: a real screen, with its key, its cache and its heartbeat;
// - preview: inside the management panel, with the session of the person signed in and a clock of their choosing;
// - demo: a static manifest and its media, for development and for testing a device without a server.

import {makeApi} from './api.js';
import {realClock, simulatedClock} from './clock.js';
import {MediaStore, mediaOf} from './media.js';
import {pair} from './pairing.js';
import {Rotator} from './rotator.js';
import {isDark, isLive, isPowerOn, liveItems} from './rules.js';
import {Screen} from './render.js';
import {store} from './store.js';

const VERSION = '0.3.0';
const DEFAULT_SECONDS = {main: 10, side: 12, ticker: 0};
const HEARTBEAT_MS = 60000;
const REFRESH_MS = 15 * 60000;

function query() {
    const q = {};
    location.search.replace(/[?&]([^=&]+)=([^&]*)/g, function (_, k, v) {
        q[k] = decodeURIComponent(v);
    });
    return q;
}

function readBoot() {
    const node = document.getElementById('hechauka-boot');
    return node ? JSON.parse(node.textContent) : {};
}

class Player {
    constructor(boot) {
        this.boot = boot;
        this.mode = boot.mode || 'screen';
        this.strings = boot.strings || {};
        this.root = document.getElementById('hechauka') || document.body;
        this.startedAt = Date.now();
        this.errors = [];
        this.bad = {};
        this.manifest = null;
        const q = query();
        const at = this.mode === 'screen' ? null : (q.at || boot.at);
        this.clock = at ? simulatedClock(at) : realClock();
        if (q.tema) {
            this.forcedTheme = q.tema === 'oscuro';
        }
        this.api = makeApi(boot.endpoints || {}, function () {
            return store.key();
        }, this.mode === 'preview');
        const self = this;
        this.rotator = new Rotator(function (item) {
            return self.durationOf(item);
        });
    }

    start() {
        if (this.mode !== 'screen' || store.key()) {
            this.run();
            return;
        }
        const self = this;
        pair(this.root, this.api, this.strings).then(function (key) {
            store.setKey(key);
            self.run();
        });
    }

    run() {
        const self = this;
        this.media = new MediaStore(this.mode === 'screen' ? this.api : null);
        this.screen = new Screen(this.root, this.strings, this.media, {
            videoEnded: function () {
                self.advanceMain();
            },
            mediaFailed: function (item) {
                self.note('item ' + item.id + ': the file does not play');
                self.bad[item.id] = Date.now();
                self.advanceMain();
            },
        });
        if (this.mode === 'screen') {
            this.registerWorker();
            const stored = store.manifest();
            if (stored) {
                this.apply(stored);
            }
            setInterval(function () {
                self.heartbeat();
            }, HEARTBEAT_MS);
        }
        this.refresh();
        if (this.mode !== 'preview') {
            setInterval(function () {
                self.refresh();
            }, REFRESH_MS);
        }
        setInterval(function () {
            self.tick();
        }, 1000);
        this.tick();
    }

    registerWorker() {
        if (!this.boot.sw || !navigator.serviceWorker) {
            return;
        }
        navigator.serviceWorker.register(this.boot.sw).catch(function () {
            return null;
        });
        // The first visit does not go through the worker: the page keeps its own shell, so that the next start
        // without a network finds it. The same cache the worker reads (sw.js).
        if (window.caches) {
            const urls = [location.href];
            const nodes = document.querySelectorAll('link[rel="stylesheet"], script[src]');
            for (let i = 0; i < nodes.length; i++) {
                urls.push(nodes[i].href || nodes[i].src);
            }
            window.caches.open('hechauka-shell-1').then(function (cache) {
                return cache.addAll(urls);
            }).catch(function () {
                return null;
            });
        }
    }

    /** Fetches the manifest; a screen keeps what it has when the network fails. */
    refresh() {
        const self = this;
        let request;
        if (this.mode === 'demo') {
            request = fetch(this.boot.manifest_url, {cache: 'no-store'}).then(function (r) {
                return r.json();
            });
        } else {
            request = this.api.manifest(this.manifest && this.mode === 'screen' ? this.manifest.etag : null);
        }
        return request.then(function (m) {
            if (m) {
                self.apply(m);
                if (self.mode === 'screen') {
                    store.setManifest(m);
                }
            }
        }, function (e) {
            if (e && e.revoked) {
                store.forget();
                location.reload();
                return;
            }
            self.note('manifest: ' + (e && e.message || e));
        });
    }

    apply(m) {
        this.manifest = m;
        document.documentElement.lang = (m.screen && m.screen.lang) || this.boot.lang || 'en';
        this.screen.configure(m);
        const self = this;
        this.media.sync(mediaOf(m)).then(function () {
            if (self.manifest === m) {
                self.screen.applyTheme(m.theme || {});
            }
        });
    }

    durationOf(item) {
        if (item.duration > 0) {
            return item.duration;
        }
        if (item.type === 'video') {
            // Until the video ends; the length, if known, only as a safety net.
            const len = item.media && item.media.duration;
            return len > 0 ? len + 5 : 600;
        }
        return DEFAULT_SECONDS[item.zone] || 10;
    }

    mainList(wall) {
        const media = this.media;
        const bad = this.bad;
        const now = Date.now();
        return liveItems(this.manifest.items || [], 'main', wall).filter(function (it) {
            if (bad[it.id] && now - bad[it.id] < 10 * 60000) {
                return false;
            }
            return media.ready(it.media);
        });
    }

    advanceMain() {
        if (!this.manifest) {
            return;
        }
        const r = this.rotator.advance(this.mainList(this.clock.wall()), this.clock.now());
        this.screen.showMain(r.item);
    }

    tick() {
        if (!this.manifest) {
            return;
        }
        const m = this.manifest;
        const wall = this.clock.wall();
        const now = this.clock.now();
        const on = isPowerOn(m.power, wall);
        this.screen.setPower(on);
        if (!on) {
            return;
        }
        this.screen.setDark(this.forcedTheme !== undefined ? this.forcedTheme : isDark(m.theme, wall));
        this.screen.setClock(this.clock.date());

        const r = this.rotator.pick(this.mainList(wall), now);
        if (r.changed) {
            this.screen.showMain(r.item);
        }

        const items = m.items || [];
        const side = items.filter(function (it) {
            return it.zone === 'side' && isLive(it, wall);
        });
        const byOrder = function (a, b) {
            return (a.order || 0) - (b.order || 0);
        };
        const menus = side.filter(function (it) {
            return it.type === 'menu';
        }).sort(byOrder);
        const notices = side.filter(function (it) {
            return it.type === 'notice';
        }).sort(function (a, b) {
            // The important ones first.
            return (b.tone === 'important') - (a.tone === 'important') || byOrder(a, b);
        });
        const events = side.filter(function (it) {
            return it.type === 'event';
        }).sort(function (a, b) {
            return (a.start || '') < (b.start || '') ? -1 : (a.start || '') > (b.start || '') ? 1 : 0;
        });
        this.screen.showSide(menus, notices, events, now);
        this.screen.showTicker(liveItems(items, 'ticker', wall).map(function (it) {
            return it.text;
        }).filter(Boolean));

        this.nightly(wall);
    }

    // Once a day, in the small hours, a screen reloads itself: weeks of a page open wear any browser down.
    nightly(wall) {
        if (this.mode === 'screen' && Date.now() - this.startedAt > 20 * 3600000 && wall.min >= 180 && wall.min < 240) {
            location.reload();
        }
    }

    heartbeat() {
        const m = this.manifest;
        const wall = this.clock.wall();
        const body = {
            time: Math.floor(Date.now() / 1000),
            tz_offset: -new Date().getTimezoneOffset(),
            version: VERSION,
            uptime: Math.floor((Date.now() - this.startedAt) / 1000),
            manifest: m ? m.etag : null,
            stale: !!(m && m.horizon && wall.date > m.horizon),
            on: m ? isPowerOn(m.power, wall) : true,
            showing: this.screen ? this.screen.showing() : [],
            display: {width: window.innerWidth, height: window.innerHeight},
            cache: this.media ? this.media.usage() : {files: 0, bytes: 0},
            errors: this.errors.concat(this.media ? this.media.errors() : []).slice(-5),
        };
        const self = this;
        this.api.heartbeat(body).then(function (r) {
            self.errors = [];
            if (r && r.manifest && (!m || r.manifest !== m.etag)) {
                self.refresh();
            }
        }, function (e) {
            if (e && e.revoked) {
                store.forget();
                location.reload();
            }
        });
    }

    note(text) {
        this.errors.push(String(text).slice(0, 200));
        if (this.errors.length > 10) {
            this.errors.shift();
        }
    }
}

const player = new Player(readBoot());
player.start();
window.hechauka = player;
