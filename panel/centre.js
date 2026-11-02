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

    // What was changed is not lost by searching for a place or by going away.
    const form = document.getElementById('hkp-centre-form');
    let dirty = false;
    page.addEventListener('input', (ev) => {
        dirty = dirty || ev.target.form === form;
    });
    page.addEventListener('change', (ev) => {
        dirty = dirty || ev.target.form === form;
    });
    if (form) {
        form.addEventListener('submit', () => {
            dirty = false;
        });
    }
    window.addEventListener('beforeunload', (ev) => {
        if (dirty) {
            ev.preventDefault();
            ev.returnValue = '';
        }
    });

    const surprises = document.getElementById('hkp-surprises');
    if (surprises) {
        surprises.addEventListener('change', () => {
            document.getElementById('hkp-surprises-box').hidden = !surprises.checked;
        });
    }
    page.querySelectorAll('[data-surprise-dates]').forEach((dates) => {
        const box = dates.parentNode.querySelector('input[type="checkbox"]');
        box.addEventListener('change', () => {
            dates.hidden = !box.checked;
        });
    });
    page.querySelectorAll('[data-surprise-atlas]').forEach((button) => {
        button.addEventListener('click', () => {
            frame.contentWindow.postMessage({hkSurprise: {id: button.getAttribute('data-surprise-id'),
                atlas: button.getAttribute('data-surprise-atlas')}}, location.origin);
        });
    });

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
    const mix = (from, to, part) => {
        const a = rgb(from);
        const b = rgb(to);
        return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * part).toString(16).padStart(2, '0')).join('');
    };
    const custom = page.querySelector('#hkp-custom');
    const picked = (name) => page.querySelector('input[name="' + name + '"]:checked');
    const colourOf = (setting) => page.querySelector('[data-colour="' + setting + '"]').value.toLowerCase();
    // The background made from the main colour: the same rule as skins::tinted().
    const tinted = (primary) => {
        const tints = JSON.parse(custom.getAttribute('data-tints'));
        const texts = JSON.parse(custom.getAttribute('data-texts'));
        const out = {};
        Object.keys(tints).forEach((mode) => {
            const [base, start, surface, line] = tints[mode];
            let part = 0;
            let fondo = base;
            for (const step of [1, 0.75, 0.5, 0.25, 0]) {
                part = start * step;
                fondo = mix(base, primary, part);
                if (texts[mode].every((text) => contrast(text, fondo) >= 4.5)) {
                    break;
                }
            }
            out[mode] = {fondo, superficie: mix(surface, primary, part * 0.4), linea: mix(fondo, line, 0.12)};
        });
        return out;
    };
    // What changes with the theme: the same rule as skins::modes().
    const modes = (accent) => {
        const skin = picked('skin');
        const ground = picked('skinground');
        const tint = ground && ground.value === 'tint';
        if (!skin || (!tint && !accent)) {
            return null;
        }
        const tones = tint ? tinted(colourOf('colourprimary')) :
            JSON.parse((ground && ground.value && ground.getAttribute('data-tones')) || skin.getAttribute('data-tones'));
        const out = {};
        ['light', 'dark'].forEach((mode) => {
            out[mode] = {};
            if (tint) {
                out[mode]['--hk-fondo'] = tones[mode].fondo;
                out[mode]['--hk-superficie'] = tones[mode].superficie;
                out[mode]['--hk-linea'] = tones[mode].linea;
            }
            if (accent) {
                out[mode]['--hk-acento-texto'] = readable(readable(accent, tones[mode].fondo), tones[mode].superficie);
            }
        });
        return out;
    };

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
        const skin = page.querySelector('input[name="skin"]:checked');
        page.querySelectorAll('[data-colour]').forEach((input) => {
            const setting = input.getAttribute('data-colour');
            const hex = input.value.toLowerCase();
            const name = names[setting];
            // What the skin already gives stays with the skin, which also has its colours for the dark theme.
            if (skin && hex === skin.getAttribute(setting === 'colouraccent' ? 'data-skin-accent' : 'data-skin-primary')) {
                return;
            }
            out[name] = hex;
            out[name.replace('--hk-', '--hk-sobre-')] = on(hex);
        });
        const letter = picked('skinletter');
        if (letter && letter.value) {
            out['--hk-letra-titulos'] = letter.getAttribute('data-stack');
            out['--hk-letra-texto'] = letter.getAttribute('data-stack');
        }
        const corners = picked('skincorners');
        if (corners && corners.getAttribute('data-corner') !== '1') {
            out['--hk-esquina'] = corners.getAttribute('data-corner');
        }
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
            const skin = picked('skin');
            const own = vars();
            const ground = picked('skinground');
            frame.contentWindow.postMessage({hkTheme: {vars: Object.assign(own, override || {}), mode,
                modes: modes(own['--hk-acento']), ground: ground && ground.value !== 'tint' ? ground.value : '',
                skin: skin ? skin.getAttribute('data-skin') : ''}}, location.origin);
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
    // The cards are drawn in the letter of each skin.
    const gallery = page.querySelector('[data-letters]');
    if (gallery) {
        const letters = document.createElement('style');
        letters.textContent = gallery.getAttribute('data-letters');
        document.head.appendChild(letters);
    }
    // The editor opens under the gallery; what it starts from is drawn from the skin, and a note says when it has changes.
    const opener = page.querySelector('#hkp-custom-open');
    const note = page.querySelector('#hkp-custom-note');
    const paintCustom = () => {
        const skin = picked('skin');
        if (!skin) {
            return;
        }
        page.querySelector('[data-letter-skin]').style.fontFamily = skin.getAttribute('data-stack');
        page.querySelector('[data-ground-skin]').style.background = JSON.parse(skin.getAttribute('data-tones')).light.fondo;
        page.querySelector('[data-ground-tint]').style.background = tinted(colourOf('colourprimary')).light.fondo;
        note.hidden = !(picked('skinletter').value || picked('skinground').value || picked('skincorners').value !== 'round' ||
            colourOf('colourprimary') !== skin.getAttribute('data-primary') ||
            colourOf('colouraccent') !== skin.getAttribute('data-accent'));
    };
    opener.addEventListener('click', () => {
        custom.hidden = !custom.hidden;
        opener.setAttribute('aria-expanded', custom.hidden ? 'false' : 'true');
    });
    ['skinletter', 'skinground', 'skincorners'].forEach((name) => {
        page.querySelectorAll('input[name="' + name + '"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                paintCustom();
                send();
            });
        });
    });
    const asItComes = () => {
        page.querySelector('input[name="skinletter"][value=""]').checked = true;
        page.querySelector('input[name="skinground"][value=""]').checked = true;
        page.querySelector('input[name="skincorners"][value="round"]').checked = true;
    };
    page.querySelector('#hkp-custom-reset').addEventListener('click', () => {
        dirty = true;
        picked('skin').dispatchEvent(new Event('change'));
    });
    // Choosing a skin brings its colours and undoes what was changed over the other; touching them makes them the centre's own.
    page.querySelectorAll('input[name="skin"]').forEach((radio) => {
        radio.addEventListener('change', () => {
            asItComes();
            page.querySelectorAll('[data-colour]').forEach((input) => {
                const setting = input.getAttribute('data-colour');
                input.value = radio.getAttribute(setting === 'colouraccent' ? 'data-accent' : 'data-primary');
                page.querySelector('[data-hex="' + setting + '"]').textContent = input.value.toUpperCase();
                page.querySelector('[data-on="' + setting + '"]').textContent = on(input.value) === '#ffffff' ? words.white :
                    words.dark;
            });
            paintCustom();
            send();
        });
    });
    paintCustom();
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
    const removable = (row, button) => {
        button.addEventListener('click', () => {
            row.remove();
            send();
            if (add) {
                add.hidden = list.children.length >= max;
            }
        });
    };
    const wire = (row) => {
        const input = row.querySelector('[data-category]');
        const place = () => '--hk-marca-' + (Array.prototype.indexOf.call(list.children, row) + 1);
        input.addEventListener('input', send);
        row.addEventListener('mouseenter', () => blink(place()));
        input.addEventListener('focus', () => blink(place()));
        const remove = row.querySelector('[data-remove-cat]');
        if (remove) {
            removable(row, remove);
        }
        // Brought from Moodle: not removed here, only unlinked (then it is like any other).
        const unlink = row.querySelector('[data-unlink-cat]');
        if (unlink) {
            unlink.addEventListener('click', () => {
                row.querySelector('[data-coursecat]').value = '0';
                row.removeAttribute('data-linked');
                const icon = row.querySelector('.hkp-cat-link');
                if (icon) {
                    icon.remove();
                }
                const x = page.querySelector('#hkp-cat-new').content.querySelector('[data-remove-cat]').cloneNode(true);
                unlink.replaceWith(x);
                removable(row, x);
            });
        }
        // The words: pills, one taken out with its «×», one added with «+ palabra» (Enter or a comma).
        const box = row.querySelector('.hkp-cat-words');
        const hidden = row.querySelector('[data-words]');
        const sync = () => {
            hidden.value = Array.prototype.map.call(box.querySelectorAll('.hkp-word'), (w) => w.firstChild.textContent)
                .join(', ');
        };
        const pill = (word) => {
            const span = document.createElement('span');
            span.className = 'hkp-word';
            span.appendChild(document.createTextNode(word));
            const x = document.createElement('button');
            x.type = 'button';
            x.setAttribute('aria-label', '× ' + word);
            x.textContent = '×';
            x.addEventListener('click', () => {
                span.remove();
                sync();
            });
            span.appendChild(x);
            return span;
        };
        box.querySelectorAll('[data-word-remove]').forEach((x) => {
            x.addEventListener('click', () => {
                x.parentNode.remove();
                sync();
            });
        });
        const plus = box.querySelector('[data-word-add]');
        plus.addEventListener('click', () => {
            const field = document.createElement('input');
            field.className = 'hkp-word-input';
            field.setAttribute('aria-label', plus.textContent.trim());
            field.placeholder = plus.getAttribute('title') || '';
            plus.hidden = true;
            box.insertBefore(field, plus);
            field.focus();
            // Once: removing the field also takes its focus away, and that must not add the word a second time.
            let finished = false;
            const done = (keep) => {
                if (finished) {
                    return;
                }
                finished = true;
                const word = field.value.trim().toLowerCase();
                const have = Array.prototype.map.call(box.querySelectorAll('.hkp-word'), (w) => w.firstChild.textContent);
                if (keep && word && have.indexOf(word) < 0) {
                    box.insertBefore(pill(word), field);
                    sync();
                }
                field.remove();
                plus.hidden = false;
            };
            field.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    done(true);
                    plus.click();
                } else if (e.key === 'Escape') {
                    done(false);
                    plus.focus();
                }
            });
            field.addEventListener('blur', () => done(true));
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
