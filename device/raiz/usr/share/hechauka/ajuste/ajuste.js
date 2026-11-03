// The setup page of a Hechauka screen. On the television (from the device itself) it asks for the address of the Moodle,
// to type with a keyboard, and shows a QR for a phone on the same network; on the phone, the same question. Both follow
// what the device is doing (ajuste.py), so that what is typed on one shows on the other.
(function () {
    'use strict';

    var TEXTS = {
        es: {
            title: '¿Cuál es la dirección de tu Moodle?',
            label: 'Escríbela con un teclado y pulsa Intro.',
            labelPhone: 'La que escribes para abrir tu Moodle, el que tiene instalado Hechauka.',
            button: 'Conectar',
            phone: 'O desde el móvil, conectado a la misma red',
            looking: 'Buscando Hechauka en {host}…',
            doneTitle: 'Conectada con {site}',
            done: 'Mira la pantalla: ahora sale el código para darla de alta.',
            doneTv: 'Un momento: ahora sale el código para darla de alta.',
            scan: 'Escanea el código QR que sale en la pantalla.',
            screen: 'Pantalla {name}',
            errors: {
                'mal-escrita': 'Eso no parece la dirección de una web. Escríbela así: moodle.example.org.',
                'sin-red': 'La pantalla no tiene red. Conecta el cable de red: lo vuelve a intentar sola.',
                'no-existe': 'No se encuentra {host}. ¿Está bien escrita?',
                'no-contesta': '{host} no contesta. La pantalla lo vuelve a intentar sola cada medio minuto.',
                'sin-hechauka': 'En {host} hay una web, pero sin Hechauka. Escribe la dirección de tu Moodle, con el plugin instalado y al día.',
                'certificado': 'El certificado de seguridad de {host} no es válido.',
                'hora': 'La pantalla aún no tiene la hora puesta. Lo vuelve a intentar sola.'
            }
        },
        en: {
            title: 'What is the address of your Moodle?',
            label: 'Type it with a keyboard and press Enter.',
            labelPhone: 'The one you type to open your Moodle, the one with Hechauka installed.',
            button: 'Connect',
            phone: 'Or from a phone on the same network',
            looking: 'Looking for Hechauka at {host}…',
            doneTitle: 'Connected to {site}',
            done: 'Look at the screen: the code to add it comes next.',
            doneTv: 'One moment: the code to add it comes next.',
            scan: 'Scan the QR code on the screen.',
            screen: 'Screen {name}',
            errors: {
                'mal-escrita': 'That does not look like a web address. Type it like this: moodle.example.org.',
                'sin-red': 'The screen has no network. Plug in the network cable: it tries again by itself.',
                'no-existe': '{host} cannot be found. Is it spelt right?',
                'no-contesta': '{host} does not answer. The screen tries again every half minute.',
                'sin-hechauka': 'There is a website at {host}, but without Hechauka. Type the address of your Moodle, with the plugin installed and up to date.',
                'certificado': 'The security certificate of {host} is not valid.',
                'hora': 'The screen does not have the right time yet. It tries again by itself.'
            }
        }
    };
    var lang = /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
    var other = lang === 'es' ? 'en' : 'es';
    var t = TEXTS[lang];
    var pin = (/[?&]pin=([0-9]{4})/.exec(location.search) || [])[1] || '';
    var local = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
    var $ = function (id) {
        return document.getElementById(id);
    };
    var input = $('direccion');
    var last = null;
    var typed = false;

    function fill(text, values) {
        return text.replace(/\{(\w+)\}/g, function (all, key) {
            return values && values[key] ? values[key] : '';
        });
    }

    $('titulo').textContent = t.title;
    $('otro').textContent = TEXTS[other].title;
    $('otro').setAttribute('lang', other);
    $('boton').textContent = t.button;
    $('etiqueta').textContent = local ? t.label : t.labelPhone;
    document.documentElement.lang = lang;
    document.documentElement.className = local ? 'es-tele' : 'es-movil';
    input.addEventListener('input', function () {
        typed = true;
    });

    // On the television, the agent of the device looks after this page as it does the player: it must answer, and a
    // pixel in a corner must change, or it would take the picture for frozen.
    if (local) {
        var pixel = document.createElement('div');
        pixel.className = 'hka-pixel';
        document.body.appendChild(pixel);
        var turn = false;
        setInterval(function () {
            turn = !turn;
            pixel.style.background = turn ? 'rgba(128,128,128,.02)' : 'rgba(128,128,128,.05)';
        }, 20000);
        window.hechauka = {
            agent: function () {
                return JSON.stringify({on: true, setup: true});
            },
            sendShot: function () {
                return null;
            }
        };
        input.focus();
    }

    function show(s) {
        last = s;
        if (s.state === 'sin-permiso') {
            $('form').hidden = true;
            $('estado').textContent = t.scan;
            return;
        }
        var done = s.state === 'hecho';
        $('form').hidden = done;
        $('otro').hidden = done;
        $('titulo').textContent = done ? fill(t.doneTitle, s) : t.title;
        if (s.name) {
            $('nombre').textContent = fill(t.screen, {name: s.name});
        }
        // The address being tried, or the one that failed, stays in the field: whoever looks at the television sees
        // which one it was and corrects it there, even if it came from a phone.
        var shown = s.tried || s.current;
        if (!typed && shown) {
            input.value = shown.replace(/^https:\/\//, '');
        }
        var message = '';
        if (s.state === 'comprobando') {
            message = fill(t.looking, s);
        } else if (done) {
            message = local ? t.doneTv : t.done;
        } else if (s.error) {
            message = fill(t.errors[s.error] || '', s);
        } else if (local && !s.ip) {
            message = t.errors['sin-red'];
        }
        $('estado').textContent = message;
        $('estado').className = 'hka-estado' + (s.state === 'pide' && message ? ' es-error' : '');
        input.disabled = $('boton').disabled = s.state === 'comprobando';
        if (local) {
            phone(s);
        }
    }

    // The QR for a phone: the address of this page on the network, with the PIN that only the television shows. With
    // no network there is no phone to reach it, and the page already says what to do.
    var drawn = '';
    function phone(s) {
        $('movil').hidden = s.state === 'hecho' || !s.ip;
        if (!s.ip) {
            drawn = '';
            return;
        }
        var url = 'http://' + s.ip + ':' + s.port + '/?pin=' + s.pin;
        $('movil-titulo').textContent = t.phone;
        $('movil-dir').textContent = s.ip + ':' + s.port;
        if (drawn !== url && typeof window.qrcode === 'function') {
            var q = window.qrcode(0, 'M');
            q.addData(url);
            q.make();
            $('qr').innerHTML = q.createSvgTag({cellSize: 4, margin: 0, scalable: true});
            drawn = url;
        }
    }

    function ask() {
        var x = new XMLHttpRequest();
        x.open('GET', 'estado' + (pin ? '?pin=' + pin : ''));
        x.onload = function () {
            try {
                show(JSON.parse(x.responseText));
            } catch (e) {
                // A half answer: the next one will do.
            }
        };
        x.send();
    }

    $('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var text = input.value.trim();
        if (!text) {
            input.focus();
            return;
        }
        show({state: 'comprobando', host: text.replace(/^https?:\/\//, '').split('/')[0], ip: last && last.ip,
            port: last && last.port, pin: last && last.pin, name: last && last.name});
        var x = new XMLHttpRequest();
        x.open('POST', 'direccion');
        x.setRequestHeader('Content-Type', 'application/json');
        x.onload = function () {
            try {
                show(JSON.parse(x.responseText));
            } catch (err) {
                ask();
            }
            typed = false;
            if (local && last && last.state === 'pide') {
                input.focus();
                input.select();
            }
        };
        x.onerror = ask;
        x.send(JSON.stringify({direccion: text, pin: pin}));
    });

    if (!local && !pin) {
        show({state: 'sin-permiso'});
    } else {
        ask();
        setInterval(ask, 2000);
    }
})();
