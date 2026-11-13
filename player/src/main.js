// The Hechauka player: one web page for every screen. It knows the contract (docs/contract.md) and nothing about the
// server behind it. Three modes:
// - screen: a real screen, with its key, its cache and its heartbeat;
// - preview: inside the management panel, with the session of the person signed in and a clock of their choosing;
// - demo: a static manifest and its media, for development and for testing a device without a server.

import {menuKind, menuParts, isHoliday} from './lead.js';
import {makeApi} from './api.js';
import {realClock, simulatedClock} from './clock.js';
import {MediaStore, mediaOf} from './media.js';
import {Played} from './played.js';
import {pair} from './pairing.js';
import {afterDayEnd, agendaOf, countdown, dayLabel, eventsOn, mealTime, monthOf, upcoming} from './agenda.js';
import {AGENDA_DAYS, AGENDA_TOP} from './agendaview.js';
import {albumsOf, oneOfEachAlbum} from './photos.js';
import {Composer, draftChoice} from './compose.js';
import {channelShow} from './canal.js';
import {menusData} from './menus.js';
import {dayNumber, isDark, isLive, isPowerOn, liveItems, urgentOf, useOf, weekdayOf} from './rules.js';
import {Screen} from './render.js';
import {store} from './store.js';
import {filesOf, isRaining, Surprises} from './surprises.js';
import {countToday} from './today.js';
import {weekOf} from './week.js';

const VERSION = '0.9.1';
const COMING_DAYS = 7;
const HEARTBEAT_MS = 60000;
const REFRESH_MS = 15 * 60000;
// The longest the big birthday slide waits for its photos to be on the device.
const BIRTHDAYS_WAIT_MS = 10 * 60000;

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

// «2», «noviembre» and «Lunes» of a «YYYY-MM-DD».
function dateWordsOf(date, s) {
    const d = new Date(date + 'T12:00:00Z');
    return {day: d.getUTCDate(), month: (s.months || [])[d.getUTCMonth()] || '', weekday: (s.days || [])[d.getUTCDay()] || ''};
}

class Player {
    constructor(boot) {
        this.boot = boot;
        this.mode = boot.mode || 'screen';
        this.strings = boot.strings || {};
        this.root = document.getElementById('hechauka') || document.body;
        this.played = new Played();
        this.heardAt = 0;
        this.turnDue = 0;
        this.errors = [];
        this.bad = {};
        this.albumTurns = {};
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
                // A photo of an album goes by the album's name: the photo itself is what must not come back.
                if (item.source) {
                    self.bad[item.source] = self.bad[item.id];
                }
                if (self.isShowing(item)) {
                    self.next();
                }
            },
            // A slide whose every part failed (the two zones with nothing left): the next one.
            emptied: function () {
                self.next();
            },
        });
        this.media.onSynced = function () {
            if (self.themeWaits && self.manifest) {
                self.themeWaits = false;
                self.screen.applyTheme(self.manifest.theme || {});
            }
        };
        const screen = this.screen;
        this.surprises = new Surprises(screen.frame, {
            quiet: function () {
                return screen.keepsStill();
            },
            floor: function () {
                return screen.tickerTop();
            },
            raining: function () {
                return isRaining(self.manifest && self.manifest.weather, Date.now() - self.heardAt);
            },
            note: function (text) {
                self.note(text);
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
                if (typeof ev.data.hkPhrase === 'string') {
                    // «Tu centro»: the centre's sentence as it is being written, in the ticker.
                    self.draftPhrase = ev.data.hkPhrase;
                    self.tick();
                }
                if (ev.data.hkSurprise) {
                    // «Tu centro»: to see what a character does before choosing it.
                    self.surprises.askNow(ev.data.hkSurprise);
                }
                if (ev.data.hkTheme) {
                    // «Tu centro»: the colours being chosen, and light or dark, before they are saved.
                    self.screen.applyTheme(Object.assign({}, (self.manifest && self.manifest.theme) || {},
                        {vars: ev.data.hkTheme.vars || {}, modes: ev.data.hkTheme.modes || null, ground: ev.data.hkTheme.ground || ''},
                        ev.data.hkTheme.skin ? {skin: ev.data.hkTheme.skin} : {}));
                    if (ev.data.hkTheme.mode) {
                        self.forcedTheme = ev.data.hkTheme.mode === 'dark';
                    }
                    self.tick();
                }
            });
        }
        this.refresh();
        if (this.mode !== 'preview') {
            // The public demonstration screen asks more often: what is published is seen at once.
            setInterval(function () {
                self.refresh();
            }, this.mode === 'demo' && this.boot.refresh_ms ? this.boot.refresh_ms : REFRESH_MS);
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
        // That the browser does not empty what the screen keeps, its key among it, if the disk runs short.
        if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().catch(function () {
                return null;
            });
        }
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
            self.heardAt = Date.now();
            if (m && m.errorcode) {
                self.note('manifest: ' + m.errorcode);
            } else if (m) {
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
        this.surprises.configure(m.surprises, (m.screen && m.screen.distance) || 3, Date.now());
        if (this.mode === 'screen') {
            this.keepSurprises(m.surprises);
        }
        const self = this;
        // While another list is being brought, its files come later: then the logo and the letter have to be looked at again.
        this.themeWaits = this.media.busy;
        this.media.sync(mediaOf(m)).then(function () {
            if (self.manifest === m) {
                self.screen.applyTheme(m.theme || {});
            }
        });
    }

    /** The files of the characters, kept like the rest of the page, so that they also come out without a network. */
    keepSurprises(surprises) {
        if (!surprises || !window.caches) {
            return;
        }
        window.caches.open('hechauka-shell-1').then(function (cache) {
            (surprises.characters || []).forEach(function (c) {
                const base = c.atlas.slice(0, c.atlas.lastIndexOf('/') + 1);
                cache.match(c.atlas).then(function (hit) {
                    return hit || fetch(c.atlas).then(function (r) {
                        return r.json();
                    }).then(function (atlas) {
                        return cache.addAll([c.atlas].concat(filesOf(atlas).map(function (name) {
                            return base + name;
                        })));
                    });
                }).catch(function () {
                    return null;
                });
            });
        }).catch(function () {
            return null;
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

    // The menu of the day, one for all the slides: the first as the lead and the others in a line under it, «También: …», with
    // their kind only when it says something (the kitchen's «Menú D» is said to nobody; «Vegetariano» is).
    menuOf(menus) {
        const labels = this.manifest.labels || {};
        const s = this.strings;
        const item = menus[0];
        if (!item) {
            return null;
        }
        const label = item.label || labels.menu || s.menu || '';
        if (item.closed || !item.menus || !item.menus.length) {
            return {label, closed: item.title || s.closed || ''};
        }
        // Those with a kind first: whoever looks for the vegetarian one is who needs the line.
        const kinds = [];
        const plain = [];
        const alsoKinds = [];
        item.menus.slice(1).forEach(function (menu) {
            const main = menuParts(menu).main;
            if (main) {
                const kind = menuKind(menu.name);
                if (kind) {
                    kinds.push(main + ' (' + kind + ')');
                    alsoKinds.push(kind);
                } else {
                    plain.push(main);
                }
            }
        });
        const also = kinds.concat(plain);
        // Every allergen of the menu that leads, and their names; what a dish has is in its course, in the order of its dishes.
        const allergens = [];
        (item.menus[0].courses || []).forEach(function (course) {
            (course.allergens || []).forEach(function (codes) {
                codes.forEach(function (code) {
                    if (allergens.indexOf(code) < 0) {
                        allergens.push(code);
                    }
                });
            });
        });
        return {label, courses: item.menus[0].courses || [], also, alsoKinds, note: item.note || '', allergens,
            allergenNames: item.allergennames || {}};
    }

    /**
     * The day's menus, whole, for the slide of the menus: the first menu item of the side as «Today» takes it.
     *
     * @param {object} wall
     * @returns {object|null}
     */
    menusOf(wall) {
        const item = (this.manifest.items || []).filter(function (it) {
            return it.zone === 'side' && it.type === 'menu' && isLive(it, wall);
        }).sort(function (a, b) {
            return (a.order || 0) - (b.order || 0);
        })[0];
        const labels = this.manifest.labels || {};
        return menusData(item, labels.menu || this.strings.menu || '');
    }

    /**
     * What «Today» has now: the menu, the notices, today's events, the coming days and the weather. From the hour the
     * day ends for the centre, tomorrow's events instead, under «Tomorrow» (the menu switches on the server).
     */
    todayOf(wall) {
        const items = this.manifest.items || [];
        const side = items.filter(function (it) {
            return it.zone === 'side' && isLive(it, wall);
        });
        const byOrder = function (a, b) {
            return (a.order || 0) - (b.order || 0);
        };
        const notices = side.filter(function (it) {
            return it.type === 'notice';
        }).sort(function (a, b) {
            // The important ones first.
            return (b.tone === 'important') - (a.tone === 'important') || byOrder(a, b);
        }).map(function (n) {
            return {id: n.id, title: n.title || '', body: n.body || '', tone: n.tone || 'normal'};
        });
        const cats = this.manifest.categories || [];
        const all = items.filter(function (it) {
            return it.type === 'event';
        });
        const over = afterDayEnd(wall, this.manifest.dayend);
        // Today's: those shown now that take place today (one shown days before is in the coming days, not here).
        const events = over ? eventsOn(all, wall.date, 1, cats) : eventsOn(side.filter(function (it) {
            return it.type === 'event';
        }), wall.date, 0, cats);
        const menu = this.menuOf(side.filter(function (it) {
            return it.type === 'menu';
        }).sort(byOrder));
        const labels = this.manifest.labels || {};
        const names = {tomorrow: labels.tomorrow || this.strings.tomorrow, days_short: this.strings.days_short,
            months_short: this.strings.months_short, categories: cats};
        const big = countdown(all, wall.date, 14, cats);
        if (big) {
            big.day = dayLabel(big.date, wall.date, names);
        }
        return {
            // A day the agenda marks as closed has no canteen, whatever the menus say.
            menu: events.some(isHoliday) ? null : menu,
            notices,
            events,
            // The event of the countdown is not repeated among the coming days.
            upcoming: upcoming(all.filter(function (ev) {
                return !big || ev.id !== big.id;
            }), wall.date, COMING_DAYS, names, over ? 1 : 0),
            countdown: big,
            // Today in words, for the sheet of a holiday.
            dateWords: dateWordsOf(wall.date, this.strings),
            eventsLabel: over ? names.tomorrow : '',
            // While the canteen serves, the menu leads first; but not with several menus, which have their slide then and
            // whose first, as a headline, would read as «the» menu.
            noon: mealTime(wall, this.manifest.mealhours) && !(menu && menu.also && menu.also.length),
            menusApart: mealTime(wall, this.manifest.mealhours) && !!(menu && menu.also && menu.also.length),
            weather: this.manifest.weather || null,
        };
    }

    /** The words the agenda's days are said with. */
    agendaNames(m) {
        const s = this.strings;
        const labels = m.labels || {};
        return {days: s.days, months: s.months, categories: m.categories || [], today: labels.today || s.today,
            tomorrow: labels.tomorrow || s.tomorrow, until: s.week_until, until_tomorrow: s.until_tomorrow,
            date_format: s.date_format, holiday: s.week_holiday};
    }

    /** The agenda of the next thirty days, as much as the distance it is read from can take. */
    agendaOfNow(wall, m) {
        const events = (m.items || []).filter(function (it) {
            return it.type === 'event';
        });
        const top = AGENDA_TOP[(m.screen && m.screen.distance) || 3] || AGENDA_TOP[3];
        return agendaOf(events, wall.date, AGENDA_DAYS, top, this.agendaNames(m));
    }

    /** What the agenda's slide needs: the diary, and a month for each it reaches. */
    agendaData(wall, m) {
        const events = (m.items || []).filter(function (it) {
            return it.type === 'event';
        });
        const cats = m.categories || [];
        return {agenda: this.agendaOfNow(wall, m), today: wall.date, monthOf: function (date) {
            return monthOf(date, wall.date, events, cats);
        }};
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
            categories: this.manifest.categories || [],
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
            const use = useOf(merged, wall);
            this.screen.setUse(use);
            const choice = draftChoice(this.draft.item, this.draft.focus || 'main', main, this.screen.horizontal, use);
            if (choice.comp === 'agenda') {
                choice.extra = {data: this.agendaData(wall, merged)};
            }
            this.screen.show(choice, today, week);
        } finally {
            this.manifest = keep;
        }
    }

    /** The next slide. Whatever goes wrong with one, the turns go on: a slide that cannot be shown must not freeze the screen. */
    next() {
        clearTimeout(this.timer);
        this.turnDue = 0;
        try {
            this.turn();
        } catch (e) {
            this.note('slide: ' + (e && e.message || e));
            const self = this;
            this.turnDue = Date.now() + 10000;
            this.timer = setTimeout(function () {
                self.next();
            }, 10000);
        }
    }

    /**
     * Whether the photos of the birthdays are on the device, or failed: the big celebration waits for them, ten minutes at
     * most from when the item is first seen, and then comes with the creature for what did not arrive.
     *
     * @param {Object|null} item the birthdays of the manifest
     * @returns {boolean}
     */
    birthdaysReady(item) {
        if (!item || !item.people || !this.media) {
            return true;
        }
        const media = this.media;
        const waiting = item.people.some(function (p) {
            return !!(p.photo && p.photo.sha1 && !media.ready(p.photo) && !media.failed[p.photo.sha1]);
        });
        if (!waiting) {
            return true;
        }
        const key = item.id || item.date || 'birthdays';
        this.birthdaysSeen = this.birthdaysSeen || {};
        if (!this.birthdaysSeen[key]) {
            this.birthdaysSeen[key] = Date.now();
        }
        return Date.now() - this.birthdaysSeen[key] > BIRTHDAYS_WAIT_MS;
    }

    /** The composition the rules choose, shown, and the one after it in its seconds. */
    turn() {
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
        const use = useOf(m, wall);
        const week = m.template === 'full' || use === 'showcase' ? null : this.weekOf(wall);
        this.screen.setUse(use);
        const queue = this.mainList(wall);
        const media = this.media;
        const albums = albumsOf(queue, function (ref) {
            return media.url(ref);
        });
        const agenda = this.agendaOfNow(wall, m);
        // The coming days without today, for the column of the two zones: today's are in «Today».
        const nextDays = agenda.days.filter(function (d) {
            return !d.today && (d.events.length || d.holiday);
        });
        const distance = (m.screen && m.screen.distance) || 3;
        const phrase = (m.centre && m.centre.phrase) || '';
        const turns = this.albumTurns;
        const birthdayItem = liveItems(m.items || [], 'extra', wall).filter(function (it) {
            return it.type === 'birthdays';
        })[0] || null;
        const choice = this.composer.next(oneOfEachAlbum(queue, turns), countToday(today) + coming, this.screen.horizontal,
            {menu: !!today.menu, noToday: m.template === 'full', use,
                weather: !!(m.weather && m.weather.days && m.weather.days.length),
                distance: (m.screen && m.screen.distance) || 3,
                countdown: !!today.countdown,
                agenda: agenda.count > 0,
                agendaNext: nextDays.length > 0,
                place: !!(m.screen && m.screen.place && m.screen.place.hours && m.screen.place.hours.length),
                // The centre's sentence in slides of its own from 8 m, where there is no ticker.
                centre: phrase && distance === 8 ? phrase : null,
                idleQr: (m.idle && m.idle.qr) || null,
                idleQrImage: (m.idle && m.idle.qrimage) || null,
                birthdays: birthdayItem,
                birthdaysReady: this.birthdaysReady(birthdayItem),
                books: liveItems(m.items || [], 'extra', wall).filter(function (it) {
                    return it.type === 'books';
                })[0] || null,
                moments: liveItems(m.items || [], 'extra', wall).filter(function (it) {
                    return it.type === 'moments' && it.moments && it.moments.length;
                })[0] || null,
                // Every menu of the day, for their slide (src/menus.js); none on a day with no canteen.
                menus: today.menu ? this.menusOf(wall) : null,
                mealTime: mealTime(wall, this.manifest.mealhours),
                deadlines: liveItems(m.items || [], 'extra', wall).filter(function (it) {
                    return it.type === 'deadlines';
                })[0] || null,
                channel: liveItems(m.items || [], 'extra', wall).filter(function (it) {
                    return it.type === 'channel' && channelShow(it);
                })[0] || null,
                tables: liveItems(m.items || [], 'extra', wall).filter(function (it) {
                    return it.type === 'table';
                }),
                albums: albums.map(function (a) {
                    return {id: a.id, count: a.photos.length};
                }),
                phrases: liveItems(m.items || [], 'ticker', wall).map(function (it) {
                    return it.text || it.title || '';
                }).filter(Boolean),
                week: week ? {things: week.things, weekday: weekdayOf(dayNumber(wall.date))} : null});
        this.menuTurn++;
        choice.items.forEach(function (it) {
            if (it.album) {
                turns[it.album.id] = (turns[it.album.id] || 0) + 1;
            }
        });
        if (choice.comp === 'agenda') {
            choice.extra = {data: this.agendaData(wall, m)};
        } else if (choice.comp === 'zonas') {
            choice.extra = Object.assign({}, choice.extra, {days: nextDays});
        } else if (choice.extra && choice.extra.album) {
            choice.extra.albumData = albums.filter(function (a) {
                return a.id === choice.extra.album;
            })[0];
        }
        // Some know how long they last only once they are in the page.
        const seconds = this.screen.show(choice, today, week) || choice.seconds;
        if (this.mode === 'screen') {
            this.played.add(this.screen.shownIds(choice), seconds);
        }
        const lasts = seconds * 1000 + (choice.items.some(function (it) {
            return it.type === 'video';
        }) ? 5000 : 0);
        this.turnDue = Date.now() + lasts;
        this.timer = setTimeout(function () {
            self.next();
        }, lasts);
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
        const urgent = urgentOf(m.items, wall);
        this.surprises.tick(Date.now(), on && !urgent, this.mode === 'preview');
        // An urgent notice covers everything until it is taken off; then the turns go on. With the screen off, the black goes
        // over it, and it still comes off when it ends.
        const was = this.urgentOn;
        this.urgentOn = !!urgent;
        this.screen.showUrgent(urgent);
        const wasOn = this.wasOn;
        this.wasOn = on;
        if (!on) {
            return;
        }
        this.screen.setDark(this.forcedTheme !== undefined ? this.forcedTheme : isDark(m.theme, wall));
        this.screen.setClock(this.clock.date());
        // Whose birthday it is today, all day above the ticker; never on a showcase. Before a first slide is measured.
        this.screen.showBirthdayStrip(useOf(m, wall) === 'showcase' ? null : liveItems(m.items || [], 'extra', wall).filter(function (it) {
            return it.type === 'birthdays' && it.people && it.people.length;
        })[0] || null);
        // Just on, not with what it had yesterday; and a turn that never came is not waited for.
        const lost = this.turnDue && Date.now() > this.turnDue + 60000;
        if ((was && !urgent) || wasOn === false || lost || !this.screen.comp) {
            this.next();
        }
        if (this.reloadAt && Date.now() - this.reloadAt > 30000) {
            location.reload();
            return;
        }
        this.screen.showTicker(liveItems(m.items || [], 'ticker', wall).map(function (it) {
            return it.text;
        }).filter(Boolean), typeof this.draftPhrase === 'string' ? this.draftPhrase : (m.centre && m.centre.phrase) || '');
    }

    // Once a day, in the small hours, a screen reloads itself: weeks of a page open wear any browser down.
    nightly(wall) {
        // Where the browser keeps nothing, not even the key, a reload would leave the screen asking to be paired.
        if (this.mode === 'screen' && store.works() && performance.now() > 20 * 3600000 && wall.min >= 180 && wall.min < 240) {
            location.reload();
        }
    }

    /**
     * The agent of the device, through the browser's debugging channel, which is the only way between the two: what it knows comes
     * in, to go with the heartbeat; what it needs comes out. A pixel in a corner changes for it, so that it can tell from outside
     * that the picture still moves. It changes nothing on a screen with no agent.
     *
     * @param {object} device what the device knows
     * @returns {string} JSON
     */
    agent(device) {
        this.device = device;
        this.keepPixel();
        const m = this.manifest;
        return JSON.stringify({version: VERSION, key: store.key(), revoked: store.revoked(),
            on: m ? isPowerOn(m.power, this.clock.wall()) : true});
    }

    keepPixel() {
        if (this.pixel) {
            return;
        }
        const pixel = document.createElement('div');
        pixel.style.cssText = 'position:fixed;left:0;top:0;width:4px;height:4px;z-index:1000;pointer-events:none';
        document.body.appendChild(pixel);
        this.pixel = pixel;
        let turn = false;
        const change = function () {
            turn = !turn;
            pixel.style.background = turn ? 'rgba(128,128,128,.02)' : 'rgba(128,128,128,.05)';
        };
        change();
        setInterval(change, 20000);
    }

    /** A capture from the agent, in base64: it goes up with the key of the screen, which stays here. */
    sendShot(base64) {
        const raw = atob(base64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
            bytes[i] = raw.charCodeAt(i);
        }
        const self = this;
        return this.api.screenshot(new Blob([bytes], {type: 'image/png'})).catch(function (e) {
            self.note('screenshot: ' + (e && e.message || e));
        });
    }

    /** Seconds with no frame painted, with the page in sight: on a screen with no agent, the only sign of a frozen picture. */
    stalled() {
        const self = this;
        if (document.visibilityState !== 'visible') {
            this.frameAt = Date.now();
            return 0;
        }
        // Measured from one heartbeat to the next: at the first there is nothing to measure yet, and a screen that took minutes to be
        // paired would look frozen.
        const since = this.frameAt;
        requestAnimationFrame(function () {
            self.frameAt = Date.now();
        });
        return since ? Math.max(0, Math.floor((Date.now() - since) / 1000)) : 0;
    }

    heartbeat() {
        const m = this.manifest;
        const wall = this.clock.wall();
        const body = {
            time: Math.floor(Date.now() / 1000),
            tz_offset: -new Date().getTimezoneOffset(),
            version: VERSION,
            // Not by the wall clock: a Raspberry Pi has no battery, and it jumps when the network gives it the time.
            uptime: Math.floor(performance.now() / 1000),
            manifest: m ? m.etag : null,
            stale: !!(m && m.horizon && wall.date > m.horizon),
            on: m ? isPowerOn(m.power, wall) : true,
            showing: this.screen ? this.screen.showing() : [],
            display: {width: window.innerWidth, height: window.innerHeight},
            stalled: this.stalled(),
            device: this.device,
            cache: this.media ? this.media.usage() : {files: 0, bytes: 0},
            errors: this.errors.concat(this.media ? this.media.errors() : []).slice(-5),
        };
        const played = this.played.take();
        if (played) {
            body.played = played;
        }
        const self = this;
        this.api.heartbeat(body).then(function (r) {
            self.heardAt = Date.now();
            self.errors = [];
            self.played.sent();
            if (r && r.manifest && (!m || r.manifest !== m.etag)) {
                self.refresh();
            } else if (m && self.media.errors().length) {
                // What did not come down (a photo the server was still refusing, the network gone a moment) is asked for
                // again at each heartbeat, not left until the content changes.
                self.media.sync(mediaOf(m));
            }
            // Asked from the panel, or a new player on the server: reload at the next change of slide.
            const asked = r && r.commands && r.commands.indexOf('reload') !== -1;
            if (r && r.commands && r.commands.indexOf('surprise') !== -1) {
                self.surprises.askNow();
            }
            const newer = r && r.build && self.boot.build && r.build !== self.boot.build;
            if ((asked || newer) && !self.reloadAt) {
                self.reloadAt = Date.now();
            }
        }, function (e) {
            self.played.failed();
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
