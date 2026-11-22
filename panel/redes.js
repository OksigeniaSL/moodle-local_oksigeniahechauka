// Hechauka: «Nuestras redes» in «Tu centro» (centre.mustache, the block #hkp-redes). A box for each network, as a profile reads in
// the network itself: its glyph and name, the account («@centro.ejemplo») or the address, and its switch «En las pantallas». Each
// gesture saves by itself through networks.php (Hechauka): what is written when the box is left or Enter is pressed, the switch
// when it is turned. The answer says how the box stays: the account as it is written, its address, whether it shows, and where an
// address of another network went (to its own box: this one stays as it was). While a box is in hand, the screen beside shows its
// «Síguenos en …», as the screens will; leaving the block, the screen goes back to its samples (centre.js).
//
// The glyphs are the brands' own marks as Simple Icons draws them (CC0 1.0); LinkedIn's, the web's globe and any other's link,
// from Tabler Icons (MIT License, © 2020-2024 Paweł Kuna). The same as the player's src/redes.js.
(function () {
    'use strict';
    const block = document.getElementById('hkp-redes');
    if (!block) {
        return;
    }
    const GLYPHS = {
        instagram: [false, 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077'],
        tiktok: [false, 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z'],
        youtube: [false, 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'],
        facebook: [false, 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z'],
        x: [false, 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z'],
        threads: [false, 'M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z'],
        bluesky: [false, 'M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026'],
        telegram: [false, 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z'],
        whatsapp: [false, 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'],
        linkedin: [false, 'M17 2a5 5 0 0 1 5 5v10a5 5 0 0 1 -5 5h-10a5 5 0 0 1 -5 -5v-10a5 5 0 0 1 5 -5zm-9 8a1 1 0 0 0 -1 1v5a1 1 0 0 0 2 0v-5a1 1 0 0 0 -1 -1m6 0a3 3 0 0 0 -1.168 .236l-.125 .057a1 1 0 0 0 -1.707 .707v5a1 1 0 0 0 2 0v-3a1 1 0 0 1 2 0v3a1 1 0 0 0 2 0v-3a3 3 0 0 0 -3 -3m-6 -3a1 1 0 0 0 -.993 .883l-.007 .127a1 1 0 0 0 1.993 .117l.007 -.127a1 1 0 0 0 -1 -1'],
        web: [true, 'M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0 M3.6 9h16.8 M3.6 15h16.8 M11.5 3a17 17 0 0 0 0 18 M12.5 3a17 17 0 0 1 0 18'],
        other: [true, 'M9 15l6 -6 M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464 M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463'],
    };
    const glyph = (network) => {
        const g = GLYPHS[network] || GLYPHS.other;
        const paint = g[0] ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' :
            'fill="currentColor"';
        return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path ' + paint + ' d="' + g[1] + '"/></svg>';
    };
    const words = JSON.parse(block.getAttribute('data-words') || '{}');
    const save = block.getAttribute('data-save');
    const sesskey = (window.M && M.cfg && M.cfg.sesskey) || (document.querySelector('input[name="sesskey"]') || {}).value || '';
    const frame = document.getElementById('hkp-cpv');
    const boxes = {};
    block.querySelectorAll('[data-network]').forEach((box) => {
        boxes[box.getAttribute('data-network')] = box;
        box.querySelector('.hkp-red-glifo').innerHTML = glyph(box.getAttribute('data-network'));
        const field = box.querySelector('input.hkp-red-cuenta');
        if (field) {
            field.placeholder = box.getAttribute('data-network') === 'web' ? words.placeholderweb || '' : words.placeholder || '';
            field.hkSaved = field.value;
        }
    });

    // What a box says, in a line under it, for a moment (or until the next gesture, when it is a mistake).
    const say = (box, text, kind) => {
        const line = box.querySelector('.hkp-red-estado');
        clearTimeout(line.hkTimer);
        line.textContent = text || '';
        line.setAttribute('data-kind', kind || '');
        if (text && kind === 'ok') {
            line.hkTimer = setTimeout(() => {
                line.textContent = '';
            }, 2400);
        }
    };

    // The box as the answer left it.
    const paint = (box, now) => {
        const field = box.querySelector('input.hkp-red-cuenta');
        const fixed = box.querySelector('.hkp-red-cuenta.is-fija');
        const filled = !!now.web;
        if (field) {
            field.value = now.value || '';
            field.hkSaved = field.value;
        } else if (fixed) {
            fixed.textContent = now.value || '';
        }
        box.setAttribute('data-web', now.web || '');
        box.setAttribute('data-account', now.account || '');
        box.classList.toggle('is-filled', filled);
        box.classList.toggle('is-on', filled && !!now.show);
        const on = box.querySelector('.hkp-red-pantallas input');
        on.checked = filled && !!now.show;
        on.disabled = !filled;
    };

    // The screen beside: this network's «Síguenos en …» while it is in hand, as the screens will show it.
    const showOnScreen = (box) => {
        if (!frame || !frame.contentWindow || !box.getAttribute('data-web')) {
            return;
        }
        const network = box.getAttribute('data-network');
        // The name the screens take: the account, or the web's site; none for an address that names no account.
        frame.contentWindow.postMessage({hkDraft: {item: {id: 'draft-network', type: 'channel', zone: 'extra', network,
            title: box.getAttribute('data-title') || '', text: box.getAttribute('data-text') || '',
            name: box.getAttribute('data-account') || '', web: box.getAttribute('data-web')}, focus: 'canal'}}, location.origin);
    };
    let away = null;
    block.addEventListener('focusin', (ev) => {
        clearTimeout(away);
        const box = ev.target.closest('[data-network]');
        if (box) {
            showOnScreen(box);
        }
    });
    // Out of the block: the screen goes back to its samples (centre.js listens).
    block.addEventListener('focusout', () => {
        clearTimeout(away);
        away = setTimeout(() => {
            if (!block.contains(document.activeElement)) {
                block.dispatchEvent(new CustomEvent('hkp-samples', {bubbles: true}));
            }
        }, 300);
    });

    const send = (box, fields) => {
        const body = new FormData();
        body.append('sesskey', sesskey);
        body.append('network', box.getAttribute('data-network'));
        Object.keys(fields).forEach((k) => body.append(k, fields[k]));
        box.classList.add('is-saving');
        say(box, words.saving, 'busy');
        return fetch(save, {method: 'POST', body, credentials: 'same-origin'})
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .finally(() => box.classList.remove('is-saving'));
    };

    const keep = (box) => {
        const field = box.querySelector('input.hkp-red-cuenta');
        const value = field.value.trim();
        // Pasting saves at once and leaving the box would again: one request for one value.
        if (value === field.hkSaved || value === box.hkSending) {
            return;
        }
        box.hkSending = value;
        send(box, {value}).finally(() => {
            box.hkSending = null;
        }).then((now) => {
            if (now.wrong) {
                field.value = field.hkSaved;
                say(box, (words.wrong || '').replace('{$a}', box.getAttribute('data-name')), 'bad');
                return;
            }
            if (now.network !== box.getAttribute('data-network') && boxes[now.network]) {
                // An address of another network: it went to its own box; this one stays as it was.
                const there = boxes[now.network];
                field.value = field.hkSaved;
                paint(there, now);
                say(box, (words.moved || '').replace('{$a}', there.getAttribute('data-name')), 'ok');
                say(there, words.saved, 'ok');
                there.classList.add('is-new');
                setTimeout(() => there.classList.remove('is-new'), 1600);
                showOnScreen(there);
                return;
            }
            paint(box, now);
            say(box, now.web ? words.saved : '', 'ok');
            showOnScreen(box);
        }).catch(() => {
            say(box, words.error, 'bad');
        });
    };

    block.querySelectorAll('input.hkp-red-cuenta').forEach((field) => {
        const box = field.closest('[data-network]');
        field.addEventListener('change', () => keep(box));
        field.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                keep(box);
            }
            if (ev.key === 'Escape') {
                field.value = field.hkSaved;
            }
        });
        // A pasted address saves at once: the gesture is done.
        field.addEventListener('paste', () => setTimeout(() => keep(box), 0));
    });
    block.querySelectorAll('.hkp-red-pantallas input').forEach((on) => {
        const box = on.closest('[data-network]');
        on.addEventListener('change', () => {
            const was = !on.checked;
            send(box, {show: on.checked ? 1 : 0}).then((now) => {
                paint(box, now);
                say(box, words.saved, 'ok');
                showOnScreen(box);
            }).catch(() => {
                on.checked = was;
                say(box, words.error, 'bad');
            });
        });
    });
})();
