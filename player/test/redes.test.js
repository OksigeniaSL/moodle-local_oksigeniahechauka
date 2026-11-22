// «Nuestras redes» without a page: each network's glyph, the networks one a turn in the place of the channel, the centre's
// Instagram posts (which post each turn, its pictures, its words, when, where its caption is cut, the frame of its picture), and
// that what goes to the player stays with what Chromium 56 understands.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {glyphSvg, knownNetwork, NETWORKS, NETWORK_NAMES} from '../src/redes.js';
import {CAROUSEL, captionWords, cutWords, frameOf, instagramReady, instagramShow, picturesOf, postAt, postsOf, whenWords} from '../src/instagram.js';
import {mediaOf} from '../src/media.js';
import {Composer, draftChoice} from '../src/compose.js';
import {siteOf} from '../src/canal.js';

test('every network of the panel has its glyph, in one ink; any other gets the link', () => {
    for (const n of ['instagram', 'tiktok', 'youtube', 'facebook', 'x', 'linkedin', 'threads', 'bluesky', 'telegram', 'whatsapp', 'web']) {
        assert.ok(NETWORKS.includes(n), n);
        assert.ok(knownNetwork(n), n);
        const svg = glyphSvg(n);
        assert.match(svg, /^<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path (fill="currentColor"|fill="none" stroke="currentColor"[^>]*) d="[^"]+"\/><\/svg>$/, n);
        assert.doesNotMatch(svg, /#[0-9a-f]{3,8}\b/i, n + ': never the brand\'s colour');
    }
    assert.equal(knownNetwork('other'), false);
    assert.equal(glyphSvg('mastodon'), glyphSvg('other'));
    assert.equal(NETWORK_NAMES.tiktok, 'TikTok');
});

const net = (network) => ({id: 'network-' + network, type: 'channel', zone: 'extra', network, title: 'Síguenos', name: '@c',
    web: 'https://enlace.example/' + network});
const queue = [{id: 'p1', type: 'image', width: 1920, height: 1080}, {id: 'p2', type: 'image', width: 1080, height: 1920}];

test('the centre\'s own site is named by its host on the card, as people say it', () => {
    assert.equal(siteOf('https://www.centro.example/?utm_source=pantallas'), 'centro.example');
    assert.equal(siteOf('https://Colegio.Example:8443/inicio'), 'colegio.example');
    assert.equal(siteOf('nur.click'), '');
});

test('the networks come one a turn, in the manifest\'s order, in the channel\'s place', () => {
    const c = new Composer();
    const channels = [net('telegram'), net('instagram'), net('tiktok')];
    const shown = [];
    for (let i = 0; i < 60; i++) {
        const r = c.next(queue, 2, true, {channels, distance: 3});
        if (r.comp === 'canal') {
            shown.push(r.extra.item.network);
        }
    }
    assert.ok(shown.length >= 4, shown.join(' '));
    assert.deepEqual(shown.slice(0, 4), ['telegram', 'instagram', 'tiktok', 'telegram']);
});

const media = (id, w, h) => ({id, url: 'media/' + id + '.jpg', sha1: 's' + id, width: w, height: h});
const POSTS = [
    {id: 'a', media_type: 'CAROUSEL_ALBUM', timestamp: '2026-11-02T09:30:00+0000',
        media: [1, 2, 3, 4, 5, 6, 7].map((k) => media(k, 1080, 1350)), caption: 'Uno'},
    {id: 'b', media_type: 'IMAGE', timestamp: '2026-11-01T09:30:00+0000', media: [media(8, 1080, 1080)], caption: 'Dos'},
    {id: 'c', media_type: 'VIDEO', timestamp: '2026-10-30T09:30:00+0000', media: [media(9, 1080, 1920)], caption: 'Tres'},
    {id: 'd', media_type: 'IMAGE', timestamp: '2026-10-29T09:30:00+0000', media: [], caption: 'Sin foto'},
];
const IG = {id: 'instagram', type: 'instagram', zone: 'extra', network: 'instagram', title: 'Síguenos en Instagram',
    name: '@centro.ejemplo', web: 'https://enlace.example/instagram', posts: POSTS};

test('Instagram: the slide comes with an address and a post with its picture; each turn the next post, round again', () => {
    assert.equal(instagramShow(IG), true);
    assert.equal(instagramShow(Object.assign({}, IG, {web: 'enlace.example'})), false);
    assert.equal(instagramShow(Object.assign({}, IG, {posts: [POSTS[3]]})), false, 'a post without its picture does not count');
    assert.deepEqual(postsOf(IG).map((p) => p.id), ['a', 'b', 'c']);
    assert.deepEqual([0, 1, 2, 3, 4].map((n) => postAt(IG, n).id), ['a', 'b', 'c', 'a', 'b']);
});

test('Instagram: a carousel goes through five of its pictures at most; a video shows its cover alone', () => {
    assert.equal(picturesOf(POSTS[0]).length, CAROUSEL.most);
    assert.equal(picturesOf(POSTS[1]).length, 1);
    assert.equal(picturesOf(POSTS[2]).length, 1);
    assert.equal(picturesOf(POSTS[3]).length, 0);
});

test('Instagram: the words without emoji, without the hashtags at the end, in one paragraph', () => {
    assert.equal(captionWords('¡El huerto ya da girasoles! 🌻 Gracias 💛\n\n#huerto #primaria'), '¡El huerto ya da girasoles! Gracias');
    assert.equal(captionWords('⚽🏀 La cancha, renovada.'), 'La cancha, renovada.');
    assert.equal(captionWords('Con #huerto en medio y al final #fin'), 'Con #huerto en medio y al final');
    assert.equal(captionWords(''), '');
    assert.equal(captionWords(null), '');
});

test('Instagram: when it was posted, as the app says it, and Meta\'s «+0000» read', () => {
    const now = new Date(2026, 10, 2, 10, 45);
    const s = {instagram_today: 'Hoy', instagram_yesterday: 'Ayer', instagram_days: 'Hace {n} días'};
    assert.equal(whenWords('2026-11-02T09:30:00+0000', now, s, 'es'), 'Hoy');
    assert.equal(whenWords('2026-11-01T09:30:00+0000', now, s, 'es'), 'Ayer');
    assert.equal(whenWords('2026-10-30T09:30:00+0000', now, s, 'es'), 'Hace 3 días');
    assert.equal(whenWords('2026-10-21T08:00:00+0000', now, s, 'es'), '21 de octubre');
    assert.equal(whenWords('2026-11-02T09:30:00+0000', now, {}, 'es'), '2 de noviembre', 'without the words, the date');
    assert.equal(whenWords('', now, s, 'es'), '');
    assert.equal(whenWords('ayer', now, s, 'es'), '');
});

test('Instagram: a caption is cut after a whole sentence when that keeps most of it, else at a word with «…»', () => {
    const w = '¡El huerto de 2.º ya da girasoles! Esta semana han medido cuánto crecen cada día'.split(' ');
    assert.equal(cutWords(w, 9), '¡El huerto de 2.º ya da girasoles!');
    assert.equal(cutWords(w, 4), '¡El huerto de 2.º…');
    assert.equal(cutWords(w, 30), w.join(' '));
    assert.equal(cutWords(['Uno.', 'dos', 'tres', 'cuatro', 'cinco', 'seis'], 5), 'Uno. dos tres cuatro cinco…', 'not when it keeps too little');
});

test('Instagram: the picture as big as the room lets it, whole', () => {
    assert.deepEqual(frameOf(1000, 700, 0.8, true, 0), {w: 560, h: 700});
    assert.deepEqual(frameOf(500, 700, 1.78, true, 0), {w: 500, h: 280});
    assert.deepEqual(frameOf(900, 900, 0.5625, true, 0), {w: 506, h: 900});
});

test('Instagram: its own turn, never right after a network; Instagram\'s network turn is its posts\'', () => {
    const c = new Composer();
    const channels = [net('instagram'), net('tiktok')];
    const comps = [];
    const networks = [];
    for (let i = 0; i < 60; i++) {
        const r = c.next(queue, 2, true, {channels, instagram: IG, distance: 3});
        comps.push(r.comp);
        if (r.comp === 'canal') {
            networks.push(r.extra.item.network);
        }
        if (r.comp === 'instagram') {
            assert.equal(r.extra.item, IG);
        }
    }
    const n = comps.filter((x) => x === 'instagram').length;
    assert.ok(n >= 3 && n <= 6, comps.join(' '));
    assert.ok(networks.length >= 2 && networks.every((x) => x === 'tiktok'), networks.join(' '));
    for (let i = 1; i < comps.length; i++) {
        assert.ok(!(comps[i] === 'instagram' && comps[i - 1] === 'canal') && !(comps[i] === 'canal' && comps[i - 1] === 'instagram'),
            'a network and the posts together, at ' + i);
    }
    const pages = [];
    const d = new Composer();
    for (let i = 0; i < 60; i++) {
        const r = d.next(queue, 2, true, {instagram: IG, distance: 3});
        if (r.comp === 'instagram') {
            pages.push(r.extra.page);
        }
    }
    assert.deepEqual(pages.slice(0, 3), [0, 1, 2]);
});

test('Instagram with several accounts: the next account each turn, and in each its next post', () => {
    const club = Object.assign({}, IG, {id: 'instagram-902', name: '@club.ejemplo'});
    const c = new Composer();
    const seen = [];
    for (let i = 0; i < 120; i++) {
        const r = c.next(queue, 2, true, {instagram: IG, instagrams: [IG, club], distance: 3});
        if (r.comp === 'instagram') {
            seen.push(r.extra.item.name + ':' + r.extra.page);
        }
    }
    assert.ok(seen.length >= 6, seen.join(' '));
    assert.deepEqual(seen.slice(0, 4), [IG.name + ':0', '@club.ejemplo:0', IG.name + ':1', '@club.ejemplo:1']);
});

test('the panel\'s preview shows a network or the posts as the screens will', () => {
    assert.deepEqual(draftChoice(net('tiktok'), 'canal', [], true, 'info'), {comp: 'canal', items: [], seconds: 0, extra: {item: net('tiktok')}});
    assert.equal(draftChoice(IG, 'main', [], false, 'info').comp, 'instagram');
});

test('instagram.css stays with what Chromium 56 understands; the carousel changes only opacity', () => {
    const sheet = readFileSync(new URL('../instagram.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [re, what] of [
        [/display:\s*grid/, 'CSS Grid (Chrome 57)'],
        [/\bgap:/, 'gap in flex (Chrome 84)'],
        [/clamp\(|min\(|max\(/, 'clamp/min/max (Chrome 79)'],
        [/aspect-ratio|inset:|:is\(|:where\(|:has\(|color-mix/, 'newer CSS'],
        [/@container|cq[whib]/, 'container queries (Chrome 105)'],
        [/prefers-color-scheme/, 'prefers-color-scheme (Chrome 76)'],
        [/space-evenly/, 'space-evenly (Chrome 60)'],
        [/#[0-9a-f]{8}\b|#[0-9a-f]{4}\b/i, 'colours with alpha in hex (Chrome 62)'],
        [/max-width:\s*[\d.]+ch/, 'a text column narrowed in ch'],
        [/@(-webkit-)?keyframes|animation:/, 'an animation of its own: movimiento.js gives the entrance'],
    ]) {
        assert.equal(re.test(sheet), false, 'instagram.css uses ' + what);
    }
    for (const m of sheet.match(/transition(-property)?:[^;]+;/g) || []) {
        const v = m.replace(/transition(-property)?:/, '').replace(/\([^)]*\)/g, '').replace(';', '');
        for (const p of v.split(',').map((x) => x.trim().split(/\s+/)[0])) {
            assert.ok(['opacity'].indexOf(p) !== -1, m);
        }
    }
});

test('the Instagram slide waits for its pictures on the device, and the device downloads them', () => {
    const pic = (n) => ({id: n, url: 'https://x/api/media.php?f=' + n, sha1: 's' + n, width: 1080, height: 1080});
    const item = {type: 'instagram', zone: 'extra', web: 'https://www.instagram.com/ejemplo/', posts: [
        {id: '1', media_type: 'CAROUSEL_ALBUM', caption: 'Uno', media: [pic(1), pic(2)]},
        {id: '2', media_type: 'VIDEO', caption: 'Dos', media: [pic(3)]},
    ]};
    // Every picture of every post is downloaded.
    assert.deepEqual(mediaOf({items: [item]}).map((m) => m.sha1), ['s1', 's2', 's3']);
    // Nothing on the device yet: no slide.
    assert.equal(instagramReady(item, {ready: () => false}), null);
    // Only the second picture of the carousel: the post shows with it alone, the video waits.
    const some = instagramReady(item, {ready: (m) => m.sha1 === 's2'});
    assert.equal(some.posts.length, 1);
    assert.deepEqual(some.posts[0].media.map((m) => m.sha1), ['s2']);
    // The item itself is left as it came.
    assert.equal(item.posts[0].media.length, 2);
    // Without a store (the panel's preview), everything counts.
    assert.equal(instagramReady(item, null).posts.length, 2);
    assert.equal(instagramReady(null, null), null);
});

