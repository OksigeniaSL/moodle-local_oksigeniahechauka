// The first page of a Samsung professional display with Hechauka (SSSP: Tizen 4 with Chromium 56, Tizen 5 with Chromium
// 63), packaged and signed as an app that the display's URL Launcher installs from the player's folder of a Moodle. The
// package is the same for every centre, so the first time it asks for the address of the Moodle, with the remote, as the
// Raspberry Pi does (device/raiz/usr/local/lib/hechauka/ajuste.py); it checks that Hechauka answers there and keeps it.
// From then on it says where it is going for a few seconds, in which OK changes the address, and opens the player. Without
// a network it waits for one instead of falling on an error page. Plain ES5 for Chromium 56.
(function () {
    'use strict';

    var PLUGIN = '/local/oksigeniahechauka';
    var HELLO = PLUGIN + '/api/device.php?f=hola';
    var PLAYER = PLUGIN + '/player/';
    var KEY = 'hechauka.direccion';
    var WAIT = 6000;
    var SHOWN = 2500;
    var RETRY = 30000;
    var TIMEOUT = 15000;
    var LABEL = '[a-z0-9]([a-z0-9-]*[a-z0-9])?';
    var ADDRESS = new RegExp('^https?://' + LABEL + '(\\.' + LABEL + ')*(:[0-9]{1,5})?(/[A-Za-z0-9._~%-]+)*$');
    // OK is Enter. Back and the on-screen keyboard's Done and Cancel are Tizen's own codes; Esc does for Back on a computer.
    var KEYS = {enter: 13, esc: 27, left: 37, up: 38, right: 39, down: 40, back: 10009, done: 65376, cancel: 65385};
    // Passing troubles: the address is tried again by itself.
    var PASSING = ['sin-red', 'no-contesta'];
    var TIZEN = typeof window.tizen !== 'undefined';
    // «?ensayo» in a computer's browser: everything but leaving the page, which says where it would go.
    var DRY = /[?&]ensayo(=|&|$)/.test(location.search);

    var TEXTS = {
        es: {
            title: '¿Cuál es la dirección de tu Moodle?',
            label: 'La que escribes para abrir tu Moodle con Hechauka, o una dirección corta del reproductor.',
            hintTv: 'Con el mando: OK abre el teclado y, al acabar, baja hasta «Conectar».',
            hint: 'Escríbela con un teclado y pulsa Intro.',
            connect: 'Conectar',
            keep: 'Seguir con {site}',
            change: 'Cambiar la dirección',
            looking: 'Buscando Hechauka en {host}…',
            doneTitle: 'Conectada con {site}',
            done: 'Un momento: ahora sale el código para darla de alta.',
            opening: 'Conectando con {site}…',
            openingHint: 'Para conectarla con otro Moodle, pulsa OK.',
            dry: 'Ensayo: abriría {url}',
            errors: {
                'mal-escrita': 'Eso no parece la dirección de una web. Escríbela así: moodle.example.org.',
                'sin-red': 'La pantalla no tiene red. Conecta el cable de red: lo vuelve a intentar sola cada medio minuto.',
                'no-contesta': 'La pantalla no llega a {host}. Mira que la dirección esté bien escrita: lo vuelve a intentar ' +
                    'sola cada medio minuto.',
                'sin-hechauka': 'En {host} hay una web, pero sin Hechauka. Escribe la dirección de tu Moodle, con el plugin ' +
                    'instalado y al día.'
            },
            waiting: {
                'sin-red': 'La pantalla no tiene red. Conecta el cable de red: lo vuelve a intentar sola cada medio minuto.',
                'no-contesta': 'La pantalla no llega a {host}. Lo vuelve a intentar sola cada medio minuto.'
            }
        },
        en: {
            title: 'What is the address of your Moodle?',
            label: 'The one you type to open your Moodle with Hechauka, or a short address of the player.',
            hintTv: 'With the remote: OK opens the keyboard; when you are done, go down to “Connect”.',
            hint: 'Type it with a keyboard and press Enter.',
            connect: 'Connect',
            keep: 'Keep {site}',
            change: 'Change the address',
            looking: 'Looking for Hechauka at {host}…',
            doneTitle: 'Connected to {site}',
            done: 'One moment: the code to add it comes next.',
            opening: 'Connecting to {site}…',
            openingHint: 'To connect it to another Moodle, press OK.',
            dry: 'Dry run: it would open {url}',
            errors: {
                'mal-escrita': 'That does not look like a web address. Type it like this: moodle.example.org.',
                'sin-red': 'The screen has no network. Plug in the network cable: it tries again every half minute.',
                'no-contesta': 'The screen cannot reach {host}. Check that the address is spelt right: it tries again ' +
                    'every half minute.',
                'sin-hechauka': 'There is a website at {host}, but without Hechauka. Type the address of your Moodle, with ' +
                    'the plugin installed and up to date.'
            },
            waiting: {
                'sin-red': 'The screen has no network. Plug in the network cable: it tries again every half minute.',
                'no-contesta': 'The screen cannot reach {host}. It tries again every half minute.'
            }
        }
    };
    var lang = /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
    var other = lang === 'es' ? 'en' : 'es';
    var t = TEXTS[lang];
    var $ = function (id) {
        return document.getElementById(id);
    };
    var input = $('direccion');
    var state = '';
    var saved = null;
    var timers = [];
    var token = 0;
    var enterOnField = 0;
    var trouble = '';

    document.documentElement.lang = lang;
    $('conectar').textContent = t.connect;
    $('cambiar').textContent = t.change;
    $('pista').textContent = TIZEN ? t.hintTv : t.hint;
    $('etiqueta').textContent = t.label;

    function fill(text, values) {
        return text.replace(/\{(\w+)\}/g, function (all, key) {
            return values && values[key] ? values[key] : '';
        });
    }

    function later(fn, ms) {
        timers.push(setTimeout(fn, ms));
    }

    function stop() {
        timers.forEach(clearTimeout);
        timers = [];
        token++;
    }

    // What is kept: in the page's storage and, where the display has it, in the widget's own preferences.
    function load() {
        var raw = null;
        try {
            raw = window.localStorage.getItem(KEY);
        } catch (e) {
            raw = null;
        }
        if (!raw) {
            try {
                raw = window.widget && window.widget.preferences ? window.widget.preferences.getItem(KEY) : null;
            } catch (e) {
                raw = null;
            }
        }
        try {
            var v = JSON.parse(raw);
            return v && typeof v.url === 'string' && /^https?:\/\//.test(v.url) ? v : null;
        } catch (e) {
            return null;
        }
    }

    function keep(v) {
        var raw = JSON.stringify(v);
        try {
            window.localStorage.setItem(KEY, raw);
        } catch (e) {
            // The other one may still keep it.
        }
        try {
            if (window.widget && window.widget.preferences) {
                window.widget.preferences.setItem(KEY, raw);
            }
        } catch (e) {
            // As above.
        }
        saved = v;
    }

    function parse(text) {
        text = String(text || '').replace(/\s+/g, '');
        if (!text) {
            return null;
        }
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
            text = 'https://' + text;
        }
        var u;
        try {
            u = new URL(text);
        } catch (e) {
            return null;
        }
        return /^https?:$/.test(u.protocol) && u.hostname ? u : null;
    }

    // The places a Moodle may be, from whatever was typed: «aula.example.org», any of its pages or its player. The path is
    // shortened one step at a time, for a Moodle in a folder of its site. The same as the Raspberry Pi.
    function candidates(u) {
        var path = u.pathname;
        var at = path.indexOf(PLUGIN);
        if (at >= 0) {
            path = path.slice(0, at);
        }
        path = path.replace(/\/[^/]*\.php$/, '');
        var steps = path.split('/').filter(Boolean).slice(0, 4);
        var origin = u.protocol + '//' + u.hostname.toLowerCase() + (u.port ? ':' + u.port : '');
        var found = [];
        for (;;) {
            var base = origin + (steps.length ? '/' + steps.join('/') : '');
            if (ADDRESS.test(base) && found.indexOf(base) < 0) {
                found.push(base);
            }
            if (!steps.length) {
                return found;
            }
            steps.pop();
        }
    }

    function get(url, json) {
        return new Promise(function (resolve) {
            var x = new XMLHttpRequest();
            var over = false;
            function end(r) {
                if (!over) {
                    over = true;
                    resolve(r);
                }
            }
            try {
                x.open('GET', url);
                x.timeout = TIMEOUT;
                if (json) {
                    x.setRequestHeader('Accept', 'application/json');
                }
            } catch (e) {
                end({status: 0});
                return;
            }
            x.onload = function () {
                end({status: x.status, text: x.responseText, url: x.responseURL || ''});
            };
            x.onerror = function () {
                end({status: 0});
            };
            x.ontimeout = function () {
                end({status: 0, late: true});
            };
            x.send();
        });
    }

    // What the Moodle at base says about its Hechauka, and where it really is, after its redirections. «ciego»: nothing
    // could be read, for want of a network or because the answer did not allow this page to read it (CORS).
    function hello(base) {
        return get(base + HELLO, true).then(function (r) {
            if (!r.status) {
                return {kind: r.late ? 'no-contesta' : 'ciego'};
            }
            var info = null;
            try {
                info = JSON.parse(r.text);
            } catch (e) {
                info = null;
            }
            if (r.status !== 200 || !info || typeof info !== 'object' || !info.hechauka) {
                return {kind: 'sin-hechauka'};
            }
            var real = base;
            if (r.url && r.url.slice(-HELLO.length) === HELLO) {
                real = r.url.slice(0, -HELLO.length);
            }
            real = real.replace(/\/+$/, '');
            return {kind: 'ok', url: real + PLAYER, site: typeof info.sitio === 'string' && info.sitio ? info.sitio :
                parse(real).hostname, checked: true};
        });
    }

    function first(places, seen) {
        var i = 0;
        function next() {
            if (i >= places.length) {
                return Promise.resolve(null);
            }
            return hello(places[i++]).then(function (r) {
                if (r.kind === 'ok') {
                    return r;
                }
                seen[r.kind] = true;
                // A host that does not answer will not answer in another of its folders either.
                return r.kind === 'no-contesta' ? null : next();
            });
        }
        return next();
    }

    // Whether anything answers at url, even if this page may not read it: a request that the browser does not let it
    // read still says that there is a network and a server.
    function reach(url) {
        if (typeof window.fetch !== 'function') {
            return Promise.resolve(navigator.onLine !== false);
        }
        return new Promise(function (resolve) {
            var timer = setTimeout(function () {
                resolve(false);
            }, TIMEOUT);
            window.fetch(url, {mode: 'no-cors', cache: 'no-store', credentials: 'omit'}).then(function () {
                clearTimeout(timer);
                resolve(true);
            }, function () {
                clearTimeout(timer);
                resolve(false);
            });
        });
    }

    // The Moodle behind what was typed. A short address (links.example.org/player, from the site's own shortener) is
    // followed to where it leads, and that is what is kept. If the display does not let this page read where it led, the
    // short address is kept as it was typed: opening it leads to the player all the same.
    function check(text) {
        var u = parse(text);
        var places = u ? candidates(u) : [];
        if (!places.length) {
            return Promise.resolve({error: 'mal-escrita'});
        }
        if (navigator.onLine === false) {
            return Promise.resolve({error: 'sin-red', host: u.hostname});
        }
        // Whether anything answers there at all goes in parallel: an address that does not answer is said at once,
        // without waiting for every question to it to time out.
        var there = reach(u.href);
        var unreachable = there.then(function (ok) {
            return ok ? new Promise(function () {
                // It answers: the questions say the rest.
            }) : {error: navigator.onLine === false ? 'sin-red' : 'no-contesta', host: u.hostname};
        });
        var seen = {};
        var asked = first(places, seen).then(function (found) {
            if (found || seen['no-contesta']) {
                return found;
            }
            return get(u.href, false).then(function (r) {
                if (!r.status) {
                    seen.ciego = true;
                    return null;
                }
                var w = r.url ? parse(r.url) : null;
                return w && w.href !== u.href ? first(candidates(w), seen) : null;
            });
        }).then(function (found) {
            if (found) {
                return found;
            }
            if (seen['no-contesta']) {
                return {error: 'no-contesta', host: u.hostname};
            }
            if (seen['sin-hechauka'] && !seen.ciego) {
                return {error: 'sin-hechauka', host: u.hostname};
            }
            return there.then(function (ok) {
                if (!ok) {
                    return {error: navigator.onLine === false ? 'sin-red' : 'no-contesta', host: u.hostname};
                }
                var path = u.pathname.replace(/\/+$/, '');
                if (path && path.indexOf(PLUGIN) < 0) {
                    return {kind: 'ok', url: u.href, site: u.hostname, checked: false};
                }
                return {error: 'sin-hechauka', host: u.hostname};
            });
        });
        return Promise.race([asked, unreachable]);
    }

    function go(url) {
        if (DRY) {
            var note = document.createElement('p');
            note.className = 'hka-ensayo';
            note.textContent = fill(t.dry, {url: url});
            document.body.appendChild(note);
            document.documentElement.setAttribute('data-destino', url);
            return;
        }
        window.location.replace(url);
    }

    function shown(v) {
        return v.checked ? parse(v.url).hostname : v.url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    }

    function view(o) {
        state = o.state;
        $('titulo').textContent = o.title;
        $('otro').textContent = o.other || '';
        $('otro').setAttribute('lang', o.otherLang || lang);
        $('otro').hidden = !o.other;
        $('form').hidden = !o.form;
        $('estado').textContent = o.message || '';
        $('estado').className = 'hka-estado' + (o.error ? ' es-error' : '');
        $('acciones').hidden = !o.change && !o.keep;
        $('cambiar').hidden = !o.change;
        $('seguir').hidden = !o.keep;
        $('barra').hidden = !o.bar;
    }

    // The question: the first time, or to change the address, with the one there was ready to go back to. «quiet»: a
    // try of its own that did not work either, which leaves the focus where it was.
    function ask(prefill, error, host, quiet) {
        stop();
        trouble = error || '';
        view({state: 'pide', title: t.title, other: TEXTS[other].title, otherLang: other, form: true,
            message: error ? fill(t.errors[error] || '', {host: host}) : '', error: !!error, keep: !!saved});
        if (saved) {
            $('seguir').textContent = fill(t.keep, {site: saved.site || shown(saved)});
        }
        input.disabled = $('conectar').disabled = $('seguir').disabled = false;
        if (prefill !== null) {
            input.value = prefill;
        }
        if (quiet) {
            return;
        }
        // On the display the keyboard would cover the message: after an error the focus waits on «Connect».
        if (error && TIZEN) {
            $('conectar').focus();
        } else {
            input.focus();
            if (error) {
                input.select();
            }
        }
    }

    function attempt(text, quiet) {
        stop();
        var mine = token;
        var u = parse(text);
        var host = u ? u.hostname : '';
        if (!quiet) {
            input.disabled = $('conectar').disabled = $('seguir').disabled = true;
        }
        $('estado').textContent = u ? fill(t.looking, {host: host}) : '';
        $('estado').className = 'hka-estado';
        state = 'comprobando';
        check(text).then(function (r) {
            if (mine !== token) {
                return;
            }
            if (r.kind === 'ok') {
                keep({url: r.url, site: r.site, checked: r.checked});
                if (r.checked) {
                    done(r);
                } else {
                    open();
                }
                return;
            }
            ask(null, r.error, r.host || host, quiet);
            if (PASSING.indexOf(r.error) >= 0) {
                later(function () {
                    if (input.value.trim() === text.trim()) {
                        attempt(text, true);
                    }
                }, RETRY);
            }
        });
    }

    function done(r) {
        stop();
        view({state: 'hecho', title: fill(t.doneTitle, {site: r.site}), message: t.done});
        later(function () {
            go(r.url);
        }, SHOWN);
    }

    // With an address kept: a few seconds saying where it goes, in which OK changes it, and the player as soon as it
    // answers. Without a network, it waits for one.
    function open() {
        stop();
        var mine = token;
        var site = saved.site || shown(saved);
        view({state: 'arranca', title: fill(t.opening, {site: site}), other: shown(saved), message: t.openingHint,
            change: true, bar: true});
        $('cambiar').focus();
        var bar = $('llena');
        bar.style.transition = 'none';
        bar.style.transform = 'scaleX(1)';
        bar.getBoundingClientRect();
        bar.style.transition = 'transform ' + WAIT + 'ms linear';
        bar.style.transform = 'scaleX(0)';
        var ready = false;
        var answered = null;
        function next() {
            if (mine !== token) {
                return;
            }
            if (answered === false) {
                wait(navigator.onLine === false ? 'sin-red' : 'no-contesta');
            } else if (answered && ready) {
                go(saved.url);
            }
        }
        later(function () {
            ready = true;
            next();
        }, WAIT);
        if (navigator.onLine === false) {
            answered = false;
            next();
            return;
        }
        reach(saved.url).then(function (ok) {
            answered = ok;
            next();
        });
    }

    function wait(reason) {
        stop();
        var mine = token;
        var site = saved.site || shown(saved);
        view({state: 'espera', title: fill(t.opening, {site: site}), other: shown(saved),
            message: fill(t.waiting[reason], {host: parse(saved.url).hostname}), change: true});
        if (document.activeElement !== $('cambiar')) {
            $('cambiar').focus();
        }
        later(again, RETRY);
        function again() {
            if (mine !== token) {
                return;
            }
            if (navigator.onLine === false) {
                wait('sin-red');
                return;
            }
            reach(saved.url).then(function (ok) {
                if (mine !== token) {
                    return;
                }
                if (ok) {
                    stop();
                    go(saved.url);
                } else {
                    wait('no-contesta');
                }
            });
        }
    }

    window.addEventListener('online', function () {
        if (state === 'espera') {
            open();
        } else if (state === 'pide' && PASSING.indexOf(trouble) >= 0 && input.value.trim()) {
            attempt(input.value, true);
        }
    });

    function focusables() {
        return [input, $('conectar'), $('cambiar'), $('seguir')].filter(function (el) {
            for (var n = el; n && n !== document.body; n = n.parentNode) {
                if (n.hidden) {
                    return false;
                }
            }
            return !el.disabled;
        });
    }

    function move(step) {
        var list = focusables();
        if (!list.length) {
            return;
        }
        var i = list.indexOf(document.activeElement);
        list[i < 0 ? 0 : Math.max(0, Math.min(list.length - 1, i + step))].focus();
    }

    function back() {
        if (document.activeElement === input) {
            // The first Back closes the keyboard; the next one leaves.
            input.blur();
            $('conectar').focus();
        } else if (state === 'pide' && saved) {
            open();
        }
    }

    // While it looks by itself (a quiet try) the field stays free, and what is typed goes first.
    function submit() {
        if (input.disabled) {
            return;
        }
        var text = input.value.trim();
        if (!text) {
            input.focus();
            return;
        }
        attempt(text, false);
    }

    $('form').addEventListener('submit', function (e) {
        e.preventDefault();
        // On the display, OK on the field opens its keyboard: what connects is the keyboard's Done, or «Connect».
        if (TIZEN && document.activeElement === input && Date.now() - enterOnField < 500) {
            return;
        }
        submit();
    });
    // To change it, the address there was, as it would be typed: the Moodle's, or the short one.
    $('cambiar').addEventListener('click', function () {
        var was = saved ? saved.url : '';
        if (saved && saved.checked && was.slice(-PLAYER.length) === PLAYER) {
            was = was.slice(0, -PLAYER.length);
        }
        ask(was.replace(/^https:\/\//, ''), '', '');
    });
    $('seguir').addEventListener('click', function () {
        if (saved) {
            open();
        }
    });

    // The display's on-screen keyboard: Done connects, Cancel leaves the field.
    function keyboard(e) {
        if (e.keyCode === KEYS.done) {
            e.preventDefault();
            input.blur();
            submit();
            return true;
        }
        if (e.keyCode === KEYS.cancel) {
            e.preventDefault();
            input.blur();
            $('conectar').focus();
            return true;
        }
        return false;
    }

    document.addEventListener('keydown', function (e) {
        var k = e.keyCode;
        var at = document.activeElement;
        if (at === input && keyboard(e)) {
            return;
        }
        if (k === KEYS.back || k === KEYS.esc) {
            e.preventDefault();
            back();
        } else if (k === KEYS.up || k === KEYS.down || k === KEYS.left || k === KEYS.right) {
            if (at === input && (k === KEYS.left || k === KEYS.right)) {
                return;
            }
            e.preventDefault();
            move(k === KEYS.up || k === KEYS.left ? -1 : 1);
        } else if (k === KEYS.enter && at === input) {
            enterOnField = Date.now();
        } else if (k === KEYS.enter && (!at || at === document.body)) {
            // Nothing had the focus: OK goes to the first thing there is.
            e.preventDefault();
            move(0);
        }
    });

    saved = load();
    if (saved) {
        open();
    } else {
        ask('', '', '');
    }
})();
