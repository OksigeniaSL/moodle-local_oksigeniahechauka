// The QR of a web, for the showcase: the modules of the code as one SVG path, so it stays sharp at any size and needs
// no network. The code is made by qrcode-generator (Kazuhiko Arase, MIT).

import qrcode from 'qrcode-generator';

/**
 * The modules of the QR of a text: its size and an SVG path of its dark modules (runs of a row joined), with no quiet
 * zone (the frame around it gives the margin).
 *
 * @param {string} text
 * @returns {{size: number, d: string}}
 */
export function qrPath(text) {
    const q = qrcode(0, 'M');
    if (q.stringToBytesFuncs && q.stringToBytesFuncs['UTF-8']) {
        q.stringToBytes = q.stringToBytesFuncs['UTF-8'];
    }
    q.addData(String(text));
    q.make();
    const size = q.getModuleCount();
    let d = '';
    for (let r = 0; r < size; r++) {
        let c = 0;
        while (c < size) {
            if (!q.isDark(r, c)) {
                c++;
                continue;
            }
            const start = c;
            while (c < size && q.isDark(r, c)) {
                c++;
            }
            d += 'M' + start + ' ' + r + 'h' + (c - start) + 'v1h-' + (c - start) + 'z';
        }
    }
    return {size, d};
}

/**
 * A web as people read it under its QR: without «https://», «www.» or a slash at the end.
 *
 * @param {string} url
 * @returns {string}
 */
export function shortWeb(url) {
    return String(url || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}
