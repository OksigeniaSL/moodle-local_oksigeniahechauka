// Hechauka: «Empezar» (start.mustache). What is touched is saved at once and the step says so; the weather of the place shows its
// icon; and on a phone the screen goes in a band under the bar of the site, as in «Tu centro».
(function () {
    'use strict';
    const page = document.getElementById('hkp-start-page');
    if (!page) {
        return;
    }
    if (window.HK_TIEMPO) {
        page.querySelectorAll('[data-hk-sky]').forEach((node) => {
            node.innerHTML = window.HK_TIEMPO.svg(node.getAttribute('data-hk-sky')) || '';
        });
    }
    const form = document.getElementById('hkp-start-form');
    const frame = document.getElementById('hkp-cpv');
    // A centre just installed has nothing yet: the screen beside it stands on samples, as in «Tu centro», never on an empty page.
    const words = JSON.parse(page.getAttribute('data-strings') || '{}');
    const samples = () => {
        const s = words.samples || {};
        const items = (s.events || []).map((e, i) => ({id: 'sample-e' + i, type: 'event', zone: 'side', title: e.title,
            detail: e.detail, start: words.today + 'T' + e.hour, color: e.color}));
        if (s.ticker) {
            items.push({id: 'sample-t', type: 'ticker', zone: 'ticker', text: s.ticker});
        }
        items.push({id: 'sample-i', type: 'notice', zone: 'side', title: (s.important || {}).title || '',
            body: (s.important || {}).body || '', tone: 'important'});
        items.push({id: 'sample-s', type: 'notice', zone: 'side', title: (s.second || {}).title || '',
            body: (s.second || {}).body || '', tone: 'normal'});
        return {item: {id: 'sample-n', type: 'notice', zone: 'side', title: (s.notice || {}).title || '',
            body: (s.notice || {}).body || '', tone: 'normal'}, items, focus: 'today'};
    };
    window.addEventListener('message', (ev) => {
        if (ev.origin === location.origin && ev.data && ev.data.hkPreviewReady && frame && ev.source === frame.contentWindow) {
            frame.contentWindow.postMessage({hkDraft: samples()}, location.origin);
        }
    });
    const saved = page.querySelector('#hkp-start-saved');
    const mark = (step, done, words) => {
        const state = page.querySelector('[data-step="' + step + '"]');
        if (state) {
            state.setAttribute('data-done', done ? '1' : '0');
            state.textContent = done ? words.done : words.todo;
        }
    };
    if (form) {
        // Without a script the button is there; with one, there is nothing to press.
        form.querySelectorAll('[data-without-script]').forEach((node) => {
            node.hidden = true;
        });
        form.addEventListener('change', () => {
            const data = new FormData(form);
            data.append('touched', '1');
            fetch(form.action, {method: 'POST', body: data, credentials: 'same-origin'}).then((res) => res.json()).then((now) => {
                mark('kind', now.kind, now);
                mark('sources', now.sources, now);
                const ask = page.querySelector('#hkp-st-cats-box');
                if (ask && now.hascategories) {
                    ask.hidden = true;
                }
                saved.hidden = false;
                if (frame) {
                    // The screen beside it, with what has just changed.
                    frame.setAttribute('src', frame.getAttribute('src'));
                }
            }).catch(() => {
                // Nothing saved: the button comes back, and it is said by pressing it.
                form.querySelectorAll('[data-without-script]').forEach((node) => {
                    node.hidden = false;
                });
            });
        });
    }
    const preview = page.querySelector('.hkp-preview');
    const steps = page.querySelector('.hkp-centre-form');
    if (window.IntersectionObserver && preview && steps) {
        const narrow = () => page.offsetWidth < 60 * parseFloat(getComputedStyle(document.documentElement).fontSize);
        new IntersectionObserver((seen) => {
            const on = seen[seen.length - 1].isIntersecting && narrow();
            page.classList.toggle('hkp-with-band', on);
            if (on && preview.getBoundingClientRect().top > 200) {
                page.classList.remove('hkp-with-band');
            }
        }, {rootMargin: '-200px 0px 0px 0px'}).observe(steps);
    }
})();
