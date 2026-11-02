// Oksigenia Hechauka: the weather's icon wherever the panel shows the weather of a place (data-hk-sky="<symbol>"), drawn with
// the screens' own set (player/tiempo-iconos.js, loaded before this one).
(function() {
    'use strict';
    if (!window.HK_TIEMPO) {
        return;
    }
    document.querySelectorAll('[data-hk-sky]').forEach(function(node) {
        node.innerHTML = window.HK_TIEMPO.svg(node.getAttribute('data-hk-sky')) || '';
    });
})();
