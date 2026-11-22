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
 * «On our Instagram»: the last posts of the centre's accounts on its screens. The server reads them with a key of Meta that
 * never expires (a system user of the centre's business portfolio, with read permissions only), once an hour, and keeps their
 * pictures (a video's cover, a carousel's first ones) among the screens' own files: the screens never ask Meta, and they
 * show what they have without a network.
 *
 * Every account the key reaches has its way: not shown, all its posts, or only those that speak of the centre (its text
 * names it: a few words the centre writes); and its screens, all or those of some groups. The centre's own account (the one
 * of «Our networks», or the first) shows all of it until the centre says otherwise; the rest, nothing until switched on.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class instagram {
    /** @var string The Graph API of Meta, with its version. */
    const GRAPH = 'https://graph.facebook.com/v23.0/';

    /** @var string Where the pictures (item 0) and the list of posts (item 1) are kept. */
    const AREA = 'instagram';

    /** @var int The item of the list of posts. */
    const LIST_ITEM = 1;

    /** @var string The name of the list of posts. */
    const LIST_NAME = 'posts.json';

    /** @var int How often the server asks. */
    const EVERY = HOURSECS;

    /** @var int The posts the screens get of each account, the newest first. */
    const POSTS_MOST = 12;

    /** @var int The posts read of an account that shows only what speaks of the centre: some of them will. */
    const READ_MOST = 25;

    /** @var int The accounts read: a key that reaches more reads the first ones. */
    const ACCOUNTS_MOST = 10;

    /** @var int A post older than this is no longer news: an account that has stopped posting shows nothing. */
    const FRESH = 90 * DAYSECS;

    /** @var string[] The ways of an account. */
    const SHOWS = ['off', 'all', 'centre'];

    /** @var int The pictures of a carousel the screens get: the slide shows five at most. */
    const PICTURES_MOST = 5;

    /** @var int The biggest picture kept, in bytes. */
    const MOST = 8 * 1024 * 1024;

    /** @var int Without a good reading for this long, the screens stop showing what came last. */
    const STALE = 7 * DAYSECS;

    /** Seconds a reading may spend bringing pictures: the rest, the next hour. */
    const FETCH_SECONDS = 60;

    /** @var string What is asked of each post. */
    const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,children{media_type,media_url,thumbnail_url}';

    /**
     * The key of Meta, as the site keeps it (encrypted), or ''.
     *
     * @return string
     */
    public static function token(): string {
        $kept = (string) get_config('local_oksigeniahechauka', 'instagramtoken');
        if ($kept === '') {
            return '';
        }
        try {
            return trim((string) \core\encryption::decrypt($kept));
        } catch (\Throwable $e) {
            return '';
        }
    }

    /**
     * The posts as the screens get them, from what the Graph API answers for an account's media: each with the addresses
     * of its pictures (a picture's own, a video's cover, a carousel's first ones), and only those with one at least. Pure.
     *
     * @param array $data the «data» of /{account}/media
     * @param int $most how many at most
     * @return array[] id, media_type, caption, timestamp, permalink, pictures (addresses)
     */
    public static function posts_of(array $data, int $most = self::POSTS_MOST): array {
        $out = [];
        foreach ($data as $post) {
            if (!is_array($post) || !preg_match('/^\d+$/', (string) ($post['id'] ?? ''))) {
                continue;
            }
            $type = (string) ($post['media_type'] ?? '');
            $pictures = [];
            if ($type === 'CAROUSEL_ALBUM') {
                foreach ((array) ($post['children']['data'] ?? []) as $child) {
                    $pictures[] = self::picture_of((array) $child);
                }
            } else {
                $pictures[] = self::picture_of($post);
            }
            $pictures = array_slice(array_values(array_filter($pictures)), 0, self::PICTURES_MOST);
            if (!$pictures) {
                continue;
            }
            $out[] = ['id' => (string) $post['id'], 'media_type' => in_array($type, ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM']) ?
                $type : 'IMAGE', 'caption' => (string) ($post['caption'] ?? ''), 'timestamp' => (string) ($post['timestamp'] ?? ''),
                'permalink' => (string) ($post['permalink'] ?? ''), 'pictures' => $pictures];
            if (count($out) >= $most) {
                break;
            }
        }
        return $out;
    }

    /**
     * The picture of a post or of a piece of a carousel: its own for a picture, the cover for a video.
     *
     * @param array $media
     * @return string an address, or ''
     */
    protected static function picture_of(array $media): string {
        $url = ($media['media_type'] ?? '') === 'VIDEO' ? ($media['thumbnail_url'] ?? '') : ($media['media_url'] ?? '');
        return preg_match('~^https://\S+$~i', (string) $url) ? (string) $url : '';
    }

    /**
     * Reads the last posts of each account the key reaches that the screens show, and keeps their pictures, at most once an
     * hour: from the scheduled task of every five minutes. Nothing while the source is off or the site has no key. An account
     * that cannot be read this time keeps what it had.
     *
     * @param int $now
     * @return string what happened, for the log of the task
     */
    public static function refresh(int $now): string {
        $c = 'local_oksigeniahechauka';
        $token = self::token();
        if (!get_config($c, 'sourceinstagram') || $token === '') {
            return 'off';
        }
        if ((int) get_config($c, 'instagramtried') > $now - self::EVERY) {
            return 'waiting';
        }
        set_config('instagramtried', $now, $c);
        $fields = 'name,instagram_business_account{id,username,media_count,profile_picture_url}';
        $pages = self::ask('me/accounts', ['fields' => $fields, 'limit' => 50], $token);
        // The centre's own account: the one of «Our networks»; else the one it had (before there were several, the only
        // one); else the first.
        $own = self::wanted();
        if ($own === '') {
            $own = (string) (self::saved()[0]['username'] ?? '');
        }
        $accounts = self::accounts_of((array) ($pages['data'] ?? []), $own);
        if (!$accounts) {
            return self::failed('no Instagram account: ' . (string) ($pages['error']['message'] ?? 'none linked to the key'), $now);
        }
        $before = [];
        foreach (self::saved() as $account) {
            $before[$account['id']] = $account;
        }
        $settings = self::settings();
        $words = self::words_wanted($accounts);
        $fs = get_file_storage();
        $context = files::context();
        $keep = [];
        $list = [];
        $said = [];
        $seen = [];
        $started = time();
        foreach ($accounts as $i => $account) {
            $show = self::show_of($account, $settings, $i === 0);
            // Its picture, for the panel.
            $face = 'perfil-' . $account['id'] . '.jpg';
            if ($account['picture'] !== '' && !$fs->file_exists($context->id, files::COMPONENT, self::AREA, 0, '/', $face)) {
                $image = self::fetch($account['picture']);
                if ($image !== null && strlen($image) <= self::MOST && @getimagesizefromstring($image)) {
                    $fs->create_file_from_string(['contextid' => $context->id, 'component' => files::COMPONENT,
                        'filearea' => self::AREA, 'itemid' => 0, 'filepath' => '/', 'filename' => $face], $image);
                }
            }
            $keep[$face] = true;
            $entry = ['id' => $account['id'], 'username' => $account['username'], 'title' => $account['title'],
                'count' => $account['count'], 'last' => (string) ($before[$account['id']]['last'] ?? ''), 'posts' => []];
            // Not shown: only when it last posted, for the panel.
            $most = $show === 'off' ? 1 : ($show === 'centre' ? self::READ_MOST : self::POSTS_MOST);
            $media = self::ask($account['id'] . '/media', ['fields' => self::FIELDS, 'limit' => $most], $token);
            if (!isset($media['data']) || !is_array($media['data'])) {
                // This time it cannot be read: it keeps what it had, pictures and all.
                $entry['posts'] = (array) ($before[$account['id']]['posts'] ?? []);
                foreach ($entry['posts'] as $post) {
                    foreach ((array) ($post['files'] ?? []) as $name) {
                        $keep[$name] = true;
                    }
                }
                $list[] = $entry;
                $said[] = '@' . $account['username'] . ': not read';
                continue;
            }
            $entry['last'] = (string) ($media['data'][0]['timestamp'] ?? $entry['last']);
            if ($show === 'off') {
                $list[] = $entry;
                continue;
            }
            $about = $show === 'centre' ? self::words_of($account['id'], $settings, $words) : [];
            $posts = [];
            foreach (self::posts_of($media['data'], $most) as $post) {
                // Still news, and speaking of the centre when only that shows; a collaboration comes in both accounts:
                // once, in the first.
                $shown = $show !== 'centre' || self::speaks_of($post['caption'], $about);
                if (!isset($seen[$post['id']]) && self::fresh($post['timestamp'], $now) && $shown) {
                    $seen[$post['id']] = true;
                    $posts[] = $post;
                }
            }
            foreach (array_slice($posts, 0, self::POSTS_MOST) as $post) {
                $names = [];
                foreach ($post['pictures'] as $n => $url) {
                    $name = $post['id'] . '-' . $n . '.jpg';
                    if (!$fs->file_exists($context->id, files::COMPONENT, self::AREA, 0, '/', $name)) {
                        // A slow server never holds the task of every five minutes for long: what is left comes in an hour.
                        if (time() - $started > self::FETCH_SECONDS) {
                            continue;
                        }
                        $image = self::fetch($url);
                        if ($image === null || strlen($image) > self::MOST || !@getimagesizefromstring($image)) {
                            continue;
                        }
                        $fs->create_file_from_string(['contextid' => $context->id, 'component' => files::COMPONENT,
                            'filearea' => self::AREA, 'itemid' => 0, 'filepath' => '/', 'filename' => $name], $image);
                    }
                    $names[] = $name;
                    $keep[$name] = true;
                }
                if ($names) {
                    unset($post['pictures']);
                    $entry['posts'][] = $post + ['files' => $names];
                }
            }
            $list[] = $entry;
            $said[] = '@' . $account['username'] . ': ' . count($entry['posts']) . ' posts';
        }
        set_config('instagramgood', $now, $c);
        unset_config('instagramerror', $c);
        // The pictures of posts no longer among the last ones go.
        foreach ($fs->get_area_files($context->id, files::COMPONENT, self::AREA, 0, 'id', false) as $file) {
            if (!isset($keep[$file->get_filename()])) {
                $file->delete();
            }
        }
        $fs->delete_area_files($context->id, files::COMPONENT, self::AREA, self::LIST_ITEM);
        $record = ['contextid' => $context->id, 'component' => files::COMPONENT, 'filearea' => self::AREA,
            'itemid' => self::LIST_ITEM, 'filepath' => '/', 'filename' => self::LIST_NAME];
        $fs->create_file_from_string($record, json_encode(['accounts' => $list]));
        return implode(', ', $said);
    }

    /**
     * Every Instagram account of the key, the centre's own first (the one named, or the first). Pure.
     *
     * @param array $pages the «data» of /me/accounts
     * @param string $wanted the centre's own account's name, or ''
     * @return array[] id, username, title (its page's name), count, picture (an address, or '')
     */
    public static function accounts_of(array $pages, string $wanted): array {
        $found = [];
        foreach ($pages as $page) {
            $account = $page['instagram_business_account'] ?? null;
            if (!is_array($account) || !preg_match('/^\d+$/', (string) ($account['id'] ?? '')) || isset($found[$account['id']])) {
                continue;
            }
            $picture = (string) ($account['profile_picture_url'] ?? '');
            $found[(string) $account['id']] = ['id' => (string) $account['id'], 'username' => (string) ($account['username'] ?? ''),
                'title' => items::plain((string) ($page['name'] ?? '')), 'count' => (int) ($account['media_count'] ?? 0),
                'picture' => preg_match('~^https://\S+$~i', $picture) ? $picture : ''];
        }
        $found = array_values($found);
        foreach ($found as $i => $account) {
            if ($wanted !== '' && strcasecmp($account['username'], $wanted) === 0) {
                array_unshift($found, $account);
                unset($found[$i + 1]);
                break;
            }
        }
        return array_slice(array_values($found), 0, self::ACCOUNTS_MOST);
    }

    /**
     * What the centre chose for each account: its way, its words and its groups.
     *
     * @return array[] by the account's id: show, words, groups
     */
    public static function settings(): array {
        $saved = json_decode((string) get_config('local_oksigeniahechauka', 'instagramaccounts'), true);
        return is_array($saved) ? $saved : [];
    }

    /**
     * The way of an account: what the centre chose; else all of the centre's own account and nothing of the others.
     *
     * @param array $account id, username
     * @param array $settings
     * @param bool $own whether it is the centre's own account
     * @return string off, all or centre
     */
    public static function show_of(array $account, array $settings, bool $own): string {
        $chosen = (string) ($settings[$account['id']]['show'] ?? '');
        return in_array($chosen, self::SHOWS) ? $chosen : ($own ? 'all' : 'off');
    }

    /**
     * The words that make a post speak of the centre: the account's own, else the centre's name. The centre's Instagram
     * account always does.
     *
     * @param string $id the account's id
     * @param array $settings
     * @param string[] $always what always counts (the centre's own account)
     * @return string[]
     */
    public static function words_of(string $id, array $settings, array $always): array {
        $own = self::split((string) ($settings[$id]['words'] ?? ''));
        return array_values(array_unique(array_merge($own ?: [manifest::centre_name()], $always)));
    }

    /**
     * What always makes a post speak of the centre: its own Instagram account (the first of the key: the one of «Our
     * networks», or the first), as «@account».
     *
     * @param array[] $accounts the accounts of the key, the centre's own first; none, those of the last reading
     * @return string[]
     */
    protected static function words_wanted(?array $accounts = null): array {
        $accounts = $accounts ?? self::saved();
        $own = (string) ($accounts[0]['username'] ?? self::wanted());
        return $own === '' ? [] : ['@' . $own];
    }

    /**
     * Words written by a person, one by one: split by commas, trimmed, without the empty ones and repeated. Pure.
     *
     * @param string $text
     * @return string[]
     */
    public static function split(string $text): array {
        $out = [];
        foreach (explode(',', $text) as $word) {
            $word = \core_text::substr(trim(preg_replace('/\s+/u', ' ', $word)), 0, 60);
            if ($word !== '' && !in_array(\core_text::strtolower($word), array_map('core_text::strtolower', $out))) {
                $out[] = $word;
            }
        }
        return array_slice($out, 0, 12);
    }

    /**
     * Whether a post's text names one of the words: without minding capitals or accents. Pure.
     *
     * @param string $caption
     * @param string[] $words
     * @return bool
     */
    public static function speaks_of(string $caption, array $words): bool {
        $plain = function (string $text): string {
            return \core_text::strtolower(\core_text::specialtoascii($text));
        };
        $text = $plain($caption);
        foreach ($words as $word) {
            $word = $plain(trim($word));
            if ($word !== '' && strpos($text, $word) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * Whether a post is still news: from the last 90 days, or without a date. Pure.
     *
     * @param string $timestamp as Meta writes it
     * @param int $now
     * @return bool
     */
    public static function fresh(string $timestamp, int $now): bool {
        $time = $timestamp === '' ? false : strtotime($timestamp);
        return $time === false || $time >= $now - self::FRESH;
    }

    /**
     * The accounts as the last reading kept them (also a list kept before there were several accounts).
     *
     * @return array[] id, username, title, count, last, posts
     */
    protected static function saved(): array {
        $kept = get_file_storage()->get_file(
            files::context()->id,
            files::COMPONENT,
            self::AREA,
            self::LIST_ITEM,
            '/',
            self::LIST_NAME
        );
        $saved = $kept ? json_decode($kept->get_content(), true) : null;
        if (!is_array($saved)) {
            return [];
        }
        if (isset($saved['posts'])) {
            return [['id' => '', 'username' => (string) ($saved['username'] ?? ''), 'title' => '', 'count' => 0, 'last' => '',
                'posts' => (array) $saved['posts']]];
        }
        return array_values(array_filter((array) ($saved['accounts'] ?? []), 'is_array'));
    }

    /**
     * A reading that failed (a key that no longer works, a version of the Graph API Meta has retired): noted from the first
     * time, for «Your work».
     *
     * @param string $error
     * @param int $now
     * @return string the same, for the log of the task
     */
    protected static function failed(string $error, int $now): string {
        if (!get_config('local_oksigeniahechauka', 'instagramerror')) {
            set_config(
                'instagramerror',
                json_encode(['time' => $now, 'error' => \core_text::substr($error, 0, 200)]),
                'local_oksigeniahechauka'
            );
        }
        return $error;
    }

    /**
     * Since when Instagram cannot be read, and why; null while it reads well.
     *
     * @return array|null {time, error}
     */
    public static function failing(): ?array {
        $c = 'local_oksigeniahechauka';
        if (!get_config($c, 'sourceinstagram')) {
            return null;
        }
        $error = json_decode((string) get_config($c, 'instagramerror'), true);
        return is_array($error) ? $error : null;
    }

    /**
     * The account the centre writes in its «Our networks», when it has one: its own among the accounts of the key.
     *
     * @return string the account's name, without «@», or ''
     */
    protected static function wanted(): string {
        foreach (networks::boxes() as $box) {
            if ($box['network'] === 'instagram') {
                return ltrim((string) $box['account'], '@');
            }
        }
        return '';
    }

    /**
     * One answer of the Graph API, as an array (with «error» when Meta says no), or [] when nothing came.
     *
     * @param string $path
     * @param array $params
     * @param string $token
     * @return array
     */
    protected static function ask(string $path, array $params, string $token): array {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl(['ignoresecurity' => false]);
        // Never more than it may take, while it comes: an answer that does not end does not fill the memory of the task.
        shortener::cap($curl, self::MOST);
        $curl->setopt(['CURLOPT_TIMEOUT' => 20, 'CURLOPT_CONNECTTIMEOUT' => 8]);
        $curl->setHeader(['Authorization: Bearer ' . $token]);
        $body = $curl->get(self::GRAPH . $path, $params);
        $answer = is_string($body) ? json_decode($body, true) : null;
        return is_array($answer) ? $answer : [];
    }

    /**
     * A picture of Meta's servers, or null.
     *
     * @param string $url
     * @return string|null
     */
    protected static function fetch(string $url): ?string {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl(['ignoresecurity' => false]);
        // Never more than it may take, while it comes: an answer that does not end does not fill the memory of the task.
        shortener::cap($curl, self::MOST);
        $curl->setopt(['CURLOPT_TIMEOUT' => 30, 'CURLOPT_CONNECTTIMEOUT' => 8, 'CURLOPT_MAXREDIRS' => 3,
            'CURLOPT_FOLLOWLOCATION' => true]);
        $body = $curl->get($url);
        $info = $curl->get_info();
        if ($curl->get_errno() || (int) ($info['http_code'] ?? 0) !== 200 || !is_string($body) || $body === '') {
            return null;
        }
        return $body;
    }

    /**
     * The posts of each account a screen shows, an item of the contract each: with the QR to follow the account (the
     * address of «Our networks» when it is the same account). The centre's own goes first, with its usual title; the others,
     * with their page's name. Only what is still news, and of an account that shows what speaks of the centre, only that.
     *
     * @param int[]|null $groups the groups of the screen; null, every account
     * @param int|null $now
     * @return array items of the contract
     */
    public static function items(?array $groups = null, ?int $now = null): array {
        $now = $now ?? time();
        $saved = self::saved();
        if (!$saved) {
            return [];
        }
        // A week without a good reading: what came last is no longer the centre's Instagram of now.
        $good = (int) get_config('local_oksigeniahechauka', 'instagramgood');
        if (self::failing() && $good && $now - $good > self::STALE) {
            return [];
        }
        $fs = get_file_storage();
        $context = files::context();
        $settings = self::settings();
        $always = self::words_wanted();
        $words = networks::words('instagram', 'Instagram');
        $out = [];
        foreach ($saved as $i => $account) {
            $id = (string) $account['id'];
            $show = $id === '' ? 'all' : self::show_of($account, $settings, $i === 0);
            $only = array_map('intval', (array) ($settings[$id]['groups'] ?? []));
            if ($show === 'off' || ($only && $groups !== null && !array_intersect($only, $groups))) {
                continue;
            }
            $username = (string) ($account['username'] ?? '');
            $web = $username !== '' ? 'https://www.instagram.com/' . rawurlencode($username) . '/' : '';
            foreach (networks::boxes() as $box) {
                $same = $username === '' || strcasecmp(ltrim((string) $box['account'], '@'), $username) === 0;
                if ($box['network'] === 'instagram' && $box['url'] !== '' && $same) {
                    $web = $box['url'];
                }
            }
            $posts = [];
            foreach ((array) ($account['posts'] ?? []) as $post) {
                if (
                    !self::fresh((string) ($post['timestamp'] ?? ''), $now) || ($show === 'centre' &&
                        !self::speaks_of((string) ($post['caption'] ?? ''), self::words_of($id, $settings, $always)))
                ) {
                    continue;
                }
                $media = [];
                foreach ((array) ($post['files'] ?? []) as $name) {
                    $file = $fs->get_file($context->id, files::COMPONENT, self::AREA, 0, '/', (string) $name);
                    if ($file) {
                        $media[] = files::media($file);
                    }
                }
                if ($media) {
                    $posts[] = ['id' => (string) $post['id'], 'media_type' => (string) $post['media_type'],
                        'caption' => (string) $post['caption'], 'timestamp' => (string) $post['timestamp'], 'media' => $media];
                }
            }
            if (!$posts || $web === '') {
                continue;
            }
            $own = $i === 0;
            $title = $own || (string) ($account['title'] ?? '') === '' ? $words['title'] : (string) $account['title'];
            $out[] = ['id' => $own ? 'instagram' : 'instagram-' . $id, 'type' => 'instagram', 'zone' => 'extra',
                'network' => 'instagram', 'title' => $title, 'name' => $username !== '' ? '@' . $username : '', 'web' => $web,
                'posts' => $posts];
        }
        return $out;
    }

    /**
     * The accounts in «Your centre»: each with its picture, its way, its words and its screens. Empty without a key or
     * before a first reading.
     *
     * @param int $now
     * @return array save, sesskey, accounts
     */
    public static function panel(int $now): array {
        if (self::token() === '' || !get_config('local_oksigeniahechauka', 'sourceinstagram')) {
            return [];
        }
        $saved = array_values(array_filter(self::saved(), function ($account) {
            return (string) $account['id'] !== '';
        }));
        if (!$saved) {
            return [];
        }
        global $DB;
        $settings = self::settings();
        $always = self::words_wanted();
        $groups = $DB->get_records('local_oksigeniahechauka_group', null, 'name', 'id, name');
        $fs = get_file_storage();
        $context = files::context();
        $day = function (int $time): string {
            return userdate($time, get_string('strftimedate', 'langconfig'));
        };
        $accounts = [];
        foreach ($saved as $i => $account) {
            $id = (string) $account['id'];
            $show = self::show_of($account, $settings, $i === 0);
            $only = array_map('intval', (array) ($settings[$id]['groups'] ?? []));
            $face = $fs->get_file($context->id, files::COMPONENT, self::AREA, 0, '/', 'perfil-' . $id . '.jpg');
            $last = (string) ($account['last'] ?? '') === '' ? false : strtotime((string) $account['last']);
            $accounts[] = [
                'id' => $id,
                'username' => (string) $account['username'],
                'title' => (string) ($account['title'] ?? ''),
                'picture' => $face ? \moodle_url::make_pluginfile_url(
                    $context->id,
                    files::COMPONENT,
                    self::AREA,
                    0,
                    '/',
                    $face->get_filename()
                )->out(false) : '',
                'count' => (int) ($account['count'] ?? 0),
                'last' => $last ? get_string('ig_on', 'local_oksigeniahechauka', $day($last)) : '',
                'stale' => $show !== 'off' && $last !== false && !self::fresh((string) $account['last'], $now),
                'show' => $show,
                'words' => implode(', ', self::words_of($id, $settings, [])),
                'always' => implode(', ', $always),
                'all' => !$only,
                'groups' => array_values(array_map(function ($g) use ($only) {
                    return ['id' => (int) $g->id, 'name' => format_string($g->name), 'checked' => in_array((int) $g->id, $only)];
                }, $groups)),
            ];
        }
        return ['hasaccounts' => true, 'save' => (new \moodle_url('/local/oksigeniahechauka/instagram.php'))->out(false),
            'sesskey' => sesskey(), 'accounts' => $accounts];
    }

    /**
     * Keeps what the centre chose for an account, and reads again within five minutes: what shows may have changed.
     *
     * @param string $id the account's id, one the last reading found
     * @param string $show off, all or centre
     * @param string $words separated by commas
     * @param int[] $groups none, every screen
     * @return bool whether it was an account of the key
     */
    public static function change(string $id, string $show, string $words, array $groups): bool {
        global $DB;
        $known = array_filter(self::saved(), function ($account) use ($id) {
            return $id !== '' && (string) $account['id'] === $id;
        });
        if (!$known || !in_array($show, self::SHOWS)) {
            return false;
        }
        $groups = array_values(array_filter(array_unique(array_map('intval', $groups)), function ($g) use ($DB) {
            return $g > 0 && $DB->record_exists('local_oksigeniahechauka_group', ['id' => $g]);
        }));
        $settings = self::settings();
        $settings[$id] = ['show' => $show, 'words' => implode(', ', self::split($words)), 'groups' => $groups];
        set_config('instagramaccounts', json_encode($settings), 'local_oksigeniahechauka');
        unset_config('instagramtried', 'local_oksigeniahechauka');
        return true;
    }
}
