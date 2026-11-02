// Oksigenia Hechauka: the public demonstration screen scales the player, at its real size, to the frame of the page.
(function () {
    var tv = document.querySelector('.hkd-tv');
    if (!tv) {
        return;
    }
    var glass = tv.querySelector('.hkd-glass');
    var frame = glass.querySelector('iframe');
    var w = Number(tv.getAttribute('data-width'));
    var h = Number(tv.getAttribute('data-height'));
    var fit = function () {
        var scale = glass.clientWidth / w;
        glass.style.height = Math.round(h * scale) + 'px';
        frame.style.transform = 'scale(' + scale + ')';
    };
    window.addEventListener('resize', fit);
    fit();
})();
