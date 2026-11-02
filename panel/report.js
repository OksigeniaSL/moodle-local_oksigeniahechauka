// Oksigenia Hechauka: the print button of the monthly report.
document.addEventListener('click', function (ev) {
    if (ev.target.closest && ev.target.closest('[data-hkp-print]')) {
        window.print();
    }
});
