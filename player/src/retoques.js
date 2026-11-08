// Design retouches of the slides redone with the movement that need the page (Gaudí, 8 November 2026): the counterpart in
// script of retoques.css. render.js calls them where LEEME.md says.

import {even} from './balance.js';

/** The lines of a headline as the page lays them out, each a list of its words (measured with a range on each word). */
export function linesOfWords(headline) {
    const lines = [];
    let top = null;
    const range = document.createRange();
    const walk = function (node) {
        for (let i = 0; i < node.childNodes.length; i++) {
            const n = node.childNodes[i];
            if (n.nodeType === 1) {
                walk(n);
                continue;
            }
            if (n.nodeType !== 3) {
                continue;
            }
            const re = /\S+/g;
            let m = re.exec(n.textContent);
            while (m) {
                range.setStart(n, m.index);
                range.setEnd(n, m.index + m[0].length);
                const y = Math.round(range.getBoundingClientRect().top);
                if (top === null || Math.abs(y - top) > 4) {
                    lines.push([]);
                    top = y;
                }
                lines[lines.length - 1].push(m[0]);
                m = re.exec(n.textContent);
            }
        }
    };
    walk(headline);
    return lines;
}

/** Whether a headline has a line of a single short word: «Teatro / en / inglés». */
export function hasLoneShortWord(headline) {
    if (!headline) {
        return false;
    }
    const lines = linesOfWords(headline);
    return lines.length > 1 && lines.some(function (l) {
        return l.length === 1 && l[0].length <= 3;
    });
}

/**
 * A lead's headline never leaves a short word alone in a line: one step smaller and balanced again, while there are steps
 * (the lead's data-ajuste, 0 to 3). From afar a line «en» reads as a word of its own.
 *
 * @param {HTMLElement|null} lead the .hk-lider
 */
export function noLoneShortWord(lead) {
    const t = lead && lead.querySelector('.hk-lider-titular');
    if (!t || !hasLoneShortWord(t)) {
        return;
    }
    const last = lead.hkSteps || 3;
    let step = parseInt(lead.getAttribute('data-ajuste'), 10) || 0;
    const was = step;
    while (hasLoneShortWord(t) && step < last) {
        step++;
        lead.setAttribute('data-ajuste', String(step));
        even(t);
    }
    if (hasLoneShortWord(t)) {
        lead.setAttribute('data-ajuste', String(was));
        even(t);
    }
}
