// The service worker of the player: keeps the page, its script and its styles, so a screen that restarts without a
// network, or while its site is being updated, still opens. The page goes to the network first (it may carry a new
// version) and falls back to the copy when the network fails or the server answers with an error;
// the media do not pass through here, the player keeps them itself (media.js).

const SHELL = 'hechauka-shell-1';

self.addEventListener('install', function (event) {
    self.skipWaiting();
    event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', function (event) {
    event.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) {
            return k.indexOf('hechauka-shell-') === 0 && k !== SHELL ? caches.delete(k) : null;
        }));
    }).then(function () {
        return self.clients.claim();
    }));
});

function isShell(url) {
    const scope = self.registration.scope;
    if (url.indexOf(scope) !== 0) {
        return false;
    }
    const rest = url.slice(scope.length).split('?')[0];
    return rest === '' || rest === 'index.php' || /\.(js|css|svg|woff2?)$/.test(rest);
}

// The copy of a request kept in the shell cache, with or without its query.
function fromCache(req) {
    return caches.open(SHELL).then(function (c) {
        return c.match(req, {ignoreSearch: false}).then(function (hit) {
            return hit || c.match(req, {ignoreSearch: true});
        });
    });
}

// What a screen shows when it has nothing kept yet and the server cannot give it the page: black, and again in half a
// minute. Never the server's own error page, which has nothing that would bring the screen back.
function retryPage() {
    return new Response('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="30">' +
        '<title>Hechauka</title><body style="margin:0;background:#000"></body>',
        {headers: {'Content-Type': 'text/html; charset=utf-8'}});
}

self.addEventListener('fetch', function (event) {
    const req = event.request;
    if (req.method !== 'GET' || !isShell(req.url)) {
        return;
    }
    const page = req.mode === 'navigate';
    event.respondWith(fetch(req).then(function (res) {
        if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then(function (c) {
                return c.put(req, copy);
            });
            return res;
        }
        // A site being updated, or failing, answers with its own page: the screen keeps going with its copy.
        return fromCache(req).then(function (hit) {
            return hit || (page ? retryPage() : res);
        });
    }, function () {
        return fromCache(req).then(function (hit) {
            return hit || (page ? retryPage() : Response.error());
        });
    }));
});
