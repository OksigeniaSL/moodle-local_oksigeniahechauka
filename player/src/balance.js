// Headlines in even lines (Chromium 56 has no «text-wrap: balance»): each word is measured and the breaks go where
// each line is closest to the same width, as <br>. Only headlines, never paragraphs; the box keeps its width. If the
// even breaks would add a line, it stays as it was. The art direction's «equilibrar» (Gaudí, 1 November 2026).

import {linesOf} from './lead.js';

/**
 * Where the breaks go for n even lines: after which words, by their widths and the width of a space.
 *
 * @param {number[]} widths each word's width
 * @param {number} space a space's width
 * @param {number} n how many lines
 * @returns {number[]} the index of the last word of each line but the last
 */
export function cutsFor(widths, space, n) {
    let total = 0;
    widths.forEach(function (w) {
        total += w;
    });
    total += space * (widths.length - 1);
    const cuts = [];
    let sum = 0;
    const goal = total / n;
    let k = 1;
    for (let i = 0; i < widths.length - 1 && k < n; i++) {
        sum += widths[i] + (i > 0 ? space : 0);
        const next = sum + space + widths[i + 1];
        if (Math.abs(next - goal * k) > Math.abs(sum - goal * k)) {
            cuts.push(i);
            k++;
        }
    }
    return cuts;
}

/**
 * Evens out a headline of two to four lines. Measured again from its words each time (its text is kept), so a
 * change of size (a step down, the letters arriving) can call it again.
 *
 * @param {HTMLElement} e
 */
export function even(e) {
    if (e.hkWords === undefined) {
        if (e.children.length) {
            return;
        }
        e.hkWords = e.textContent;
    }
    const text = e.hkWords;
    e.textContent = text;
    const n = linesOf(e);
    const words = text.split(' ');
    if (n < 2 || n > 4 || words.length < n + 1) {
        return;
    }
    const meter = document.createElement('span');
    meter.style.whiteSpace = 'nowrap';
    e.appendChild(meter);
    meter.textContent = 'a a';
    let space = meter.offsetWidth;
    meter.textContent = 'aa';
    space -= meter.offsetWidth;
    const widths = words.map(function (w) {
        meter.textContent = w;
        return meter.offsetWidth;
    });
    e.removeChild(meter);
    const cuts = cutsFor(widths, space, n);
    e.textContent = '';
    let line = [];
    words.forEach(function (w, j) {
        line.push(w);
        if (cuts.indexOf(j) !== -1) {
            e.appendChild(document.createTextNode(line.join(' ')));
            e.appendChild(document.createElement('br'));
            line = [];
        }
    });
    e.appendChild(document.createTextNode(line.join(' ')));
    if (linesOf(e) > n) {
        e.textContent = text;
    }
}
