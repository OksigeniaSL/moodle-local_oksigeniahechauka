// The calls of the contract (docs/contract.md). fetch with a time limit of its own: the browsers of professional
// screens have no AbortController, so a hung request is simply left behind.

const KEY_HEADER = 'X-Hechauka-Key';

export class ApiError extends Error {
    constructor(status, code, message) {
        super(message || code || ('HTTP ' + status));
        this.status = status;
        this.code = code || '';
    }

    get revoked() {
        return this.status === 401 && this.code === 'revoked';
    }
}

function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
        const t = setTimeout(function () {
            reject(new ApiError(0, 'timeout'));
        }, ms);
        promise.then(function (v) {
            clearTimeout(t);
            resolve(v);
        }, function (e) {
            clearTimeout(t);
            reject(e instanceof ApiError ? e : new ApiError(0, 'network', String(e && e.message || e)));
        });
    });
}

function failure(res) {
    return res.json().then(function (body) {
        throw new ApiError(res.status, body && body.error, body && body.message);
    }, function () {
        throw new ApiError(res.status, '');
    });
}

/**
 * @param {object} endpoints from the boot block
 * @param {function(): (string|null)} key the key of the screen, when it has one
 * @param {boolean} session true in the preview: the person signed in to the panel, not a key
 * @param {function(number, number, number)=} heard told the server's time (Date header) of each answer, and when the
 *     request left and came back, by the device's clock
 */
export function makeApi(endpoints, key, session, heard) {
    function headers(extra) {
        const h = extra || {};
        const k = key();
        if (k) {
            h[KEY_HEADER] = k;
        }
        return h;
    }
    // `clock`: whether its Date header tells the time. Only the answers of the contract do: a file may come from the
    // browser's own cache (Chromium before 64 takes no notice of `cache`) with the date of the day it first came.
    function request(url, opts, ms, clock) {
        opts.credentials = session ? 'same-origin' : 'omit';
        opts.cache = 'no-store';
        const sent = Date.now();
        return withTimeout(fetch(url, opts), ms || 20000).then(function (res) {
            if (heard && clock !== false && res.headers && !(Number(res.headers.get('Age')) > 0)) {
                const server = Date.parse(res.headers.get('Date') || '');
                if (server > 0) {
                    heard(server, sent, Date.now());
                }
            }
            return res;
        });
    }
    function postJson(url, body) {
        return request(url, {
            method: 'POST',
            headers: headers({'Content-Type': 'application/json'}),
            body: JSON.stringify(body),
        }).then(function (res) {
            return res.ok ? res.json() : failure(res);
        });
    }

    return {
        /** A code to be named with; with the token of the code it had, the same code while it waits. */
        pair: function (device, token) {
            return postJson(endpoints.pair, token ? {device: device, token: token} : {device: device});
        },
        poll: function (token) {
            return postJson(endpoints.poll, {token: token});
        },
        /** The manifest, or null when it has not changed since etag. */
        manifest: function (etag) {
            const h = headers();
            if (etag) {
                h['If-None-Match'] = '"' + etag + '"';
            }
            return request(endpoints.manifest, {method: 'GET', headers: h}).then(function (res) {
                if (res.status === 304) {
                    return null;
                }
                return res.ok ? res.json() : failure(res);
            });
        },
        heartbeat: function (body) {
            return postJson(endpoints.heartbeat, body);
        },
        /** What the screen is really showing, from the agent of the device. */
        screenshot: function (blob) {
            return request(endpoints.screenshot, {
                method: 'POST',
                headers: headers({'Content-Type': blob.type}),
                body: blob,
            }, 0, false).then(function (res) {
                return res.ok ? null : failure(res);
            });
        },
        /** A media file, as a Response, for the cache. Videos can be big: a long time limit. */
        media: function (url) {
            return request(url, {method: 'GET', headers: headers()}, 30 * 60000, false).then(function (res) {
                return res.ok ? res : failure(res);
            });
        },
    };
}
