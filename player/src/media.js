// The media of the screen, kept on the device so the screen goes on without a network. Every file is fetched with
// the key of the screen and stored by its sha1 in the Cache API; the player shows it through a blob URL, which a
// <video> can seek in. Where the Cache API is missing, the files stay in memory until the next restart.
//
// In the preview and the demo nothing is stored: the media URLs are used as they come.

const CACHE = 'hechauka-media-1';

function fakeRequest(sha1) {
    return new Request(location.origin + '/__hechauka_media__/' + sha1);
}

export class MediaStore {
    /**
     * @param {object|null} api the contract calls; null to use the URLs as they come
     */
    constructor(api) {
        this.api = api;
        this.urls = {};
        this.blobs = {};
        this.failed = {};
        this.busy = false;
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
        if (!this.api || this.busy) {
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
        return chain.then(function () {
            self.busy = false;
        }, function () {
            self.busy = false;
        });
    }

    /** How many files and bytes are on the device. */
    usage() {
        let files = 0;
        let bytes = 0;
        for (const sha1 in this.blobs) {
            files++;
            bytes += this.blobs[sha1].size || 0;
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
        const stored = cache ? cache.match(fakeRequest(media.sha1)) : Promise.resolve(null);
        return stored.then(function (hit) {
            if (hit) {
                return hit.blob();
            }
            return self.api.media(media.url).then(function (res) {
                if (!cache) {
                    return res.blob();
                }
                return cache.put(fakeRequest(media.sha1), res.clone()).then(function () {
                    return res.blob();
                }, function () {
                    // The disk is full or the cache refused it: show it anyway, from memory.
                    return res.blob();
                });
            });
        }).then(function (blob) {
            self.blobs[media.sha1] = blob;
            self.urls[media.sha1] = URL.createObjectURL(blob);
            delete self.failed[media.sha1];
        });
    }

    prune(cache, wanted) {
        const self = this;
        Object.keys(this.urls).forEach(function (sha1) {
            if (!wanted[sha1]) {
                URL.revokeObjectURL(self.urls[sha1]);
                delete self.urls[sha1];
                delete self.blobs[sha1];
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
