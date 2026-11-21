// The media of the screen, kept on the device so the screen goes on without a network. Every file is fetched with
// the key of the screen and stored by its sha1 in the Cache API, under an address inside the player's folder; the
// service worker (sw.js) serves it from there, in pieces when a <video> asks for them, so nothing big is held in
// memory. While the worker does not control the page yet (the very first start), or where the Cache API is missing,
// the files are shown from memory through blob URLs, as before.
//
// In the preview and the demo nothing is stored: the media URLs are used as they come.

const CACHE = 'hechauka-media-1';

/** The address of a kept file: inside the folder of the player, where its worker answers. */
export function mediaAddress(sha1) {
    return new URL('__media__/' + sha1, location.href.split('?')[0]).href;
}

function controlled() {
    return !!(navigator.serviceWorker && navigator.serviceWorker.controller);
}

export class MediaStore {
    /**
     * @param {object|null} api the contract calls; null to use the URLs as they come
     */
    constructor(api) {
        this.api = api;
        this.urls = {};
        this.blobs = {};
        this.sizes = {};
        this.failed = {};
        this.busy = false;
        this.pending = null;
        this.hasCache = !!(api && window.caches && window.caches.open);
    }

    /** The URL to show a media object with, or null while it is not on the device. */
    url(media) {
        if (!media) {
            return null;
        }
        if (!this.api) {
            return media.url;
        }
        return this.urls[media.sha1] || null;
    }

    ready(media) {
        return !!this.url(media);
    }

    /**
     * A file that would not show: out of what the device has, so that the next sync brings it again.
     *
     * @param {object|undefined} media
     */
    forget(media) {
        const sha1 = media && media.sha1;
        if (!sha1 || !this.urls[sha1]) {
            return;
        }
        if (this.blobs[sha1]) {
            URL.revokeObjectURL(this.urls[sha1]);
        }
        delete this.urls[sha1];
        delete this.blobs[sha1];
    }

    /** Files that failed and why, for the heartbeat. */
    errors() {
        const out = [];
        for (const sha1 in this.failed) {
            out.push(this.failed[sha1]);
        }
        return out.slice(-5);
    }

    /**
     * Brings to the device what the manifest needs, one file after another, and drops what it no longer needs.
     *
     * @param {object[]} list media objects
     * @returns {Promise<void>}
     */
    sync(list) {
        if (!this.api) {
            return Promise.resolve();
        }
        const wanted = {};
        list.forEach(function (m) {
            wanted[m.sha1] = m;
        });
        const same = Object.keys(wanted).sort().join(',');
        if (this.busy) {
            // A newer list waits for the one being brought, and goes after it: never dropped. The very same list asked
            // again (the heartbeat, for what failed) is the one being brought: starting it over would leave what comes after
            // a slow file never brought.
            if (same !== this.bringing) {
                this.pending = list;
            }
            return Promise.resolve();
        }
        this.busy = true;
        this.bringing = same;
        const self = this;
        let chain = this.open().then(function (cache) {
            return self.prune(cache, wanted).then(function () {
                return cache;
            });
        });
        Object.keys(wanted).forEach(function (sha1) {
            chain = chain.then(function (cache) {
                // A newer list came while this one was being brought: it goes first, and brings again what it still needs
                // (today's birthdays do not wait behind yesterday's videos).
                if (self.pending) {
                    return cache;
                }
                // A download that hangs (the network gone with no answer) must not keep the rest waiting.
                const limit = Math.max(600000, (wanted[sha1].size || 0) / 100);
                let timer = 0;
                return Promise.race([self.bring(cache, wanted[sha1]), new Promise(function (resolve, reject) {
                    timer = setTimeout(function () {
                        reject(new Error('it takes too long'));
                    }, limit);
                })]).then(function () {
                    clearTimeout(timer);
                    return cache;
                }, function (e) {
                    clearTimeout(timer);
                    self.failed[sha1] = 'media ' + wanted[sha1].id + ': ' + (e && e.message || e);
                    return cache;
                });
            });
        });
        const done = function () {
            self.busy = false;
            self.bringing = null;
            if (self.pending) {
                const next = self.pending;
                self.pending = null;
                return self.sync(next);
            }
            if (self.onSynced) {
                self.onSynced();
            }
            return null;
        };
        return chain.then(done, done);
    }

    /** How many files and bytes are on the device. */
    usage() {
        let files = 0;
        let bytes = 0;
        for (const sha1 in this.urls) {
            files++;
            bytes += this.sizes[sha1] || 0;
        }
        return {files, bytes};
    }

    open() {
        if (!this.hasCache) {
            return Promise.resolve(null);
        }
        return window.caches.open(CACHE).catch(function () {
            return null;
        });
    }

    bring(cache, media) {
        const self = this;
        if (this.urls[media.sha1]) {
            return Promise.resolve();
        }
        const address = mediaAddress(media.sha1);
        const stored = cache ? cache.match(address) : Promise.resolve(null);
        return stored.then(function (hit) {
            if (hit) {
                return {kept: true, res: hit};
            }
            return self.api.media(media.url).then(function (res) {
                if (!cache) {
                    return {kept: false, res};
                }
                return cache.put(address, res.clone()).then(function () {
                    return {kept: true, res};
                }, function () {
                    // The disk is full or the cache refused it: show it anyway, from memory.
                    return {kept: false, res};
                });
            });
        }).then(function (got) {
            self.sizes[media.sha1] = media.size || 0;
            if (got.kept && controlled()) {
                // The worker serves it from the cache: nothing in memory.
                self.urls[media.sha1] = address;
                delete self.failed[media.sha1];
                return null;
            }
            return got.res.blob().then(function (blob) {
                self.blobs[media.sha1] = blob;
                self.urls[media.sha1] = URL.createObjectURL(blob);
                delete self.failed[media.sha1];
            });
        });
    }

    prune(cache, wanted) {
        const self = this;
        // What failed and is no longer wanted is no longer a fault: not told, not brought again at every heartbeat.
        Object.keys(this.failed).forEach(function (sha1) {
            if (!wanted[sha1]) {
                delete self.failed[sha1];
            }
        });
        Object.keys(this.urls).forEach(function (sha1) {
            if (!wanted[sha1]) {
                if (self.blobs[sha1]) {
                    URL.revokeObjectURL(self.urls[sha1]);
                }
                delete self.urls[sha1];
                delete self.blobs[sha1];
                delete self.sizes[sha1];
            }
        });
        if (!cache) {
            return Promise.resolve();
        }
        return cache.keys().then(function (keys) {
            return Promise.all(keys.map(function (req) {
                const sha1 = req.url.split('/').pop();
                return wanted[sha1] ? null : cache.delete(req);
            }));
        }).catch(function () {
            return null;
        });
    }
}

/**
 * Every media object a manifest refers to: the logos and the birthdays' photos first, so that a screen that has just
 * started (every morning, when the television switches on) has them in seconds, not after the albums and the videos.
 */
export function mediaOf(manifest) {
    const first = [];
    const out = [];
    function add(m, list) {
        if (m && m.sha1 && m.url) {
            (list || out).push(m);
        }
    }
    if (manifest.theme) {
        add(manifest.theme.logo, first);
        add(manifest.theme.logo_dark, first);
    }
    // The QR codes the site's link shortener draws, beside each web.
    if (manifest.idle) {
        add(manifest.idle.qrimage);
    }
    // A touch screen's «Cómo llegar» and «Conoce el centro» (src/tactil.js): the map and a day here.
    const centre = manifest.centre || {};
    if (centre.contact) {
        add(centre.contact.map);
    }
    ((centre.about && centre.about.day) || []).forEach(function (moment) {
        add(moment.media);
    });
    (manifest.items || []).forEach(function (it) {
        add(it.media);
        add(it.poster);
        add(it.backdrop);
        add(it.webqr);
        if (it.album) {
            add(it.album.webqr);
        }
        (it.people || []).forEach(function (person) {
            add(person.photo, first);
        });
        (it.books || []).forEach(function (book) {
            add(book.cover);
            add(book.webqr);
        });
        (it.moments || []).forEach(function (moment) {
            add(moment.cover);
        });
        // The centre's Instagram: the pictures of its last posts (a video's cover), for its slide (src/instagram.js).
        (it.posts || []).forEach(function (post) {
            (post.media || []).forEach(function (m) {
                add(m);
            });
        });
        // Today's visits of Eguahe, for a touch screen: whoever receives them first (the welcome), and the plan.
        (it.visits || []).forEach(function (visit) {
            (visit.hosts || []).forEach(function (host) {
                add(host.img, first);
            });
            add(visit.plan);
        });
        // Eguahe's acts: the centre's guide with the first (the day it waves at whoever comes), and each act's code.
        (it.acts || []).forEach(function (act) {
            add(act.guide && act.guide.img, first);
            add(act.webqr);
        });
        add(it.image);
    });
    return first.concat(out);
}
