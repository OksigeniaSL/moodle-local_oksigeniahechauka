// A new screen: a big code and a QR code, until someone gives it a name on the server. Then the key arrives and the
// screen starts. A code lasts a few minutes; when it expires, the screen asks again with the token it had and keeps its
// code (and its short link) while it waits.

import {HECHAUKA_EMBLEM, qrSvg} from './qr.js';

const SVGNS = 'http://www.w3.org/2000/svg';

// Hechauka's emblem, drawn as a picture (the first thing a centre sees when it plugs a screen in).
function emblem() {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', HECHAUKA_EMBLEM.box);
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = HECHAUKA_EMBLEM.svg;
    return s;
}

// The address to type, breaking after its slashes when it does not fit (a long one went out of a vertical screen).
function address(tag, where) {
    const a = document.createElement(tag);
    a.className = 'hk-emparejar-url';
    const parts = where.split('/');
    parts.forEach(function (part, i) {
        a.appendChild(document.createTextNode(part + (i < parts.length - 1 ? '/' : '')));
        if (i < parts.length - 1) {
            a.appendChild(document.createElement('wbr'));
        }
    });
    return a;
}

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) {
        e.className = cls;
    }
    if (text) {
        e.textContent = text;
    }
    return e;
}

/**
 * @param {HTMLElement} root
 * @param {object} api the contract calls
 * @param {object} strings texts of the site
 * @returns {Promise<string>} the key of the screen
 */
export function pair(root, api, strings) {
    const s = strings || {};
    return new Promise(function (resolve) {
        let timer = null;

        function device() {
            return {
                ua: navigator.userAgent,
                width: window.screen ? window.screen.width : window.innerWidth,
                height: window.screen ? window.screen.height : window.innerHeight,
                viewport: {width: window.innerWidth, height: window.innerHeight},
                dpr: window.devicePixelRatio || 1,
            };
        }

        function show(code, qr, url, image) {
            while (root.firstChild) {
                root.removeChild(root.firstChild);
            }
            const box = el('div', 'hk-emparejar');
            const text = el('div', 'hk-emparejar-texto');
            // Hechauka's own: its emblem and its name over the title (the review of 21 November 2026: it looked like a
            // mock-up). Then the two ways, said as two ways of one step, the next step, and that the screen is waiting.
            const brand = el('p', 'hk-emparejar-marca');
            brand.appendChild(emblem());
            brand.appendChild(el('span', '', 'Hechauka'));
            text.appendChild(brand);
            text.appendChild(el('h1', '', s.pair_title || 'New screen'));
            const pretty = code ? code.slice(0, 3) + ' ' + code.slice(3) : '···';
            const where = url ? url.replace(/^https?:\/\//, '').split('?')[0] : '';
            if (s.pair_scan && s.pair_type && s.pair_name) {
                box.classList.add('hk-emparejar-pasos');
                const one = el('div', 'hk-emparejar-paso');
                one.appendChild(el('b', 'hk-emparejar-n', '1'));
                const oneText = el('div', 'hk-emparejar-paso-texto');
                oneText.appendChild(el('p', 'hk-emparejar-escanea', s.pair_scan));
                if (where) {
                    const typed = el('p', 'hk-emparejar-teclea');
                    typed.appendChild(document.createTextNode(s.pair_type.replace('{url}', '') + ' '));
                    typed.appendChild(address('b', where));
                    oneText.appendChild(typed);
                }
                const c = el('p', 'hk-emparejar-codigo');
                c.textContent = pretty;
                oneText.appendChild(c);
                one.appendChild(oneText);
                text.appendChild(one);
                const two = el('div', 'hk-emparejar-paso');
                two.appendChild(el('b', 'hk-emparejar-n', '2'));
                two.appendChild(el('p', 'hk-emparejar-nombra', s.pair_name));
                text.appendChild(two);
                const wait = el('p', 'hk-emparejar-espera');
                wait.appendChild(el('i', ''));
                wait.appendChild(document.createTextNode(s.pair_waiting || ''));
                text.appendChild(wait);
            } else {
                // A server before these strings: the sentence it has.
                text.appendChild(el('p', 'hk-emparejar-lead', s.pair_steps || ''));
                const c = el('p', 'hk-emparejar-codigo');
                c.textContent = pretty;
                text.appendChild(c);
                if (where) {
                    text.appendChild(address('p', where));
                }
            }
            box.appendChild(text);
            if (image) {
                // The QR the site's link shortener draws, as a picture: nothing in it runs.
                const q = el('div', 'hk-emparejar-qr');
                const img = el('img');
                img.alt = '';
                img.src = image;
                q.appendChild(img);
                box.appendChild(q);
            } else {
                let markup = '';
                try {
                    // Drawn here, as every QR of the player; with Hechauka's mark when the address is short enough.
                    markup = url ? qrSvg(url, {emblem: HECHAUKA_EMBLEM}) : '';
                } catch (e) {
                    markup = '';
                }
                // The server's own SVG, if the address does not fit (older servers send only that).
                markup = markup || qr;
                if (markup) {
                    const q = el('div', 'hk-emparejar-qr');
                    q.innerHTML = markup;
                    box.appendChild(q);
                }
            }
            root.appendChild(box);
        }

        function offline() {
            show('', '', '');
            const say = root.querySelector('.hk-emparejar-espera') || root.querySelector('.hk-emparejar-lead');
            if (say) {
                say.textContent = s.offline || 'No connection. Trying again…';
            }
            timer = setTimeout(start, 15000);
        }

        let last = '';

        function start() {
            api.pair(device(), last).then(function (p) {
                last = p.token || '';
                show(p.code, p.qr_svg, p.claim_url, p.qr_image || '');
                // How long the code lasts, in seconds from now: a device with its clock wrong still waits the
                // whole time (servers before expires_in only gave the moment).
                const left = p.expires_in > 0 ? p.expires_in : (p.expires || 0) - Math.floor(Date.now() / 1000);
                const until = Date.now() + Math.max(60, left) * 1000;
                const every = Math.max(2, p.poll || 5) * 1000;
                function poll() {
                    if (Date.now() > until) {
                        start();
                        return;
                    }
                    api.poll(p.token).then(function (r) {
                        if (r.status === 'paired' && r.key) {
                            clearTimeout(timer);
                            resolve(r.key);
                        } else if (r.status === 'expired') {
                            start();
                        } else {
                            timer = setTimeout(poll, every);
                        }
                    }, function () {
                        timer = setTimeout(poll, every * 2);
                    });
                }
                timer = setTimeout(poll, every);
            }, offline);
        }

        start();
    });
}
