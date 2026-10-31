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
        if (this.busy) {
            // A newer list waits for the one being brought, and goes after it: never dropped.
            this.pending = list;
            return Promise.resolve();
        }
        this.busy = true;
        const self = this;
        const wanted = {};
        list.forEach(function (m) {
            wanted[m.sha1] = m;
        });
        let chain = this.open().then(function (cache) {
            return self.prune(cache, wanted).then(function () {
                return cache;
            });
        });
        Object.keys(wanted).forEach(function (sha1) {
            chain = chain.then(function (cache) {
                return self.bring(cache, wanted[sha1]).then(function () {
                    return cache;
                }, function (e) {
                    self.failed[sha1] = 'media ' + wanted[sha1].id + ': ' + (e && e.message || e);
                    return cache;
                });
            });
        });
        const done = function () {
            self.busy = false;
            if (self.pending) {
                const next = self.pending;
                self.pending = null;
                return self.sync(next);
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

/** Every media object a manifest refers to. */
export function mediaOf(manifest) {
    const out = [];
    function add(m) {
        if (m && m.sha1 && m.url) {
            out.push(m);
        }
    }
    if (manifest.theme) {
        add(manifest.theme.logo);
        add(manifest.theme.logo_dark);
    }
    (manifest.items || []).forEach(function (it) {
        add(it.media);
        add(it.poster);
        add(it.backdrop);
    });
    return out;
}
