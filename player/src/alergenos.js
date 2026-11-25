// An allergen of a dish (or one of the marks some diets leave out: meat, pork, beef) on the screen: its drawing on a white disc
// (alergenos.css); its name, where the screen has no drawing for it. Never an empty disc: it would say something and not what.

const DRAWN = ['celery', 'crustaceans', 'eggs', 'fish', 'gluten', 'lupin', 'milk', 'molluscs', 'mustard', 'nuts', 'peanuts',
    'sesame', 'soy', 'sulphites', 'meat', 'pork', 'beef'];

/** Whether there is a drawing for it. */
export function drawn(code) {
    return DRAWN.indexOf(code) !== -1;
}

/**
 * @param {string} code
 * @param {object} [names] code => name
 * @returns {HTMLElement}
 */
export function allergenNode(code, names) {
    const n = document.createElement(drawn(code) ? 'i' : 'span');
    if (drawn(code)) {
        n.className = 'hk-alergeno hk-alergeno-' + code;
    } else {
        n.className = 'hk-alergeno-nombre';
        n.textContent = (names && names[code]) || code;
    }
    return n;
}
