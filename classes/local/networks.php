<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

namespace local_oksigeniahechauka\local;

/**
 * «Our networks»: a box for each usual social network, and one for the centre's web, filled with the account («@…») or its
 * address. An empty box makes nothing; each filled one has its switch, and the screens show the ones switched on, one at a
 * time, as «Follow us on …» with the QR (the same slide as the channel of Oksigenia Marandu, which comes by itself).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class networks {
    /** @var string the component */
    const C = 'local_oksigeniahechauka';

    /**
     * Each box, in its order: the network's name as written everywhere, the hosts of its addresses, an account's address from
     * its name (null: only the whole address goes), and whether its accounts are written with «@».
     *
     * @var array
     */
    const KNOWN = [
        'instagram' => ['name' => 'Instagram', 'hosts' => ['instagram.com', 'instagr.am'],
            'account' => 'https://www.instagram.com/%s/', 'at' => true],
        'tiktok' => ['name' => 'TikTok', 'hosts' => ['tiktok.com'], 'account' => 'https://www.tiktok.com/@%s', 'at' => true],
        'youtube' => ['name' => 'YouTube', 'hosts' => ['youtube.com', 'youtu.be'], 'account' => 'https://www.youtube.com/@%s',
            'at' => true],
        'facebook' => ['name' => 'Facebook', 'hosts' => ['facebook.com', 'fb.com', 'fb.me'],
            'account' => 'https://www.facebook.com/%s', 'at' => false],
        'x' => ['name' => 'X', 'hosts' => ['x.com', 'twitter.com'], 'account' => 'https://x.com/%s', 'at' => true],
        'linkedin' => ['name' => 'LinkedIn', 'hosts' => ['linkedin.com'], 'account' => null, 'at' => false],
        'threads' => ['name' => 'Threads', 'hosts' => ['threads.net', 'threads.com'], 'account' => 'https://www.threads.net/@%s',
            'at' => true],
        'bluesky' => ['name' => 'Bluesky', 'hosts' => ['bsky.app'], 'account' => 'https://bsky.app/profile/%s', 'at' => true],
        'telegram' => ['name' => 'Telegram', 'hosts' => ['t.me', 'telegram.me'], 'account' => 'https://t.me/%s', 'at' => true],
        'whatsapp' => ['name' => 'WhatsApp', 'hosts' => ['whatsapp.com', 'wa.me'], 'account' => null, 'at' => false],
        'web' => ['name' => '', 'hosts' => [], 'account' => null, 'at' => false],
    ];

    /** @var string how an account's name is written: what the networks allow, and nothing that makes an address */
    const ACCOUNT = '/^@?([A-Za-z0-9_][A-Za-z0-9._-]{0,99})$/';

    /** @var array first parts of an address that are not an account: a post, a search, a page of the network itself */
    const NOT_ACCOUNTS = ['p', 'reel', 'reels', 'explore', 'stories', 'i', 'home', 'search', 'hashtag', 'watch', 'shorts',
        'playlist', 'results', 'profile.php', 'groups', 'pages', 'people', 'share', 's', 'intent', 'channel', 'video'];

    /**
     * What a box takes, as the screens would use it: its address, and the account as it is written (empty when the address
     * does not say it). Null when it does not fit the box: an address of another network, or something that is no address.
     *
     * @param string $network a key of KNOWN
     * @param string $input the account or the address, as written
     * @return array|null ['url' => …, 'account' => …]
     */
    public static function read(string $network, string $input): ?array {
        $known = self::KNOWN[$network] ?? null;
        $input = trim($input);
        if (!$known || $input === '') {
            return null;
        }
        if ($known['account'] && preg_match(self::ACCOUNT, $input, $m) && strpos($input, '/') === false) {
            return ['url' => sprintf($known['account'], $m[1]), 'account' => self::written($network, $m[1])];
        }
        $url = preg_match('#^[a-z][a-z0-9+.-]*://#i', $input) ? $input : 'https://' . $input;
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        if (
            !in_array($scheme, ['http', 'https'], true) || strpos($host, '.') === false
                || clean_param($url, PARAM_URL) === '' || preg_match('/\s/', $url)
        ) {
            return null;
        }
        $bare = preg_replace('/^(www|m|mobile)\./', '', $host);
        if ($network === 'web') {
            foreach (self::KNOWN as $hosts) {
                if (self::of($bare, $hosts['hosts'])) {
                    return null;
                }
            }
            return ['url' => $url, 'account' => $bare];
        }
        if (!self::of($bare, $known['hosts'])) {
            return null;
        }
        // The networks' own addresses go by https, whatever was pasted.
        $url = 'https://' . substr($url, strlen($scheme) + 3);
        return ['url' => $url, 'account' => self::account($network, (string) ($parts['path'] ?? ''))];
    }

    /**
     * Whether a host (without «www.») is one of these or under one of them.
     *
     * @param string $host
     * @param array $hosts
     * @return bool
     */
    protected static function of(string $host, array $hosts): bool {
        foreach ($hosts as $h) {
            if ($host === $h || substr($host, -strlen($h) - 1) === '.' . $h) {
                return true;
            }
        }
        return false;
    }

    /**
     * The account an address of a network names, as it is written; empty when it names none (a post, a group, a channel by
     * its number).
     *
     * @param string $network
     * @param string $path the address's path
     * @return string
     */
    protected static function account(string $network, string $path): string {
        $parts = array_values(array_filter(explode('/', $path), 'strlen'));
        $first = $parts[0] ?? '';
        if ($network === 'linkedin') {
            $name = in_array($first, ['company', 'school', 'in', 'showcase'], true) ? ($parts[1] ?? '') : '';
        } else if ($network === 'bluesky') {
            $name = $first === 'profile' ? ($parts[1] ?? '') : '';
        } else if (in_array($network, ['tiktok', 'youtube', 'threads'], true)) {
            // Their accounts carry the «@» in the address; anything else is a video, a channel by its number or a page.
            $name = substr($first, 0, 1) === '@' ? $first : '';
        } else if (in_array($network, ['whatsapp', 'web'], true)) {
            $name = '';
        } else {
            $name = in_array(strtolower($first), self::NOT_ACCOUNTS, true) ? '' : $first;
        }
        $name = rawurldecode($name);
        return preg_match(self::ACCOUNT, $name, $m) ? self::written($network, $m[1]) : '';
    }

    /**
     * An account as its network writes it: with «@» where it goes.
     *
     * @param string $network
     * @param string $name without «@»
     * @return string
     */
    protected static function written(string $network, string $name): string {
        return (self::KNOWN[$network]['at'] ? '@' : '') . $name;
    }

    /**
     * What the centre has put, box by box as saved: [network => ['url' => …, 'show' => bool]], only the filled ones.
     *
     * @return array
     */
    protected static function saved(): array {
        $saved = json_decode((string) get_config(self::C, 'networks'), true);
        $out = [];
        foreach (is_array($saved) ? $saved : [] as $network => $box) {
            if (isset(self::KNOWN[$network]) && is_array($box) && !empty($box['url'])) {
                $out[$network] = ['url' => (string) $box['url'], 'show' => !empty($box['show'])];
            }
        }
        return $out;
    }

    /**
     * Every box, in its order, for the panel: filled or not, what it has, and whether the screens show it.
     *
     * @return array [['network', 'name', 'url', 'account', 'filled', 'show']]
     */
    public static function boxes(): array {
        $saved = self::saved();
        $marandu = self::marandu();
        $out = [];
        foreach (self::KNOWN as $network => $known) {
            $box = $saved[$network] ?? null;
            $from = '';
            if ($network === 'telegram' && $marandu) {
                // The channel of Oksigenia Marandu is the Telegram box: seen here, changed there, and its switch is the source's.
                $box = ['url' => $marandu, 'show' => !empty(get_config(self::C, 'sourcechannel'))];
                $from = 'marandu';
            }
            $read = $box ? self::read($network, $box['url']) : null;
            $out[] = ['network' => $network,
                'name' => $network === 'web' ? get_string('network_web', self::C) : $known['name'],
                'url' => $read['url'] ?? '', 'account' => $read['account'] ?? '',
                'filled' => (bool) $read, 'show' => $read && $box['show'], 'from' => $from];
        }
        return $out;
    }

    /**
     * The address of the channel of Oksigenia Marandu, when it has one on Telegram.
     *
     * @return string|null
     */
    protected static function marandu(): ?string {
        $channel = sources::channel();
        $url = preg_replace('/[?#].*$/', '', (string) ($channel[0]['web'] ?? ''));
        return $url !== '' && self::read('telegram', $url) ? $url : null;
    }

    /**
     * The network an address belongs to, if it is one the boxes know; null for an account alone or any other address.
     *
     * @param string $value
     * @return string|null
     */
    public static function recognise(string $value): ?string {
        if (strpos(trim($value), '/') === false && strpos(trim($value), '.') === false) {
            return null;
        }
        foreach (self::KNOWN as $network => $known) {
            if ($network !== 'web' && self::read($network, $value) && !preg_match(self::ACCOUNT, trim($value))) {
                return $network;
            }
        }
        return null;
    }

    /**
     * One box changed from the panel, as it saves each gesture: its account or address, its switch, or both. An address of
     * another network goes to that network's box; the Telegram box of Marandu only takes its switch.
     *
     * @param string $network a key of KNOWN
     * @param array $box ['value' => …] and/or ['show' => bool]
     * @return array what the box has now, for the panel: [network, value, web, show, from, wrong]
     */
    public static function change(string $network, array $box): array {
        if (!isset(self::KNOWN[$network])) {
            throw new \moodle_exception('invalidparameter', 'debug');
        }
        $wrong = false;
        if ($network === 'telegram' && self::marandu()) {
            if (array_key_exists('show', $box)) {
                set_config('sourcechannel', empty($box['show']) ? 0 : 1, self::C);
            }
            $wrong = array_key_exists('value', $box);
        } else {
            if (isset($box['value']) && !self::read($network, (string) $box['value'])) {
                $other = self::recognise((string) $box['value']);
                if ($other && !($other === 'telegram' && self::marandu())) {
                    $network = $other;
                }
            }
            $wrong = (bool) self::save([$network => $box]);
        }
        foreach (self::boxes() as $now) {
            if ($now['network'] === $network) {
                return ['network' => $network, 'value' => $now['account'] !== '' && $network !== 'web' ? $now['account'] :
                    $now['url'], 'web' => $now['url'], 'show' => $now['show'], 'from' => $now['from'], 'wrong' => $wrong];
            }
        }
        return [];
    }

    /**
     * Saves what came from the panel: only the boxes that came change, so each gesture saves by itself. An empty box is
     * emptied; one that does not fit keeps what it had, and is told back.
     *
     * @param array $boxes [network => ['value' => the account or the address, 'show' => bool]]; without 'value', only the switch
     * @return array the networks whose value did not fit
     */
    public static function save(array $boxes): array {
        $saved = self::saved();
        $wrong = [];
        foreach ($boxes as $network => $box) {
            if (!isset(self::KNOWN[$network]) || !is_array($box)) {
                continue;
            }
            if (array_key_exists('value', $box)) {
                $value = trim((string) $box['value']);
                if ($value === '') {
                    unset($saved[$network]);
                    continue;
                }
                $read = self::read($network, $value);
                if (!$read) {
                    $wrong[] = $network;
                    continue;
                }
                // A box just filled shows on the screens unless it says otherwise: that is what it was filled for.
                $saved[$network] = ['url' => $read['url'],
                    'show' => array_key_exists('show', $box) ? !empty($box['show']) : ($saved[$network]['show'] ?? true)];
            } else if (array_key_exists('show', $box) && isset($saved[$network])) {
                $saved[$network]['show'] = !empty($box['show']);
            }
        }
        set_config('networks', $saved ? json_encode($saved, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : '', self::C);
        return $wrong;
    }

    /**
     * The boxes switched on, as items of the contract: one «Follow us» each, the same item as the channel's. A network whose
     * address is already among $besides (the channel of Oksigenia Marandu) does not come twice. The address says it comes from
     * the screens, so the shortener counts who arrives from them.
     *
     * @param array $besides items of the contract already there
     * @return array items of the contract
     */
    public static function items(array $besides = []): array {
        $there = [];
        foreach ($besides as $item) {
            $there[self::same((string) ($item['web'] ?? ''))] = true;
        }
        $c = self::C;
        $out = [];
        foreach (self::boxes() as $box) {
            if (!$box['show'] || $box['from'] !== '' || isset($there[self::same($box['url'])])) {
                continue;
            }
            $web = $box['network'] === 'web';
            $url = $box['url'] . (strpos($box['url'], '?') === false ? '?' : '&') . 'utm_source=pantallas';
            $out[] = ['id' => 'network-' . $box['network'], 'type' => 'channel', 'zone' => 'extra',
                'network' => $box['network'],
                'title' => $web ? get_string('label_network_web', $c) : get_string('label_network', $c, $box['name']),
                'text' => get_string($web ? 'label_network_web_text' : 'label_network_text', $c),
                'name' => $box['account'], 'web' => $url];
        }
        return $out;
    }

    /**
     * An address as the same place: no scheme, no «www.», no query and no last slash, in small letters.
     *
     * @param string $url
     * @return string
     */
    protected static function same(string $url): string {
        $url = strtolower(preg_replace('/[?#].*$/', '', $url));
        return rtrim(preg_replace('#^https?://(www\.)?#', '', $url), '/');
    }
}
