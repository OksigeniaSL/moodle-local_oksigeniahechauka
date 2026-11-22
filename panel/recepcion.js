// Hechauka: «Cómo llegar» and «Conoce el centro» in «Tu centro» (centre_reception.mustache, the block #hkp-recepcion), only
// when one of the centre's screens is touched. What the doors of the same names show, drawn as they show it and written
// on it. Each gesture saves by itself through reception.php (Hechauka): a line when it is left or Enter is pressed, a
// picture when it is chosen, a moment moved or taken out when its button is touched. The answer is the whole block
// again (touch::panel()): what is in hand is kept, the rest is repainted from it.
(function () {
    'use strict';
    const block = document.getElementById('hkp-recepcion');
    if (!block) {
        return;
    }
    // Its words, on the block itself (data-w-*): reception_saved, reception_day_add…
    const words = {};
    Object.keys(block.dataset).forEach((k) => {
        if (k.indexOf('w') === 0 && k.length > 1) {
            words['reception_' + k.slice(1).replace(/[A-Z]/g, (c) => '_' + c.toLowerCase()).replace(/^_/, '')] = block.dataset[k];
        }
    });
    const action = block.getAttribute('data-action');
    const sesskey = (window.M && M.cfg && M.cfg.sesskey) || (document.querySelector('input[name="sesskey"]') || {}).value || '';
    const ICON = {
        address: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
        hours: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
        phone: '<path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
        email: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
        web: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.4 3.6 5.2 3.6 8.5s-1.1 6.1-3.6 8.5c-2.5-2.4-3.6-5.2-3.6-8.5S9.5 5.9 12 3.5z"/>',
    };
    const svg = (paths) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
        'stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
    const icons = () => {
        block.querySelectorAll('[data-rc-icon]').forEach((span) => {
            span.innerHTML = svg(ICON[span.getAttribute('data-rc-icon')] || '');
        });
        // What each line takes, for the phone's keyboard too.
        block.querySelectorAll('[data-rc-contact-key]').forEach((input) => {
            const key = input.getAttribute('data-rc-contact-key');
            input.inputMode = {phone: 'tel', email: 'email', web: 'url'}[key] || 'text';
            input.hkSaved = input.value;
        });
        block.querySelectorAll('[data-rc-stage], [data-rc-words], [data-rc-day-field]').forEach((field) => {
            field.hkSaved = field.value;
        });
    };

    // What a gesture says, beside it, for a moment (or until the next gesture, when it is a mistake).
    const say = (near, text, kind) => {
        if (!near || !near.isConnected) {
            return;
        }
        const line = near.querySelector(':scope > .hkp-rc-estado') || (near.parentNode && near.parentNode.querySelector(':scope > .hkp-rc-estado'));
        if (!line) {
            return;
        }
        clearTimeout(line.hkTimer);
        line.textContent = text || '';
        line.setAttribute('data-kind', kind || '');
        if (text && kind === 'ok') {
            line.hkTimer = setTimeout(() => {
                line.textContent = '';
            }, 2200);
        }
    };

    // One gesture to reception.php; its answer is the whole block.
    const send = (what, fields, near) => {
        const body = new FormData();
        body.append('sesskey', sesskey);
        body.append('what', what);
        Object.keys(fields || {}).forEach((k) => {
            body.append(k, fields[k]);
        });
        say(near, words.reception_saving || '…', 'busy');
        // A moment is drawn again with the block: what it says goes to the new one.
        const n = near && near.getAttribute && near.getAttribute('data-rc-moment');
        const again = () => (near && near.isConnected ? near : (n ? block.querySelector('[data-rc-moment="' + n + '"]') : null));
        return fetch(action, {method: 'POST', body: body, credentials: 'same-origin'}).then((r) => {
            if (!r.ok) {
                throw new Error(String(r.status));
            }
            return r.json();
        }).then((now) => {
            paint(now);
            say(again(), words.reception_saved || '', 'ok');
            return now;
        }, () => {
            say(again(), words.reception_failed || '', 'error');
            return null;
        });
    };

    // ---------- What comes back: the block again ----------
    const el = (tag, cls, text) => {
        const n = document.createElement(tag);
        if (cls) {
            n.className = cls;
        }
        if (text !== undefined && text !== null) {
            n.textContent = text;
        }
        return n;
    };
    const paintMap = (url) => {
        const box = block.querySelector('[data-rc-map]');
        box.classList.toggle('has-picture', !!url);
        let img = box.querySelector('img');
        if (url) {
            if (!img) {
                img = el('img');
                img.alt = '';
                box.insertBefore(img, box.firstChild);
            }
            img.src = url;
        } else if (img) {
            img.remove();
        }
        const mandos = box.querySelector('.hkp-rc-mapa-mandos');
        const label = mandos.querySelector('label');
        label.firstChild.textContent = url ? (words.reception_map_change || '') : (words.reception_map_add || '');
        let drop = mandos.querySelector('[data-rc-map-drop]');
        if (url && !drop) {
            drop = el('button', 'btn btn-sm btn-outline-secondary', words.reception_map_drop || '');
            drop.type = 'button';
            drop.setAttribute('data-rc-map-drop', '');
            mandos.appendChild(drop);
        } else if (!url && drop) {
            drop.remove();
        }
    };
    const moment = (m, now) => {
        const li = el('li', 'hkp-rc-momento' + (m.picture ? ' has-picture' : ''));
        li.setAttribute('data-rc-moment', String(m.n));
        const photo = el('label', 'hkp-rc-foto');
        if (m.picture) {
            const img = el('img');
            img.alt = '';
            img.src = m.picture;
            photo.appendChild(img);
        }
        photo.appendChild(el('span', 'hkp-rc-foto-poner', m.picture ? words.reception_day_photo_change : words.reception_day_photo));
        const file = el('input', 'visually-hidden sr-only');
        file.type = 'file';
        file.accept = '.jpg,.jpeg,.png,.webp';
        file.setAttribute('data-rc-day-photo', '');
        photo.appendChild(file);
        li.appendChild(photo);
        const foot = el('span', 'hkp-rc-momento-pie');
        const time = el('input', 'hkp-rc-hora');
        Object.assign(time, {type: 'text', inputMode: 'numeric', maxLength: 5, value: m.time || '', placeholder: '08:45'});
        time.setAttribute('aria-label', words.reception_day_time || '');
        time.setAttribute('data-rc-day-field', 'time');
        const title = el('input', 'hkp-rc-titulo');
        Object.assign(title, {type: 'text', maxLength: now.titlemost, value: m.title || '', placeholder: words.reception_day_title || ''});
        title.setAttribute('aria-label', words.reception_day_title || '');
        title.setAttribute('data-rc-day-field', 'title');
        foot.appendChild(time);
        foot.appendChild(title);
        li.appendChild(foot);
        const says = el('textarea', 'hkp-rc-frase');
        Object.assign(says, {rows: 2, maxLength: now.saysmost, value: m.words || '', placeholder: words.reception_day_words || ''});
        says.setAttribute('aria-label', words.reception_day_words || '');
        says.setAttribute('data-rc-day-field', 'words');
        li.appendChild(says);
        const tools = el('span', 'hkp-rc-momento-mandos');
        [['-1', words.reception_day_before, 'M14.5 5.5L8 12l6.5 6.5'], ['1', words.reception_day_after, 'M9.5 5.5L16 12l-6.5 6.5']].forEach((a) => {
            const b = el('button', 'btn btn-sm btn-outline-secondary');
            b.type = 'button';
            b.setAttribute('data-rc-day-move', a[0]);
            b.setAttribute('aria-label', a[1] || '');
            b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" ' +
                'stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + a[2] + '"/></svg>';
            tools.appendChild(b);
        });
        const drop = el('button', 'btn btn-sm btn-outline-danger', words.reception_day_drop || '');
        drop.type = 'button';
        drop.setAttribute('data-rc-day-drop', '');
        tools.appendChild(drop);
        li.appendChild(tools);
        li.appendChild(el('span', 'hkp-rc-estado'));
        return li;
    };
    const paintDay = (now) => {
        const list = block.querySelector('[data-rc-day]');
        // What is in hand stays where it is: the focused field keeps its moment and its place in it.
        const focus = document.activeElement && list.contains(document.activeElement) ? document.activeElement : null;
        const focusAt = focus ? [focus.closest('[data-rc-moment]') && focus.closest('[data-rc-moment]').getAttribute('data-rc-moment'),
            focus.getAttribute('data-rc-day-field') || (focus.hasAttribute('data-rc-day-move') ? 'move' + focus.getAttribute('data-rc-day-move') : '')] : null;
        list.textContent = '';
        (now.day || []).forEach((m) => {
            list.appendChild(moment(m, now));
        });
        if (!now.dayfull) {
            const li = el('li', 'hkp-rc-momento is-nuevo');
            const add = el('button', 'hkp-rc-nuevo');
            add.type = 'button';
            add.setAttribute('data-rc-day-add', '');
            add.appendChild(el('span', '', '+'));
            add.appendChild(document.createTextNode(words.reception_day_add || ''));
            li.appendChild(add);
            list.appendChild(li);
        }
        arrows();
        icons();
        if (focusAt && focusAt[0]) {
            const li = list.querySelector('[data-rc-moment="' + focusAt[0] + '"]');
            const back = li && (focusAt[1].indexOf('move') === 0 ? li.querySelector('[data-rc-day-move="' + focusAt[1].slice(4) + '"]') :
                li.querySelector('[data-rc-day-field="' + focusAt[1] + '"]'));
            if (back && !back.disabled) {
                back.focus();
            }
        }
    };
    const arrows = () => {
        const items = block.querySelectorAll('[data-rc-moment]');
        items.forEach((li, i) => {
            li.querySelector('[data-rc-day-move="-1"]').disabled = i === 0;
            li.querySelector('[data-rc-day-move="1"]').disabled = i === items.length - 1;
        });
    };
    const paint = (now) => {
        if (!now) {
            return;
        }
        // The lines keep what is being written; the rest comes from the server (what it kept, clipped or cleaned).
        (now.contact || []).forEach((c) => {
            const input = block.querySelector('[data-rc-contact-key="' + c.key + '"]');
            if (input && input !== document.activeElement) {
                input.value = c.value;
                input.hkSaved = c.value;
            }
        });
        const w = block.querySelector('[data-rc-words]');
        if (w && w !== document.activeElement) {
            w.value = now.words || '';
            w.hkSaved = w.value;
        }
        (now.stages || []).forEach((st) => {
            const input = block.querySelector('[data-rc-stage="' + st.id + '"]');
            if (input && input !== document.activeElement) {
                input.value = st.line;
                input.hkSaved = st.line;
            }
        });
        paintMap(now.map || '');
        paintDay(now);
    };

    // ---------- The gestures ----------
    const changedText = (field) => field.value !== field.hkSaved;
    block.addEventListener('focusout', (e) => {
        const t = e.target;
        if (!t.matches || !changedText(t)) {
            return;
        }
        t.hkSaved = t.value;
        if (t.matches('[data-rc-contact-key]')) {
            send('contact', {key: t.getAttribute('data-rc-contact-key'), value: t.value}, t.closest('li'));
        } else if (t.matches('[data-rc-words]')) {
            send('words', {value: t.value}, t.parentNode);
        } else if (t.matches('[data-rc-stage]')) {
            send('stage', {key: t.getAttribute('data-rc-stage'), value: t.value}, t.closest('li'));
        } else if (t.matches('[data-rc-day-field]')) {
            const li = t.closest('[data-rc-moment]');
            const fields = {n: li.getAttribute('data-rc-moment')};
            fields[t.getAttribute('data-rc-day-field')] = t.value;
            send('day', fields, li);
        }
    });
    block.addEventListener('keydown', (e) => {
        // Enter keeps a line (not the long words: there, a new line).
        if (e.key === 'Enter' && e.target.matches('input[type="text"]')) {
            e.preventDefault();
            e.target.blur();
        }
    });
    block.addEventListener('change', (e) => {
        const t = e.target;
        if (t.matches('[data-rc-map-file]') && t.files && t.files[0]) {
            send('map', {file: t.files[0]}, block.querySelector('[data-rc-contact] .hkp-rc-lineas li'));
            t.value = '';
        } else if (t.matches('[data-rc-day-photo]') && t.files && t.files[0]) {
            const li = t.closest('[data-rc-moment]');
            send('dayphoto', {n: li.getAttribute('data-rc-moment'), file: t.files[0]}, li);
            t.value = '';
        }
    });
    block.addEventListener('click', (e) => {
        const t = e.target.closest('button');
        if (!t) {
            return;
        }
        const li = t.closest('[data-rc-moment]');
        if (t.matches('[data-rc-map-drop]')) {
            send('mapdrop', {}, block.querySelector('[data-rc-contact] .hkp-rc-lineas li'));
        } else if (t.matches('[data-rc-day-add]')) {
            send('day', {time: '', title: '', words: ''}, t.closest('li')).then((now) => {
                // The new moment, ready to be written: its title.
                const items = block.querySelectorAll('[data-rc-moment]');
                const last = items[items.length - 1];
                if (now && last) {
                    last.querySelector('[data-rc-day-field="title"]').focus();
                }
            });
        } else if (t.matches('[data-rc-day-move]') && li) {
            const items = Array.prototype.slice.call(block.querySelectorAll('[data-rc-moment]'));
            const to = items.indexOf(li) + Number(t.getAttribute('data-rc-day-move'));
            if (to >= 0 && to < items.length) {
                send('daymove', {n: li.getAttribute('data-rc-moment'), to: to}, li);
            }
        } else if (t.matches('[data-rc-day-drop]') && li) {
            send('daydrop', {n: li.getAttribute('data-rc-moment')}, li);
        }
    });
    icons();
    arrows();
})();
