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
 */
export function makeApi(endpoints, key, session) {
    function headers(extra) {
        const h = extra || {};
        const k = key();
        if (k) {
            h[KEY_HEADER] = k;
        }
        return h;
    }
    function request(url, opts, ms) {
        opts.credentials = session ? 'same-origin' : 'omit';
        opts.cache = 'no-store';
        return withTimeout(fetch(url, opts), ms || 20000);
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
        pair: function (device) {
            return postJson(endpoints.pair, {device: device});
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
        /** A media file, as a Response, for the cache. Videos can be big: a long time limit. */
        media: function (url) {
            return request(url, {method: 'GET', headers: headers()}, 30 * 60000).then(function (res) {
                return res.ok ? res : failure(res);
            });
        },
    };
}
