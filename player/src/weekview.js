// «La semana» on the page: five days side by side (one under the other on a vertical screen), each with its events;
// holidays striped; bands across days. Each day fits its list once it is in the page: the largest scale at which
// nothing overflows and no title takes three lines; if nothing fits, the last ones give way to «+2 more». From the
// art direction (Gaudí, 31 October 2026, «construirSemana» and «ajustarSemana» in its demo; semana.css).

import {stage} from './today.js';

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

function eventNode(e) {
    const d = el('div', 'hk-dia-ev');
    stage(d, e.color);
    d.appendChild(el('b', '', e.title));
    if (e.time || e.group) {
        const s = el('small');
        if (e.time) {
            s.appendChild(el('time', '', e.time));
        }
        s.appendChild(document.createTextNode(e.group));
        d.appendChild(s);
    }
    return d;
}

/**
 * The week, not yet measured.
 *
 * @param {{days: object[], bands: object[]}} week from weekOf()
 * @param {object} labels today, tomorrow, none, more
 * @returns {HTMLElement}
 */
export function buildWeek(week, labels) {
    const s = el('section', 'hk-semana');
    week.days.forEach(function (d) {
        const empty = !d.holiday && !d.events.length && !d.lanes;
        const a = el('article', 'hk-dia' + (d.today ? ' hk-dia-hoy' : '') + (d.holiday ? ' hk-dia-festivo' : '') +
            (empty ? ' hk-dia-vacio' : '') + (d.afterWeekend ? ' hk-dia-tras-finde' : ''));
        if (d.lanes) {
            a.setAttribute('data-carriles', String(d.lanes));
        }
        if (d.flags) {
            a.setAttribute('data-banderas', String(d.flags));
        }
        const head = el('header', 'hk-dia-cabeza');
        head.appendChild(el('b', 'hk-dia-num', String(d.number)));
        const name = el('p', 'hk-dia-nombre', d.name);
        const mark = d.today ? labels.today : (d.tomorrow ? labels.tomorrow : d.month);
        if (mark) {
            name.appendChild(el('small', 'hk-dia-marca', mark));
        }
        head.appendChild(name);
        a.appendChild(head);
        if (d.holiday) {
            const f = el('div', 'hk-dia-cuerpo hk-festivo');
            const p = el('p');
            if (d.holiday.label) {
                p.appendChild(el('small', '', d.holiday.label));
            }
            p.appendChild(el('b', '', d.holiday.name));
            f.appendChild(p);
            a.appendChild(f);
        } else if (empty) {
            a.appendChild(el('p', 'hk-dia-cuerpo hk-dia-nada', labels.none));
        } else {
            const list = el('div', 'hk-dia-cuerpo hk-dia-lista');
            d.events.forEach(function (e) {
                list.appendChild(eventNode(e));
            });
            a.appendChild(list);
        }
        s.appendChild(a);
    });
    if (week.bands.length) {
        const layer = el('div', 'hk-tramos');
        week.bands.forEach(function (t) {
            const b = el('div', 'hk-tramo' + (t.before ? ' hk-tramo-antes' : '') + (t.after ? ' hk-tramo-despues' : ''));
            b.setAttribute('data-desde', String(t.from));
            b.setAttribute('data-hasta', String(t.to));
            b.setAttribute('data-carril', String(t.lane));
            if (t.row) {
                b.setAttribute('data-fila', String(t.row));
            }
            stage(b, t.color);
            const text = el('p', 'hk-tramo-texto');
            text.appendChild(el('b', '', t.title));
            const line = [t.group, t.note].filter(Boolean).join(' · ');
            if (line) {
                const small = el('small', '', line);
                small.hkShort = t.group;
                text.appendChild(small);
            }
            b.appendChild(text);
            layer.appendChild(b);
        });
        s.appendChild(layer);
    }
    s.hkMore = labels.more;
    return s;
}

// The list overflows, or a word does not fit in its event.
function overflows(l) {
    if (l.scrollHeight > l.clientHeight + 1 || l.scrollWidth > l.clientWidth + 1) {
        return true;
    }
    const bs = l.querySelectorAll('.hk-dia-ev b');
    for (let i = 0; i < bs.length; i++) {
        if (bs[i].scrollWidth > bs[i].clientWidth + 1) {
            return true;
        }
    }
    return false;
}

function longTitle(l) {
    const bs = l.querySelectorAll('.hk-dia-ev b');
    for (let i = 0; i < bs.length; i++) {
        const height = parseFloat(window.getComputedStyle(bs[i]).lineHeight);
        if (bs[i].offsetHeight && bs[i].offsetHeight > height * 2.5) {
            return true;
        }
    }
    return false;
}

/**
 * Fits the week once it is in the page.
 *
 * @param {HTMLElement} section
 * @param {boolean} horizontal
 */
export function fitWeek(section, horizontal) {
    // A band whose line does not fit says only its group (its point already says it goes on); one whose title does
    // not fit takes a smaller one.
    const bands = section.querySelectorAll('.hk-tramo');
    for (let i = 0; i < bands.length; i++) {
        const t = bands[i];
        const b = t.querySelector('b');
        const small = t.querySelector('small');
        if (small && small.scrollWidth > small.clientWidth + 1 && small.hkShort !== undefined) {
            if (small.hkShort) {
                small.textContent = small.hkShort;
            } else {
                small.parentNode.removeChild(small);
            }
        }
        if (b.scrollWidth > b.clientWidth + 1) {
            t.classList.add('hk-tramo-estrecho');
        }
    }
    const lists = section.querySelectorAll('.hk-dia-lista');
    for (let n = 0; n < lists.length; n++) {
        const l = lists[n];
        const evs = l.querySelectorAll('.hk-dia-ev');
        const shapes = !horizontal && evs.length >= 2 ? ['1', '2'] : ['1'];
        const tryAll = function () {
            for (let e = 3; e >= 0; e--) {
                for (let c = 0; c < shapes.length; c++) {
                    l.setAttribute('data-escala', String(e));
                    l.setAttribute('data-columnas', shapes[c]);
                    if (!overflows(l) && (e === 0 || !longTitle(l))) {
                        return true;
                    }
                }
            }
            return false;
        };
        if (!evs.length || tryAll()) {
            continue;
        }
        const more = el('p', 'hk-dia-mas');
        l.appendChild(more);
        let fitted = false;
        for (let k = 1; k < evs.length && !fitted; k++) {
            evs[evs.length - k].style.display = 'none';
            more.textContent = String(section.hkMore || '+{n}').replace('{n}', String(k));
            fitted = tryAll();
        }
        if (!fitted) {
            l.setAttribute('data-escala', '0');
        }
    }
}
