// Oksigenia Hechauka: the print button of the monthly report.
document.addEventListener('click', function (ev) {
    if (ev.target.closest && ev.target.closest('[data-hkp-print]')) {
        window.print();
    }
});

// The doors of a screen people touch: each bar as long as its share of the door opened most.
(function () {
    var list = document.querySelector('[data-hkp-doors]');
    if (!list) {
        return;
    }
    var most = 0;
    list.querySelectorAll('[data-count]').forEach(function (li) {
        most = Math.max(most, Number(li.getAttribute('data-count')) || 0);
    });
    list.querySelectorAll('[data-count]').forEach(function (li) {
        var bar = li.querySelector('.hkp-rep-door-bar i');
        if (bar && most) {
            bar.style.width = Math.max(3, Math.round(100 * (Number(li.getAttribute('data-count')) || 0) / most)) + '%';
        }
    });
})();
