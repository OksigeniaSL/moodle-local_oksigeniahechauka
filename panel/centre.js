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
    const names = {colourprimary: '--hk-primario', colouraccent: '--hk-acento', colour1: '--hk-marca-1',
        colour2: '--hk-marca-2', colour3: '--hk-marca-3', colour4: '--hk-marca-4'};

    const vars = () => {
        const out = {};
        page.querySelectorAll('[data-colour]').forEach((input) => {
            const setting = input.getAttribute('data-colour');
            const hex = input.value.toLowerCase();
            const name = names[setting];
            out[name] = hex;
            out[name.replace('--hk-', '--hk-sobre-')] = on(hex);
            if (setting === 'colouraccent') {
                out['--hk-acento-texto'] = readable(hex, '#ffffff');
            } else if (setting !== 'colourprimary') {
                out[name + '-oscuro'] = readable(hex, '#19212c');
            }
        });
        return out;
    };
    const send = () => {
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({hkTheme: {vars: vars(), mode}}, location.origin);
        }
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
            send();
        }
    });
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
