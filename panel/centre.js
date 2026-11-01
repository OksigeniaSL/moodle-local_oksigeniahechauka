// Hechauka: «Tu centro» (centre.mustache). The colours being chosen go to the screen beside them at once, each with
// the text that reads on it (the same rule as classes/local/colours.php), light or dark; the weather shows its icon.
(function () {
    'use strict';
    const page = document.getElementById('hkp-centre-page');
    if (!page) {
        return;
    }
    const words = JSON.parse(page.getAttribute('data-strings') || '{}');
    const frame = document.getElementById('hkp-cpv');
    let mode = 'light';

    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16));
    const luminance = (hex) => {
        const c = rgb(hex).map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const contrast = (a, b) => {
        const x = luminance(a);
        const y = luminance(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    // White if it reaches 4.5:1, else whichever reads better (classes/local/colours.php).
    const on = (hex) => {
        const white = contrast(hex, '#ffffff');
        return white >= 4.5 || white >= contrast(hex, '#16191d') ? '#ffffff' : '#16191d';
    };
    const readable = (hex, bg) => {
        const to = luminance(bg) > 0.5 ? [0, 0, 0] : [255, 255, 255];
        const from = rgb(hex);
        for (let t = 0; t <= 20; t++) {
            const mix = '#' + from.map((v, i) => Math.round(v + (to[i] - v) * t / 20).toString(16).padStart(2, '0')).join('');
            if (contrast(mix, bg) >= 4.5) {
                return mix;
            }
        }
        return to[0] ? '#ffffff' : '#000000';
    };
    const names = {colourprimary: '--hk-primario', colouraccent: '--hk-acento'};

    const vars = () => {
        const out = {};
        // The centre's categories, by their place in the list.
        page.querySelectorAll('[data-category]').forEach((input, i) => {
            const hex = input.value.toLowerCase();
            const name = '--hk-marca-' + (i + 1);
            out[name] = hex;
            out['--hk-sobre-marca-' + (i + 1)] = on(hex);
            out[name + '-oscuro'] = readable(hex, '#19212c');
        });
        page.querySelectorAll('[data-colour]').forEach((input) => {
            const setting = input.getAttribute('data-colour');
            const hex = input.value.toLowerCase();
            const name = names[setting];
            out[name] = hex;
            out[name.replace('--hk-', '--hk-sobre-')] = on(hex);
            if (setting === 'colouraccent') {
                out['--hk-acento-texto'] = readable(hex, '#ffffff');
            }
        });
        return out;
    };
    // The preview stands on «a picture with Today»: the ticker (main colour), the label (second colour) and events of
    // three stages, samples that only this preview shows.
    const samples = () => {
        const s = words.samples || {};
        const items = (s.events || []).map((e, i) => ({id: 'sample-e' + i, type: 'event', zone: 'side', title: e.title,
            detail: e.detail, start: words.today + 'T' + e.hour, color: e.color}));
        if (s.ticker) {
            items.push({id: 'sample-t', type: 'ticker', zone: 'ticker', text: s.ticker});
        }
        return {item: {id: 'sample-n', type: 'notice', zone: 'side', title: (s.notice || {}).title || '',
            body: (s.notice || {}).body || '', tone: 'normal'}, items, focus: 'main'};
    };
    const send = (override) => {
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({hkTheme: {vars: Object.assign(vars(), override || {}), mode}}, location.origin);
        }
    };
    // Passing over a sample, its colour blinks on the screen: where it goes, at a glance.
    let blinking = null;
    const blink = (name) => {
        clearTimeout(blinking);
        let n = 0;
        const step = () => {
            send(n % 2 === 0 ? {[name]: '#ff2d95'} : null);
            n++;
            if (n < 5) {
                blinking = setTimeout(step, 260);
            }
        };
        step();
    };

    page.querySelectorAll('[data-colour]').forEach((input) => {
        input.addEventListener('input', () => {
            const setting = input.getAttribute('data-colour');
            page.querySelector('[data-hex="' + setting + '"]').textContent = input.value.toUpperCase();
            page.querySelector('[data-on="' + setting + '"]').textContent = on(input.value) === '#ffffff' ? words.white :
                words.dark;
            send();
        });
    });
    page.querySelectorAll('[data-ct]').forEach((button) => {
        button.addEventListener('click', () => {
            mode = button.getAttribute('data-ct');
            page.querySelectorAll('[data-ct]').forEach((x) => x.setAttribute('aria-pressed', x === button ? 'true' : 'false'));
            send();
        });
    });
    window.addEventListener('message', (ev) => {
        if (ev.origin === location.origin && ev.data && ev.data.hkPreviewReady && frame && ev.source === frame.contentWindow) {
            frame.contentWindow.postMessage({hkDraft: samples()}, location.origin);
            send();
        }
    });
    page.querySelectorAll('.hkp-colour').forEach((tile) => {
        const input = tile.querySelector('[data-colour]');
        tile.addEventListener('mouseenter', () => blink(names[input.getAttribute('data-colour')]));
        input.addEventListener('focus', () => blink(names[input.getAttribute('data-colour')]));
    });
    // The categories: add one (in the next colour of the palette), take one out, see a colour as it changes.
    const list = page.querySelector('#hkp-cats');
    const palette = JSON.parse((list && list.getAttribute('data-palette')) || '[]');
    const max = Number((list && list.getAttribute('data-max')) || 6);
    const wire = (row) => {
        const input = row.querySelector('[data-category]');
        const place = () => '--hk-marca-' + (Array.prototype.indexOf.call(list.children, row) + 1);
        input.addEventListener('input', send);
        row.addEventListener('mouseenter', () => blink(place()));
        input.addEventListener('focus', () => blink(place()));
        row.querySelector('[data-remove-cat]').addEventListener('click', () => {
            row.remove();
            send();
            if (add) {
                add.hidden = list.children.length >= max;
            }
        });
    };
    const add = page.querySelector('#hkp-cat-add');
    if (list) {
        Array.prototype.forEach.call(list.children, wire);
    }
    if (add && list) {
        add.addEventListener('click', () => {
            const row = page.querySelector('#hkp-cat-new').content.firstElementChild.cloneNode(true);
            row.querySelector('[data-category]').value = palette[list.children.length % palette.length] || '#1f5f8b';
            list.appendChild(row);
            wire(row);
            const none = page.querySelector('#hkp-cats-none');
            if (none) {
                none.hidden = true;
            }
            add.hidden = list.children.length >= max;
            row.querySelector('input[name="cat_name[]"]').focus();
            send();
        });
    }
    // A new logo, seen before it is saved.
    page.querySelectorAll('[data-logo]').forEach((input) => {
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            const art = input.closest('.hkp-logo').querySelector('.hkp-logo-art');
            if (!file) {
                return;
            }
            const img = document.createElement('img');
            img.alt = '';
            img.src = URL.createObjectURL(file);
            art.textContent = '';
            art.appendChild(img);
        });
    });
    page.querySelectorAll('[data-hkp-focus]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const field = document.getElementById(link.getAttribute('data-hkp-focus'));
            field.focus();
            field.select();
        });
    });
    // The weather's icon, from the screens' own set.
    if (window.HK_TIEMPO) {
        page.querySelectorAll('[data-hk-sky]').forEach((node) => {
            node.innerHTML = window.HK_TIEMPO.svg(node.getAttribute('data-hk-sky')) || '';
        });
    }
})();
