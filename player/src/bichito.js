// The little creature of a name, always the same for the same name: the face of a birthday without a photo, or whose photo
// does not arrive. Drawn by the art director in the family of the Surprises (bichito-hechauka.js, 7 November 2026), on the
// engine of Oksigenia's other products (xmur3 → mulberry32 → an SVG of parts). With its own soft disc behind, so the
// contrast is right on any skin; a deep one in the dark theme.

// The art director's file is plain ES5 and leaves BichitoHk on the page (self), as in the other products.
import './bichito-hechauka.js';

/**
 * The creature of a name, as SVG markup.
 *
 * @param {string} name
 * @param {boolean} [dark] the dark theme
 * @returns {string}
 */
export function bichito(name, dark) {
    // In a browser, the page; in Node (the tests), the global object.
    const scope = typeof self !== 'undefined' ? self : Function('return this')();
    return scope.BichitoHk.svg(name, {bg: true, dark: !!dark});
}
