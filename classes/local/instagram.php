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
 * «On our Instagram»: the centre's last posts on its screens. The server reads them with a key of Meta that never expires
 * (a system user of the centre's business portfolio, with read permissions only), once an hour, and keeps their pictures
 * (a video's cover, a carousel's first ones) among the screens' own files: the screens never ask Meta, and they show what
 * they have without a network.
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

    /** @var int The posts the screens get, the newest first. */
    const POSTS_MOST = 12;

    /** @var int The pictures of a carousel the screens get: the slide shows five at most. */
    const PICTURES_MOST = 5;

    /** @var int The biggest picture kept, in bytes. */
    const MOST = 8 * 1024 * 1024;

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
     * @return array[] id, media_type, caption, timestamp, permalink, pictures (addresses)
     */
    public static function posts_of(array $data): array {
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
            if (count($out) >= self::POSTS_MOST) {
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
     * Reads the account's last posts and keeps their pictures, at most once an hour: from the scheduled task of every five
     * minutes. Nothing while the source is off or the site has no key.
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
        $pages = self::ask('me/accounts', ['fields' => 'instagram_business_account{id,username}'], $token);
        $account = self::account_of((array) ($pages['data'] ?? []), self::wanted());
        if (!$account) {
            return 'no Instagram account: ' . (string) ($pages['error']['message'] ?? 'none linked to the key');
        }
        $media = self::ask($account['id'] . '/media', ['fields' => self::FIELDS, 'limit' => self::POSTS_MOST], $token);
        if (!isset($media['data']) || !is_array($media['data'])) {
            return 'no posts: ' . (string) ($media['error']['message'] ?? 'no answer');
        }
        $posts = self::posts_of($media['data']);
        $fs = get_file_storage();
        $context = files::context();
        $keep = [];
        $list = [];
        foreach ($posts as $post) {
            $names = [];
            foreach ($post['pictures'] as $i => $url) {
                $name = $post['id'] . '-' . $i . '.jpg';
                if (!$fs->file_exists($context->id, files::COMPONENT, self::AREA, 0, '/', $name)) {
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
                $list[] = $post + ['files' => $names];
            }
        }
        // The pictures of posts no longer among the last ones go.
        foreach ($fs->get_area_files($context->id, files::COMPONENT, self::AREA, 0, 'id', false) as $file) {
            if (!isset($keep[$file->get_filename()])) {
                $file->delete();
            }
        }
        $fs->delete_area_files($context->id, files::COMPONENT, self::AREA, self::LIST_ITEM);
        $record = ['contextid' => $context->id, 'component' => files::COMPONENT, 'filearea' => self::AREA,
            'itemid' => self::LIST_ITEM, 'filepath' => '/', 'filename' => self::LIST_NAME];
        $fs->create_file_from_string($record, json_encode(['username' => $account['username'], 'posts' => $list]));
        return '@' . $account['username'] . ': ' . count($list) . ' posts';
    }

    /**
     * The account the centre writes in its «Our networks», when it has one: with several accounts on the key, that one.
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
     * The Instagram account of the key: the one named, or the first. Pure.
     *
     * @param array $pages the «data» of /me/accounts
     * @param string $wanted an account's name, or ''
     * @return array|null id, username
     */
    public static function account_of(array $pages, string $wanted): ?array {
        $found = [];
        foreach ($pages as $page) {
            $account = $page['instagram_business_account'] ?? null;
            if (is_array($account) && preg_match('/^\d+$/', (string) ($account['id'] ?? ''))) {
                $found[] = ['id' => (string) $account['id'], 'username' => (string) ($account['username'] ?? '')];
            }
        }
        foreach ($found as $account) {
            if ($wanted !== '' && strcasecmp($account['username'], $wanted) === 0) {
                return $account;
            }
        }
        return $found[0] ?? null;
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
     * The posts as an item of the contract, when the server has them: with the QR to follow the account (the address of «Our
     * networks» when it is the same account).
     *
     * @return array items of the contract
     */
    public static function items(): array {
        $fs = get_file_storage();
        $context = files::context();
        $kept = $fs->get_file($context->id, files::COMPONENT, self::AREA, self::LIST_ITEM, '/', self::LIST_NAME);
        $saved = $kept ? json_decode($kept->get_content(), true) : null;
        if (!is_array($saved) || empty($saved['posts'])) {
            return [];
        }
        $username = (string) ($saved['username'] ?? '');
        // The address of «Our networks» when it is this account's; else the account's own.
        $web = $username !== '' ? 'https://www.instagram.com/' . rawurlencode($username) . '/' : '';
        foreach (networks::boxes() as $box) {
            $same = $username === '' || strcasecmp(ltrim((string) $box['account'], '@'), $username) === 0;
            if ($box['network'] === 'instagram' && $box['url'] !== '' && $same) {
                $web = $box['url'];
            }
        }
        $posts = [];
        foreach ($saved['posts'] as $post) {
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
            return [];
        }
        $words = networks::words('instagram', 'Instagram');
        return [['id' => 'instagram', 'type' => 'instagram', 'zone' => 'extra', 'network' => 'instagram',
            'title' => $words['title'], 'name' => $username !== '' ? '@' . $username : '', 'web' => $web, 'posts' => $posts]];
    }
}
