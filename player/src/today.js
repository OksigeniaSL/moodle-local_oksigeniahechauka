// What is left of the first «Today» (0.6): the colour of an event's category, the weather of a day, and how many
// things «Today» has. What leads and the rest are in lead.js since 0.7.0.


function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) {
        e.className = cls;
    }
    if (text !== undefined && text !== null) {
        e.textContent = text;
    }
    return e;
}

function each(list, fn) {
    for (let i = 0; i < list.length; i++) {
        fn(list[i], i);
    }
}

const DROP = '<svg viewBox="0 0 16 21" aria-hidden="true"><path d="M8 0C9.5 3.6 16 9.6 16 13a8 8 0 0 1-16 0C0 9.6 ' +
    '6.5 3.6 8 0z"/></svg>';

export function stage(node, color) {
    if (color >= 1 && color <= 6) {
        node.style.setProperty('--hk-ev', 'var(--hk-marca-' + color + ')');
        node.style.setProperty('--hk-sobre-ev', 'var(--hk-sobre-marca-' + color + ')');
        node.style.setProperty('--hk-ev-oscuro', 'var(--hk-marca-' + color + '-oscuro)');
    } else {
        // For everyone, or of no category: a neutral grey (the primary colour of a centre may be one of its categories).
        node.style.setProperty('--hk-ev', 'var(--hk-texto-suave)');
        node.style.setProperty('--hk-sobre-ev', 'var(--hk-superficie)');
    }
}

function weatherDay(label, d, sky) {
    const x = el('div', 'hk-dia-tiempo');
    const icon = el('span', 'hk-tiempo-icono');
    icon.innerHTML = sky.svg(d.symbol);
    x.appendChild(icon);
    const t = el('div', 'hk-dia-tiempo-texto');
    t.appendChild(el('h3', 'hk-etiqueta', label));
    const g = el('p', 'hk-dia-tiempo-grados', d.max + '°');
    g.appendChild(el('small', '', ' / ' + d.min + '°'));
    t.appendChild(g);
    t.appendChild(el('p', 'hk-dia-tiempo-cielo', d.text || sky.texto(d.symbol)));
    if (d.rain !== undefined && d.rain !== null) {
        const r = el('p', 'hk-dia-tiempo-lluvia');
        r.innerHTML = DROP;
        r.appendChild(document.createTextNode(d.rain + ' %'));
        t.appendChild(r);
    }
    x.appendChild(t);
    return x;
}

/** How many things «Today» has: the menu counts as one, each notice and each event as one; the weather does not. */
export function countToday(data) {
    return (data.menu ? 1 : 0) + data.notices.length + data.events.length;
}

/**
 * The weather in a third of the screen (the mixed screens): today big under its label, and the next three days under
 * it, each with its weekday.
 *
 * @param {object} w the weather of the manifest (today, days)
 * @param {object} labels today
 * @param {object} sky the weather icons
 * @param {string[]} days the weekdays' names, Sunday first
 * @returns {HTMLElement}
 */
export function buildWeatherThird(w, labels, sky, days) {
    const aside = el('aside', 'hk-tercio-tiempo');
    const today = weatherDay(labels.today, w.today, sky);
    today.classList.add('hk-tercio-hoy');
    aside.appendChild(today);
    const list = el('div', 'hk-tercio-dias');
    each(w.days || [], function (d) {
        const n = new Date(d.date + 'T12:00:00Z').getUTCDay();
        list.appendChild(weatherDay(days[n] || d.date, d, sky));
    });
    aside.appendChild(list);
    return aside;
}
