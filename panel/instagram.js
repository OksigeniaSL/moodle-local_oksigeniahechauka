// Hechauka: «Las cuentas de Instagram» in «Tu centro» (centre_instagram.mustache, the block #hkp-ig). One card per account
// the key reaches. What comes out of it (no sale, todo, solo lo del centro), its words, and where (every screen, or the
// screens of some groups) save by themselves with each gesture: a POST to the block's address with the account, its show,
// its words (separated by commas) and its groups (none for every screen), answered {ok, message}. A line under the card
// says it; if the save fails, the card goes back to how it was and says why. Turning «every screen» off waits for a
// group before saving: with none it would show nowhere.
(function () {
    'use strict';
    const block = document.getElementById('hkp-ig');
    if (!block) {
        return;
    }
    const save = block.getAttribute('data-save');
    const sesskey = block.getAttribute('data-sesskey') || (window.M && M.cfg && M.cfg.sesskey) || '';
    const said = {
        saving: block.getAttribute('data-saving'), saved: block.getAttribute('data-saved'), error: block.getAttribute('data-error'),
        pick: block.getAttribute('data-pick'), add: block.getAttribute('data-wordadd'), remove: block.getAttribute('data-wordremove'),
    };
    const X = '<svg class="hkp-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
        'aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg>';

    block.querySelectorAll('.hkp-ig-cuenta').forEach((card) => {
        const line = card.querySelector('.hkp-ig-estado');
        const box = card.querySelector('.hkp-ig-words');
        const plus = box.querySelector('[data-word-add]');
        const every = card.querySelector('[data-all]');
        const chips = card.querySelector('.hkp-ig-grupos');
        const foto = card.querySelector('.hkp-ig-foto');
        if (!foto.querySelector('img')) {
            // No picture: the account's first letter, on Instagram's ring.
            foto.textContent = (card.getAttribute('data-username') || '?').charAt(0).toUpperCase();
        }

        const say = (text, kind) => {
            clearTimeout(line.hkTimer);
            line.textContent = text || '';
            line.setAttribute('data-kind', kind || '');
            if (text && kind === 'ok') {
                line.hkTimer = setTimeout(() => {
                    line.textContent = '';
                }, 2400);
            }
        };
        const words = () => Array.prototype.map.call(box.querySelectorAll('.hkp-word'), (w) => w.firstChild.textContent);
        const groups = () => Array.prototype.map.call(chips.querySelectorAll('[aria-pressed="true"]'), (c) => c.getAttribute('data-group'));
        const state = () => ({show: card.getAttribute('data-show'), words: words(), all: every.checked, groups: groups()});

        const pill = (word) => {
            const span = document.createElement('span');
            span.className = 'hkp-word';
            span.appendChild(document.createTextNode(word));
            const x = document.createElement('button');
            x.type = 'button';
            x.setAttribute('aria-label', (said.remove || '').replace('%s', word));
            x.innerHTML = X;
            x.addEventListener('click', () => {
                span.remove();
                keep();
            });
            span.appendChild(x);
            return span;
        };
        const paint = (s) => {
            card.setAttribute('data-show', s.show);
            card.querySelectorAll('.hkp-ig-modo [data-show]').forEach((b) => {
                b.setAttribute('aria-checked', b.getAttribute('data-show') === s.show ? 'true' : 'false');
            });
            box.querySelectorAll('.hkp-word').forEach((w) => w.remove());
            s.words.forEach((w) => box.insertBefore(pill(w), plus));
            every.checked = s.all;
            chips.hidden = s.all;
            chips.querySelectorAll('[data-group]').forEach((c) => {
                c.setAttribute('aria-pressed', s.groups.indexOf(c.getAttribute('data-group')) >= 0 ? 'true' : 'false');
            });
        };

        let saved = {show: card.getAttribute('data-show'), words: (box.getAttribute('data-words') || '').split(',').map((w) => w.trim())
            .filter(Boolean), all: every.checked, groups: groups()};
        paint(saved);

        const keep = () => {
            const now = state();
            if (!now.all && !now.groups.length) {
                say(said.pick, 'busy');
                return;
            }
            const body = new FormData();
            body.append('sesskey', sesskey);
            body.append('account', card.getAttribute('data-account'));
            body.append('show', now.show);
            body.append('words', now.words.join(', '));
            if (!now.all) {
                now.groups.forEach((g) => body.append('groups[]', g));
            }
            card.classList.add('is-saving');
            say(said.saving, 'busy');
            fetch(save, {method: 'POST', body, credentials: 'same-origin'})
                .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
                .then((answer) => {
                    if (!answer || !answer.ok) {
                        return Promise.reject(new Error((answer && answer.message) || ''));
                    }
                    saved = now;
                    say(answer.message || said.saved, 'ok');
                    return answer;
                })
                .catch((e) => {
                    // As it was, and why.
                    paint(saved);
                    say((e && e.message && !/^\d+$/.test(e.message)) ? e.message : said.error, 'bad');
                })
                .finally(() => card.classList.remove('is-saving'));
        };

        card.querySelectorAll('.hkp-ig-modo [data-show]').forEach((b) => {
            b.addEventListener('click', () => {
                if (card.getAttribute('data-show') === b.getAttribute('data-show')) {
                    return;
                }
                paint(Object.assign(state(), {show: b.getAttribute('data-show')}));
                keep();
            });
        });
        every.addEventListener('change', () => {
            chips.hidden = every.checked;
            keep();
        });
        chips.querySelectorAll('[data-group]').forEach((c) => {
            c.addEventListener('click', () => {
                c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
                keep();
            });
        });
        // A word, as the categories' key words: «+ palabra», then Enter or a comma; Escape leaves it.
        plus.addEventListener('click', () => {
            const field = document.createElement('input');
            field.className = 'hkp-word-input';
            field.setAttribute('aria-label', said.add || '');
            plus.hidden = true;
            box.insertBefore(field, plus);
            field.focus();
            let finished = false;
            const done = (add) => {
                if (finished) {
                    return;
                }
                finished = true;
                const word = field.value.trim();
                field.remove();
                plus.hidden = false;
                if (add && word && words().indexOf(word) < 0) {
                    box.insertBefore(pill(word), plus);
                    keep();
                }
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
    });
})();
