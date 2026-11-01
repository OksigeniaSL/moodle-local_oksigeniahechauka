// The Hechauka player: one web page for every screen. It knows the contract (docs/contract.md) and nothing about the
// server behind it. Three modes:
// - screen: a real screen, with its key, its cache and its heartbeat;
// - preview: inside the management panel, with the session of the person signed in and a clock of their choosing;
// - demo: a static manifest and its media, for development and for testing a device without a server.

import {makeApi} from './api.js';
import {realClock, simulatedClock} from './clock.js';
import {MediaStore, mediaOf} from './media.js';
import {pair} from './pairing.js';
import {countdown, dayLabel, splitTitle, stageOf, upcoming} from './agenda.js';
import {Composer, draftChoice} from './compose.js';
import {dayNumber, isDark, isLive, isPowerOn, liveItems, urgentOf, weekdayOf} from './rules.js';
import {Screen} from './render.js';
import {store} from './store.js';
import {countToday} from './today.js';
import {weekOf} from './week.js';

const VERSION = '0.6.0';
const COMING_DAYS = 7;
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
        this.composer = new Composer();
        this.timer = null;
        this.menuTurn = 0;
        // In the panel's preview: what is being written, shown standing still where it would go (setDraft).
        this.draft = null;
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
            videoEnded: function (item) {
                if (self.isShowing(item)) {
                    self.next();
                }
            },
            mediaFailed: function (item) {
                if (!self.bad[item.id]) {
                    self.note('item ' + item.id + ': the file does not play');
                }
                self.bad[item.id] = Date.now();
                if (self.isShowing(item)) {
                    self.next();
                }
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
        if (this.mode === 'preview') {
            window.addEventListener('message', function (ev) {
                if (ev.origin !== location.origin || !ev.data) {
                    return;
                }
                if (ev.data.hkDraft !== undefined) {
                    self.setDraft(ev.data.hkDraft);
                }
                if (ev.data.hkTheme) {
                    // «Tu centro»: the colours being chosen, and light or dark, before they are saved.
                    self.screen.applyTheme({vars: ev.data.hkTheme.vars || {}});
                    if (ev.data.hkTheme.mode) {
                        self.forcedTheme = ev.data.hkTheme.mode === 'dark';
                    }
                    self.tick();
                }
            });
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
        if (this.mode === 'preview' && window.parent !== window) {
            // The panel sends what is being written once the screen is ready for it.
            window.parent.postMessage({hkPreviewReady: window.name || true}, location.origin);
        }
        document.documentElement.lang = (m.screen && m.screen.lang) || this.boot.lang || 'en';
        this.screen.configure(m);
        const self = this;
        this.media.sync(mediaOf(m)).then(function () {
            if (self.manifest === m) {
                self.screen.applyTheme(m.theme || {});
            }
        });
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

    isShowing(item) {
        return this.screen.showing().some(function (s) {
            return s.zone === 'main' && s.item === item.id;
        });
    }

    // The menu of the day as one block: a page per menu when there are several, one more at each slide.
    menuOf(menus) {
        const pages = [];
        const labels = this.manifest.labels || {};
        const s = this.strings;
        menus.forEach(function (item) {
            const label = item.label || labels.menu || s.menu || '';
            if (item.closed || !item.menus || !item.menus.length) {
                pages.push({label, closed: item.title || s.closed || ''});
            } else {
                item.menus.forEach(function (menu) {
                    pages.push({label, name: item.menus.length > 1 ? menu.name : '', courses: menu.courses || [],
                        note: item.note || ''});
                });
            }
        });
        return pages.length ? pages[this.menuTurn % pages.length] : null;
    }

    /** What «Today» has now: the menu, the notices, today's events, the coming days and the weather. */
    todayOf(wall) {
        const items = this.manifest.items || [];
        const side = items.filter(function (it) {
            return it.zone === 'side' && isLive(it, wall);
        });
        const byOrder = function (a, b) {
            return (a.order || 0) - (b.order || 0);
        };
        const byStart = function (a, b) {
            return (a.start || '') < (b.start || '') ? -1 : (a.start || '') > (b.start || '') ? 1 : 0;
        };
        const notices = side.filter(function (it) {
            return it.type === 'notice';
        }).sort(function (a, b) {
            // The important ones first.
            return (b.tone === 'important') - (a.tone === 'important') || byOrder(a, b);
        }).map(function (n) {
            return {title: n.title || '', body: n.body || '', tone: n.tone || 'normal'};
        });
        const events = side.filter(function (it) {
            return it.type === 'event';
        }).sort(byStart).map(function (ev) {
            const parts = splitTitle(ev.title);
            return {time: ev.allday || !ev.start ? '·' : ev.start.slice(11, 16), title: parts.title,
                group: parts.group || ev.detail || '', color: stageOf(parts.group || ev.detail) || ev.color || 0};
        });
        const menu = this.menuOf(side.filter(function (it) {
            return it.type === 'menu';
        }).sort(byOrder));
        const all = items.filter(function (it) {
            return it.type === 'event';
        });
        const labels = this.manifest.labels || {};
        const names = {tomorrow: labels.tomorrow || this.strings.tomorrow, days_short: this.strings.days_short,
            months_short: this.strings.months_short};
        const big = countdown(all, wall.date, 14);
        if (big) {
            big.day = dayLabel(big.date, wall.date, names);
        }
        return {
            menu,
            notices,
            events,
            // The event of the countdown is not repeated among the coming days.
            upcoming: upcoming(all.filter(function (ev) {
                return !big || ev.id !== big.id;
            }), wall.date, COMING_DAYS, names),
            countdown: big,
            weather: this.manifest.weather || null,
        };
    }

    /** The next five school days with their events, for «La semana». */
    weekOf(wall) {
        const s = this.strings;
        const events = (this.manifest.items || []).filter(function (it) {
            return it.type === 'event';
        });
        return weekOf(events, wall.date, !this.screen.horizontal, {
            days: s.days || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            days_short: s.days_mid || s.days_short || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            months: s.months || [],
            months_short: s.months_short || [],
            holiday: s.week_holiday || '',
            from: s.week_from || '',
            until: s.week_until || '',
        });
    }

    /**
     * What is being written in the panel, or null to go back to the screen's own turns.
     *
     * @param {object|null} draft {item: the item as the contract gives it, replaces: the id of the item it changes,
     *     focus: main, full, today or week}
     */
    setDraft(draft) {
        this.draft = draft && draft.item ? draft : null;
        this.next();
    }

    /** The manifest with the draft in it: the item it changes out, the draft in. */
    withDraft() {
        const d = this.draft;
        // Samples that go with it («Tu centro» shows each colour in its place), and the draft itself.
        const extra = (d.items || []).concat([d.item]);
        const ids = extra.map(function (it) {
            return it.id;
        });
        const items = (this.manifest.items || []).filter(function (it) {
            return it.id !== d.replaces && ids.indexOf(it.id) < 0;
        });
        // First of its kind: the line of the ticker or the notice being written is the one to look at.
        extra.reverse().forEach(function (it) {
            items.unshift(Object.assign({order: -1}, it));
        });
        return Object.assign({}, this.manifest, {items});
    }

    /** The draft's slide, standing still: no turns while something is being written. */
    showDraft() {
        const keep = this.manifest;
        const merged = this.withDraft();
        const wall = this.clock.wall();
        this.manifest = merged;
        try {
            this.screen.configure(merged);
            const today = this.todayOf(wall);
            const week = merged.template === 'full' ? null : this.weekOf(wall);
            const main = this.mainList(wall).filter(function (it) {
                return it.id !== 'draft' && String(it.id).indexOf('sample') !== 0;
            });
            this.screen.show(draftChoice(this.draft.item, this.draft.focus || 'main', main, this.screen.horizontal), today,
                week);
        } finally {
            this.manifest = keep;
        }
    }

    /** The next slide: the composition the rules choose, shown, and the one after it in its seconds. */
    next() {
        clearTimeout(this.timer);
        if (!this.manifest) {
            return;
        }
        if (this.draft) {
            this.showDraft();
            return;
        }
        if (this.urgentOn) {
            // Nothing moves under an urgent notice.
            return;
        }
        if (this.reloadAt) {
            location.reload();
            return;
        }
        const m = this.manifest;
        const wall = this.clock.wall();
        const self = this;
        if (!isPowerOn(m.power, wall)) {
            this.timer = setTimeout(function () {
                self.next();
            }, 30000);
            return;
        }
        const today = this.todayOf(wall);
        const coming = today.upcoming.length || today.countdown ? 1 : 0;
        const week = m.template === 'full' ? null : this.weekOf(wall);
        const choice = this.composer.next(this.mainList(wall), countToday(today) + coming, this.screen.horizontal,
            {menu: !!today.menu, noToday: m.template === 'full',
                week: week ? {things: week.things, weekday: weekdayOf(dayNumber(wall.date))} : null});
        this.menuTurn++;
        this.screen.show(choice, today, week);
        this.timer = setTimeout(function () {
            self.next();
        }, choice.seconds * 1000 + (choice.items.some(function (it) {
            return it.type === 'video';
        }) ? 5000 : 0));
    }

    tick() {
        if (!this.manifest) {
            return;
        }
        // While something is being written in the panel, its ticker line too.
        const m = this.draft ? this.withDraft() : this.manifest;
        const wall = this.clock.wall();
        // In the small hours a screen with power hours is off: it reloads then, in black.
        this.nightly(wall);
        const on = isPowerOn(m.power, wall);
        this.screen.setPower(on);
        if (!on) {
            return;
        }
        this.screen.setDark(this.forcedTheme !== undefined ? this.forcedTheme : isDark(m.theme, wall));
        this.screen.setClock(this.clock.date());
        // An urgent notice covers everything until it is taken off; then the turns go on.
        const urgent = urgentOf(m.items, wall);
        const was = this.urgentOn;
        this.urgentOn = !!urgent;
        this.screen.showUrgent(urgent);
        if (was && !urgent) {
            this.next();
        }
        if (!this.screen.comp) {
            this.next();
        }
        if (this.reloadAt && Date.now() - this.reloadAt > 30000) {
            location.reload();
            return;
        }
        this.screen.showTicker(liveItems(m.items || [], 'ticker', wall).map(function (it) {
            return it.text;
        }).filter(Boolean));
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
            // Asked from the panel, or a new player on the server: reload at the next change of slide.
            const asked = r && r.commands && r.commands.indexOf('reload') !== -1;
            const newer = r && r.build && self.boot.build && r.build !== self.boot.build;
            if ((asked || newer) && !self.reloadAt) {
                self.reloadAt = Date.now();
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
