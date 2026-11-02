// Hechauka: «Empezar» (start.mustache). The weather of the place shows its icon, and the screen beside it stands on «Today».
(function () {
    'use strict';
    const page = document.getElementById('hkp-start-page');
    if (!page) {
        return;
    }
    if (window.HK_TIEMPO) {
        page.querySelectorAll('[data-hk-sky]').forEach((node) => {
            node.innerHTML = window.HK_TIEMPO.svg(node.getAttribute('data-hk-sky')) || '';
        });
    }
})();
