// Hechauka: the page that adds or changes a piece of content (compose.mustache). As one types, it says «Cuándo» as a
// sentence and draws it on a strip of two weeks, says where it goes and on how many screens, and sends the draft to the
// screen beside it (the player itself, in preview mode: setDraft in player/src/main.js). Nothing is saved to preview.
// Plain script, no build: the pure pieces (dates, the sentence, the strip, the draft) are tested in player/test.

(function (root, factory) {
    'use strict';
    const pieces = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = pieces;
    } else {
        root.hkpCompose = pieces;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                pieces.start(document);
            });
        } else {
            pieces.start(document);
        }
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Dates, as «YYYY-MM-DD» --------------------------------------------------------------------------------------
    const parse = (d) => {
        const p = d.split('-').map(Number);
        return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    };
    const iso = (t) => t.toISOString().slice(0, 10);
    const addDays = (d, n) => {
        const t = parse(d);
        t.setUTCDate(t.getUTCDate() + n);
        return iso(t);
    };
    // 0 Monday … 6 Sunday.
    const weekday = (d) => (parse(d).getUTCDay() + 6) % 7;
    const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
    const isHour = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h || '');

    /** A string of the page with its values: {$a} or {$a->name}. */
    function fmt(text, a) {
        return String(text || '').replace(/\{\$a->(\w+)\}/g, function (m, k) {
            return a && a[k] !== undefined ? a[k] : '';
        }).replace(/\{\$a\}/g, a === undefined ? '' : a);
    }

    /** «lunes 2 de noviembre» and «martes 3». */
    function longDay(d, s) {
        const t = parse(d);
        return fmt(s.longday, {day: s.days[weekday(d)], n: t.getUTCDate(), month: s.months[t.getUTCMonth()]});
    }
    function shortDay(d, s) {
        return s.days[weekday(d)] + ' ' + parse(d).getUTCDate();
    }

    /** «a, b y c». */
    function join(list, s) {
        if (list.length < 2) {
            return list[0] || '';
        }
        return list.slice(0, -1).join(', ') + ' ' + s.and + ' ' + list[list.length - 1];
    }

    /**
     * The dates a shortcut of «Cuándo» means today: the same rule as compose::window() on the server.
     *
     * @param {object} st when, today, friday, from, to, eventDay
     * @returns {Array} [from or null, until or null]
     */
    function windowOf(st) {
        const today = st.today;
        switch (st.when) {
            case 'today':
                return [today, today];
            case 'friday':
                return [today, st.friday];
            case 'twoweeks':
                return [today, addDays(today, 13)];
            case 'always':
                return [null, null];
            case 'fromnow':
                return [today, null];
            case 'untilover':
                return isDate(st.eventDay) ? [today < st.eventDay ? today : st.eventDay, st.eventDay] : [today, null];
            case 'thatday':
                return isDate(st.eventDay) ? [st.eventDay, st.eventDay] : [today, today];
        }
        return [isDate(st.from) ? st.from : null, isDate(st.to) ? st.to : null];
    }

    /**
     * «Cuándo» said as a sentence: «Sale desde hoy hasta el viernes 6 de noviembre, de lunes a viernes, de 08:00 a
     * 10:30.»
     *
     * @param {object} st the state (windowOf's, and days 1–7, hours [[from, to]], every, eventTime)
     * @param {object} s the page's strings
     * @returns {string}
     */
    function sentence(st, s) {
        const w = windowOf(st);
        const from = w[0];
        const until = w[1];
        let out;
        if (st.when === 'untilover' && until) {
            out = fmt(s.s_untilover, {day: longDay(until, s), time: st.eventTime || ''});
        } else if (from === null && until === null) {
            out = s.s_always;
        } else if (from !== null && from === until) {
            out = from === st.today ? fmt(s.s_today, longDay(from, s)) : fmt(s.s_one, longDay(from, s));
        } else if (until === null) {
            out = from <= st.today ? s.s_always : fmt(s.s_from, longDay(from, s));
        } else if (from === null || from <= st.today) {
            out = fmt(s.s_until, longDay(until, s));
        } else {
            out = fmt(s.s_range, {from: shortDay(from, s), until: longDay(until, s)});
        }
        const single = from !== null && from === until;
        const days = (st.days || []).slice().sort();
        if (!single && days.length && days.length < 7) {
            if (days.join() === '1,2,3,4,5') {
                out += s.s_weekdays;
            } else {
                out += fmt(s.s_only, join(days.map(function (d) {
                    return d === 6 ? s.plural.saturday : (d === 7 ? s.plural.sunday : s.days[d - 1]);
                }), s));
            }
        }
        const hours = (st.hours || []).filter(function (r) {
            return isHour(r[0]) && isHour(r[1]);
        });
        if (hours.length === 1) {
            out += fmt(s.s_hours, {from: hours[0][0], to: hours[0][1]});
        } else if (hours.length > 1) {
            out += fmt(s.s_hours2, {from: hours[0][0], to: hours[0][1], from2: hours[1][0], to2: hours[1][1]});
        } else if (st.when !== 'untilover') {
            out += s.s_allday;
        }
        if (!single && st.every > 1) {
            out += fmt(s.s_every, st.every);
        }
        return out + '.';
    }

    /**
     * The strip: this week and the next, a cell per day, the days it shows filled.
     *
     * @param {object} st
     * @param {object} s
     * @returns {{cells: object[], more: boolean}}
     */
    function strip(st, s) {
        const w = windowOf(st);
        const monday = addDays(st.today, -weekday(st.today));
        const days = st.days && st.days.length ? st.days : [1, 2, 3, 4, 5, 6, 7];
        const cells = [];
        for (let k = 0; k < 14; k++) {
            const d = addDays(monday, k);
            const wd = weekday(d);
            const on = d >= st.today && (w[0] === null || d >= w[0]) && (w[1] === null || d <= w[1]) &&
                days.indexOf(wd + 1) >= 0 && !(st.every > 1 && k >= 7 && w[0] !== w[1]);
            cells.push({letter: s.letters[wd], n: parse(d).getUTCDate(), on, today: d === st.today, weekend: wd >= 5});
        }
        return {cells, more: w[1] === null};
    }

    /**
     * The draft as the contract gives an item, for the screen beside the form.
     *
     * @param {object} f the fields: type, title, body, important, caption, eventDay, eventFrom, eventTo, colour, media
     * @param {object} s
     * @returns {object|null}
     */
    function draftItem(f, s) {
        const title = (f.title || '').trim();
        const body = (f.body || '').trim();
        switch (f.type) {
            case 'notice':
                return {id: 'draft', type: 'notice', zone: 'side', title: title || s.draft_title, body,
                    tone: f.important ? 'important' : 'normal'};
            case 'ticker':
                return {id: 'draft', type: 'ticker', zone: 'ticker', text: title || s.draft_ticker};
            case 'event': {
                if (!isDate(f.eventDay)) {
                    return null;
                }
                const start = f.eventDay + 'T' + (isHour(f.eventFrom) ? f.eventFrom : '00:00');
                const item = {id: 'draft', type: 'event', zone: 'side', title: title || s.draft_title, start,
                    color: Number(f.colour) || 0, allday: !isHour(f.eventFrom)};
                if (isHour(f.eventTo) && f.eventTo > f.eventFrom) {
                    item.end = f.eventDay + 'T' + f.eventTo;
                }
                if (body) {
                    item.detail = body;
                }
                return item;
            }
            case 'media': {
                if (!f.media || !f.media.url) {
                    return null;
                }
                const item = {id: 'draft', type: f.media.video ? 'video' : 'image', zone: 'main', fit: 'cover',
                    media: {url: f.media.url, width: f.media.width || 0, height: f.media.height || 0}};
                if (f.caption && (title || body)) {
                    item.caption = {};
                    if (title) {
                        item.caption.title = title;
                    }
                    if (body) {
                        item.caption.text = body;
                    }
                }
                return item;
            }
        }
        return null;
    }

    // --- The page ------------------------------------------------------------------------------------------------------
    function start(doc) {
        const form = doc.querySelector('#hkp-compose-page form.hkp-compose');
        if (!form) {
            return;
        }
        const cfg = JSON.parse(form.getAttribute('data-config') || '{}');
        const s = cfg.strings;
        const q = (sel) => form.querySelector(sel);
        const qa = (sel) => Array.prototype.slice.call(form.querySelectorAll(sel));
        const value = (sel) => (q(sel) ? q(sel).value : '');
        const frame = q('#hkp-pv');
        let pv = cfg.screens.length ? cfg.screens[0].id : 0;
        let focus = 'main';
        let media = cfg.file ? {url: cfg.file.url, width: cfg.file.width, height: cfg.file.height, video: cfg.file.video,
            vertical: cfg.file.vertical} : null;
        let timer = null;

        const state = function () {
            const hours = q('#hkp-hours') && q('#hkp-hours').checked ? qa('[data-range]').filter(function (r) {
                return !r.hidden;
            }).map(function (r) {
                const n = r.getAttribute('data-range');
                return [value('#hkp-hf' + n), value('#hkp-ht' + n)];
            }) : [];
            const checked = q('input[name="when"]:checked');
            return {
                when: checked ? checked.value : 'always',
                today: cfg.today,
                friday: cfg.friday,
                from: value('#hkp-from'),
                to: value('#hkp-to'),
                eventDay: value('#hkp-eday'),
                eventTime: value('#hkp-et') || value('#hkp-ef'),
                days: qa('[data-day]').filter(function (b) {
                    return b.getAttribute('aria-pressed') === 'true';
                }).map(function (b) {
                    return Number(b.getAttribute('data-day'));
                }),
                hours,
                every: Number(value('#hkp-every') || 1),
            };
        };

        // Where it goes: the screens it reaches.
        const covered = function () {
            const all = q('input[data-where="all"]');
            if (all && all.checked) {
                return cfg.screens;
            }
            const ids = {};
            qa('input[data-where="group"]:checked').forEach(function (g) {
                (cfg.members[g.value] || []).forEach(function (id) {
                    ids[id] = true;
                });
            });
            qa('input[data-where="screen"]:checked').forEach(function (x) {
                ids[x.value] = true;
            });
            return cfg.screens.filter(function (x) {
                return ids[x.id];
            });
        };

        const draft = function () {
            const colour = q('input[name="colour"]:checked');
            return draftItem({
                type: cfg.type,
                title: value('#hkp-title'),
                body: value('#hkp-body'),
                important: q('#hkp-imp') && q('#hkp-imp').checked,
                caption: q('#hkp-cap') && q('#hkp-cap').checked,
                eventDay: value('#hkp-eday'),
                eventFrom: value('#hkp-ef'),
                eventTo: value('#hkp-et'),
                colour: colour ? colour.value : 0,
                media,
            }, s);
        };

        const send = function () {
            if (!frame || !frame.contentWindow || cfg.type === 'agenda') {
                return;
            }
            const item = draft();
            frame.contentWindow.postMessage({hkDraft: item ? {item, replaces: cfg.id ? 'i' + cfg.id : null,
                focus: cfg.type === 'event' ? 'week' : focus} : null}, location.origin);
        };

        const note = function () {
            const screen = cfg.screens.filter(function (x) {
                return x.id === pv;
            })[0];
            const name = screen ? screen.name : '';
            switch (cfg.type) {
                case 'notice':
                    return q('#hkp-imp') && q('#hkp-imp').checked ? s.note_important : fmt(s.note_notice, name);
                case 'media':
                    if (focus === 'full') {
                        return s.note_full;
                    }
                    return media && media.video ? s.note_video : (media && media.vertical ? s.note_vertical :
                        s.note_landscape);
                case 'ticker':
                    return s.note_ticker;
                case 'event':
                    return s.note_event;
            }
            return s.note_agenda;
        };

        const update = function () {
            const st = state();
            const text = q('#hkp-sentence-text');
            if (text) {
                text.textContent = sentence(st, s);
            }
            const stripNode = q('#hkp-strip');
            if (stripNode) {
                const r = strip(st, s);
                stripNode.textContent = '';
                r.cells.forEach(function (cell, k) {
                    if (k === 7) {
                        const gap = doc.createElement('span');
                        gap.className = 'hkp-strip-gap';
                        stripNode.appendChild(gap);
                    }
                    const span = doc.createElement('span');
                    span.className = [cell.on ? 'is-on' : '', cell.today ? 'is-today' : '', cell.weekend ? 'is-weekend' : '']
                        .filter(Boolean).join(' ');
                    const small = doc.createElement('small');
                    small.textContent = cell.letter;
                    const b = doc.createElement('b');
                    b.textContent = cell.n;
                    span.appendChild(small);
                    span.appendChild(b);
                    stripNode.appendChild(span);
                });
                if (r.more) {
                    const p = doc.createElement('p');
                    p.className = 'hkp-strip-more';
                    p.textContent = s.s_more;
                    stripNode.appendChild(p);
                }
            }
            // Where, and the main button.
            const list = covered();
            const hint = q('#hkp-where-hint');
            if (hint && !hint.querySelector('.text-danger')) {
                const all = q('input[data-where="all"]');
                hint.textContent = !list.length ? s.where_none : (all && all.checked ? fmt(s.where_all_n, list.length) :
                    (list.length === 1 ? fmt(s.where_one_screen, list[0].name) : fmt(s.where_some, {n: list.length,
                        names: join(list.map(function (x) {
                            return x.name;
                        }), s)})));
            }
            const publish = q('#hkp-publish');
            if (publish) {
                publish.textContent = cfg.type === 'agenda' ? s.publish_agenda : (list.length === 1 ? s.publish_one :
                    fmt(s.publish_n, list.length));
            }
            // The screens to look at: those it goes to.
            const shown = list.length ? list : cfg.screens;
            if (!shown.some(function (x) {
                return x.id === pv;
            }) && shown.length) {
                pv = shown[0].id;
                look();
            }
            const chips = q('#hkp-pv-screens');
            if (chips) {
                chips.textContent = '';
                shown.forEach(function (x) {
                    const b = doc.createElement('button');
                    b.type = 'button';
                    b.className = 'hkp-chip is-small';
                    b.setAttribute('aria-pressed', x.id === pv ? 'true' : 'false');
                    b.textContent = x.name;
                    b.addEventListener('click', function () {
                        pv = x.id;
                        look();
                        update();
                    });
                    chips.appendChild(b);
                });
            }
            const pvnote = q('#hkp-pv-note');
            if (pvnote) {
                pvnote.textContent = note();
            }
            // How long the title is, for reading it from afar.
            const len = q('#hkp-len');
            const title = q('#hkp-title');
            if (len && title && !title.classList.contains('is-invalid') && cfg.type !== 'agenda') {
                const long = title.value.length > cfg.short;
                len.className = 'hkp-hint' + (long ? ' is-warn' : '');
                len.textContent = long ? s.len_long : s.len_ok;
            }
            clearTimeout(timer);
            timer = setTimeout(send, 120);
        };

        // The screen beside it: the one chosen, in its shape.
        const look = function () {
            const screen = cfg.screens.filter(function (x) {
                return x.id === pv;
            })[0];
            if (!frame || !screen) {
                return;
            }
            const bezel = frame.parentNode;
            bezel.classList.toggle('is-v', screen.shape === 'v');
            const src = cfg.preview + '&screen=' + screen.id;
            if (frame.getAttribute('src') !== src) {
                frame.setAttribute('src', src);
            }
        };

        window.addEventListener('message', function (ev) {
            if (ev.origin === location.origin && ev.data && ev.data.hkPreviewReady && ev.source === frame.contentWindow) {
                send();
            }
        });

        // The moments of the preview: a notice beside a picture or «Today» big; a picture with «Today» or full.
        const tools = q('#hkp-pv-tools');
        const modes = {notice: [['main', s.mode_photo], ['today', s.mode_today]], media: [['main', s.mode_withtoday],
            ['full', s.mode_full]]}[cfg.type];
        if (tools && modes) {
            const seg = doc.createElement('div');
            seg.className = 'hkp-seg';
            seg.setAttribute('role', 'group');
            modes.forEach(function (m) {
                const b = doc.createElement('button');
                b.type = 'button';
                b.textContent = m[1];
                b.setAttribute('aria-pressed', m[0] === focus ? 'true' : 'false');
                b.addEventListener('click', function () {
                    focus = m[0];
                    Array.prototype.forEach.call(seg.children, function (x) {
                        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
                    });
                    update();
                });
                seg.appendChild(b);
            });
            tools.appendChild(seg);
        }

        // The type: another kind of content is another page, and what was written goes with it (a notice that turns out
        // to be an event is not written twice).
        const CARRY = 'hkp-compose-carry';
        qa('input[name="kind"]').forEach(function (r) {
            r.addEventListener('change', function () {
                const keep = {title: value('#hkp-title'), body: value('#hkp-body'), from: value('#hkp-from'),
                    to: value('#hkp-to'), every: value('#hkp-every'), when: (q('input[name="when"]:checked') || {}).value,
                    days: state().days, hours: q('#hkp-hours') && q('#hkp-hours').checked,
                    hf0: value('#hkp-hf0'), ht0: value('#hkp-ht0'),
                    where: qa('input[data-where]').filter(function (x) {
                        return x.checked;
                    }).map(function (x) {
                        return x.name + '=' + x.value;
                    })};
                try {
                    window.sessionStorage.setItem(CARRY, JSON.stringify(keep));
                } catch (e) {
                    // Without storage, the new type starts empty.
                }
                location.href = r.getAttribute('data-url');
            });
        });
        let carried = null;
        try {
            carried = JSON.parse(window.sessionStorage.getItem(CARRY) || 'null');
            window.sessionStorage.removeItem(CARRY);
        } catch (e) {
            carried = null;
        }
        if (carried && !cfg.id) {
            const put = function (sel, v) {
                if (q(sel) && v !== undefined && v !== null && v !== '') {
                    q(sel).value = v;
                }
            };
            put('#hkp-title', carried.title);
            put('#hkp-body', carried.body);
            put('#hkp-from', carried.from);
            put('#hkp-to', carried.to);
            put('#hkp-every', carried.every);
            put('#hkp-hf0', carried.hf0);
            put('#hkp-ht0', carried.ht0);
            const when = carried.when && q('input[name="when"][value="' + carried.when + '"]');
            if (when) {
                when.checked = true;
                q('#hkp-dates').hidden = carried.when !== 'dates';
            }
            if (carried.days && carried.days.length) {
                qa('[data-day]').forEach(function (b) {
                    b.setAttribute('aria-pressed', carried.days.indexOf(Number(b.getAttribute('data-day'))) >= 0 ?
                        'true' : 'false');
                });
                const box = q('#hkp-days-inputs');
                box.textContent = '';
                carried.days.forEach(function (d) {
                    const input = doc.createElement('input');
                    input.type = 'hidden';
                    input.name = 'days[]';
                    input.value = d;
                    box.appendChild(input);
                });
            }
            if (q('#hkp-hours') && carried.hours) {
                q('#hkp-hours').checked = true;
                q('#hkp-hours-rows').hidden = false;
            }
            if (carried.where && carried.where.length) {
                qa('input[data-where]').forEach(function (x) {
                    x.checked = carried.where.indexOf(x.name + '=' + x.value) >= 0;
                });
            }
        }
        // When.
        qa('input[name="when"]').forEach(function (r) {
            r.addEventListener('change', function () {
                q('#hkp-dates').hidden = r.value !== 'dates' || !r.checked;
                update();
            });
        });
        qa('[data-day]').forEach(function (b) {
            b.addEventListener('click', function () {
                const on = b.getAttribute('aria-pressed') !== 'true';
                const pressed = qa('[data-day][aria-pressed="true"]');
                if (!on && pressed.length === 1) {
                    return;
                }
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
                const box = q('#hkp-days-inputs');
                box.textContent = '';
                qa('[data-day][aria-pressed="true"]').forEach(function (x) {
                    const input = doc.createElement('input');
                    input.type = 'hidden';
                    input.name = 'days[]';
                    input.value = x.getAttribute('data-day');
                    box.appendChild(input);
                });
                update();
            });
        });
        const hours = q('#hkp-hours');
        if (hours) {
            hours.addEventListener('change', function () {
                q('#hkp-hours-rows').hidden = !hours.checked;
                update();
            });
        }
        const more = q('#hkp-more-hours');
        if (more) {
            more.hidden = !q('[data-range="1"]').hidden;
            more.addEventListener('click', function () {
                q('[data-range="1"]').hidden = false;
                more.hidden = true;
                update();
            });
        }
        // Where: «Todas las pantallas» goes alone.
        qa('input[data-where]').forEach(function (x) {
            x.addEventListener('change', function () {
                if (x.checked && x.getAttribute('data-where') === 'all') {
                    qa('input[data-where="group"], input[data-where="screen"]').forEach(function (y) {
                        y.checked = false;
                    });
                } else if (x.checked) {
                    const all = q('input[data-where="all"]');
                    if (all) {
                        all.checked = false;
                    }
                }
                update();
            });
        });
        const pick = q('#hkp-pick-screens');
        if (pick) {
            pick.addEventListener('click', function () {
                const box = q('#hkp-screen-chips');
                box.hidden = !box.hidden;
                pick.setAttribute('aria-expanded', box.hidden ? 'false' : 'true');
            });
        }
        // The file: shown at once, before it is sent.
        const file = q('#hkp-file');
        if (file) {
            file.addEventListener('change', function () {
                const f = file.files && file.files[0];
                if (!f) {
                    return;
                }
                const url = URL.createObjectURL(f);
                const video = f.type.indexOf('video/') === 0;
                q('#hkp-file-name').textContent = f.name;
                const thumb = q('#hkp-file-thumb');
                const done = function (w, h) {
                    media = {url, width: w, height: h, video, vertical: h > w};
                    thumb.classList.toggle('is-v', h > w);
                    q('#hkp-file-about').textContent = w && h ? w + ' × ' + h : '';
                    update();
                };
                thumb.textContent = '';
                if (video) {
                    const v = doc.createElement('video');
                    v.muted = true;
                    v.preload = 'metadata';
                    v.src = url;
                    v.addEventListener('loadedmetadata', function () {
                        done(v.videoWidth, v.videoHeight);
                    });
                    thumb.appendChild(v);
                } else {
                    const img = doc.createElement('img');
                    img.alt = '';
                    img.addEventListener('load', function () {
                        done(img.naturalWidth, img.naturalHeight);
                    });
                    img.src = url;
                    thumb.appendChild(img);
                }
            });
        }
        form.addEventListener('input', update);
        form.addEventListener('change', update);
        look();
        update();
    }

    return {addDays, weekday, windowOf, sentence, strip, draftItem, fmt, start};
});
