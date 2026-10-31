// A new screen: a big code and a QR code, until someone gives it a name on the server. Then the key arrives and the
// screen starts. A code lasts a few minutes; when it expires, a new one comes.

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

        function show(code, qr, url) {
            while (root.firstChild) {
                root.removeChild(root.firstChild);
            }
            const box = el('div', 'hk-emparejar');
            const text = el('div', 'hk-emparejar-texto');
            text.appendChild(el('h1', '', s.pair_title || 'New screen'));
            text.appendChild(el('p', '', s.pair_steps || ''));
            const c = el('p', 'hk-emparejar-codigo');
            c.textContent = code ? code.slice(0, 3) + ' ' + code.slice(3) : '···';
            text.appendChild(c);
            if (url) {
                text.appendChild(el('p', 'hk-emparejar-url', url.replace(/^https?:\/\//, '').split('?')[0]));
            }
            box.appendChild(text);
            if (qr) {
                const q = el('div', 'hk-emparejar-qr');
                // The QR comes from the server of this screen as SVG markup.
                q.innerHTML = qr;
                box.appendChild(q);
            }
            root.appendChild(box);
        }

        function offline() {
            show('', '', '');
            root.querySelector('.hk-emparejar-texto p').textContent = s.offline || 'No connection. Trying again…';
            timer = setTimeout(start, 15000);
        }

        function start() {
            api.pair(device()).then(function (p) {
                show(p.code, p.qr_svg, p.claim_url);
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
