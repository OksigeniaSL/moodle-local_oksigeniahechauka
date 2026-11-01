// Headlines in two even lines (Chromium 56 has no «text-wrap: balance»): a headline that takes two lines is cut where
// both come out most alike, with a line break between words. Its box keeps its width; only the break moves.

/**
 * Where to cut a list of words in two lines most alike: the index of the first word of the second line, or -1 when
 * it does not fit in two lines.
 *
 * @param {string[]} words
 * @param {function(string): number} widthOf the width of a text, in the headline's letters
 * @param {number} max the width of the headline's box
 * @returns {number}
 */
export function bestSplit(words, widthOf, max) {
    let best = -1;
    let bestWidth = Infinity;
    for (let k = 1; k < words.length; k++) {
        const a = widthOf(words.slice(0, k).join(' '));
        const b = widthOf(words.slice(k).join(' '));
        const wide = Math.max(a, b);
        if (a <= max && b <= max && wide < bestWidth) {
            best = k;
            bestWidth = wide;
        }
    }
    return best;
}

let canvas = null;

// How many lines a headline's text takes now.
function lines(node) {
    if (!document.createRange) {
        return 1;
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    const tops = {};
    let n = 0;
    for (let i = 0; i < rects.length; i++) {
        const top = Math.round(rects[i].top);
        if (rects[i].width > 0 && !tops[top]) {
            tops[top] = true;
            n++;
        }
    }
    return n;
}

/**
 * Evens out one headline in two lines. Text only; measured again from its words each time, so a change of size
 * (fitting «Today», the letters arriving) can call it again.
 *
 * @param {HTMLElement} node
 */
export function balance(node) {
    let text = node.hkWords;
    if (text === undefined) {
        if (node.children.length) {
            return;
        }
        text = node.textContent;
        node.hkWords = text;
    }
    node.textContent = text;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 3 || lines(node) !== 2) {
        return;
    }
    const style = window.getComputedStyle(node);
    canvas = canvas || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ');
    const max = node.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
    // A hair of room: the canvas does not count the letters' spacing.
    const k = bestSplit(words, function (t) {
        return ctx.measureText(t).width * 1.02;
    }, max);
    if (k <= 0) {
        return;
    }
    node.textContent = '';
    node.appendChild(document.createTextNode(words.slice(0, k).join(' ')));
    node.appendChild(document.createElement('br'));
    node.appendChild(document.createTextNode(words.slice(k).join(' ')));
}

/** The headlines of a part of the screen: captions, the showcase, the notices. */
export function balanceIn(root) {
    if (!root || !root.querySelectorAll) {
        return;
    }
    const heads = root.querySelectorAll('.hk-pie h2, .hk-aviso h3');
    for (let i = 0; i < heads.length; i++) {
        balance(heads[i]);
    }
}
