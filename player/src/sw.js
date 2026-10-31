// The service worker of the player: keeps the page, its script and its styles, so a screen that restarts without a
// network still opens. The page goes to the network first (it may carry a new version) and falls back to the copy;
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

self.addEventListener('fetch', function (event) {
    const req = event.request;
    if (req.method !== 'GET' || !isShell(req.url)) {
        return;
    }
    event.respondWith(fetch(req).then(function (res) {
        if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then(function (c) {
                return c.put(req, copy);
            });
        }
        return res;
    }, function () {
        return caches.open(SHELL).then(function (c) {
            return c.match(req, {ignoreSearch: false}).then(function (hit) {
                return hit || c.match(req, {ignoreSearch: true});
            });
        }).then(function (hit) {
            return hit || Response.error();
        });
    }));
});
