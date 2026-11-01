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

/**
 * The items made in the panel.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_oksigeniahechauka\local;

/**
 * A picture or a video, a notice, an event or a line of the ticker, and where it goes.
 */
class items {
    /** The types the panel makes. */
    const TYPES = ['media', 'notice', 'event', 'ticker', 'agenda', 'urgent'];

    /**
     * A text for the screens: through the filters (multilang), as plain text. The player writes it with textContent,
     * so it must not come escaped («AMPA & Dirección», not «AMPA &amp; Dirección»).
     *
     * @param string $text
     * @return string
     */
    public static function plain(string $text): string {
        $t = format_string($text, true, ['context' => files::context(), 'escape' => false]);
        return trim(html_entity_decode(strip_tags($t), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }

    /**
     * The extra data of an item.
     *
     * @param \stdClass $item
     * @return array
     */
    public static function data(\stdClass $item): array {
        $data = json_decode((string) ($item->data ?? ''), true);
        return is_array($data) ? $data : [];
    }

    /**
     * An item as the contract says it, or null when it cannot be shown (a picture without its file).
     *
     * @param \stdClass $record
     * @return array|null
     */
    public static function to_contract(\stdClass $record): ?array {
        $data = self::data($record);
        $item = ['id' => 'i' . $record->id, 'order' => (int) $record->sortorder];
        if ($record->duration > 0) {
            $item['duration'] = (int) $record->duration;
        }
        $when = schedule::when($record);
        if ($when) {
            $item['when'] = $when;
        }
        $title = self::plain((string) $record->title);
        // Plain text typed in the panel: the player writes it with textContent, never as markup.
        $body = trim(strip_tags((string) $record->body));
        switch ($record->type) {
            case 'media':
                return self::media_item($record, $item, $data, $title, $body);
            case 'notice':
                return $item + ['type' => 'notice', 'zone' => 'side', 'title' => $title, 'body' => $body,
                    'tone' => !empty($data['important']) ? 'important' : 'normal'];
            case 'event':
                if (empty($data['start'])) {
                    return null;
                }
                $event = $item + ['type' => 'event', 'zone' => 'side', 'title' => $title,
                    'start' => schedule::stamp((int) $data['start'])];
                // The centre's category chosen for it (its position on the screens); without one, by its words.
                $category = categories::resolve($data['category'] ?? ($data['color'] ?? 0));
                if ($category) {
                    $event['color'] = $category;
                }
                if (!empty($data['end']) && $data['end'] > $data['start']) {
                    $event['end'] = schedule::stamp((int) $data['end']);
                }
                if ($body !== '') {
                    $event['detail'] = sources::line($body, 60);
                }
                if (!isset($event['when'])) {
                    $event['when'] = ['from' => schedule::day((int) $data['start']),
                        'until' => schedule::day((int) ($data['end'] ?? $data['start']))];
                }
                return $event;
            case 'ticker':
                return $item + ['type' => 'ticker', 'zone' => 'ticker', 'text' => $title];
            case 'urgent':
                $urgent = $item + ['type' => 'urgent', 'zone' => 'urgent', 'title' => $title, 'body' => $body];
                if (!empty($data['ends'])) {
                    $urgent['ends'] = schedule::stamp((int) $data['ends']);
                }
                return $urgent;
            case 'agenda':
                // Its events, one by one: agendas::contract().
                return null;
        }
        return null;
    }

    /**
     * A picture or a video.
     *
     * @param \stdClass $record
     * @param array $item what the item has so far
     * @param array $data
     * @param string $title
     * @param string $body
     * @return array|null
     */
    protected static function media_item(
        \stdClass $record,
        array $item,
        array $data,
        string $title,
        string $body
    ): ?array {
        $original = files::first(files::MEDIA, (int) $record->id);
        if (!$original) {
            return null;
        }
        $isvideo = video::is_video($original);
        if ($isvideo && video::held($data, time())) {
            // Being made ready for the screens: it arrives in a few minutes, and never half done.
            return null;
        }
        $item['type'] = $isvideo ? 'video' : 'image';
        $item['zone'] = 'main';
        $item['fit'] = in_array($data['fit'] ?? '', ['cover', 'contain', 'blur']) ? $data['fit'] : 'cover';
        if ($isvideo) {
            $ready = files::first(files::VIDEO, (int) $record->id);
            $extra = !empty($data['videoduration']) ? ['duration' => (float) $data['videoduration']] : [];
            $item['media'] = files::media($ready ?: $original, $extra);
            if (!empty($data['videowidth'])) {
                $item['media']['width'] = (int) $data['videowidth'];
                $item['media']['height'] = (int) $data['videoheight'];
            }
            $poster = files::first(files::POSTER, (int) $record->id);
            if ($poster) {
                $item['poster'] = files::media($poster);
            }
            $backdrop = files::first(files::BACKDROP, (int) $record->id);
            if ($backdrop) {
                $item['backdrop'] = files::media($backdrop);
            }
        } else {
            $item['media'] = files::media($original);
            if (!empty($data['focus']) && is_array($data['focus']) && count($data['focus']) === 2) {
                $item['focus'] = [(float) $data['focus'][0], (float) $data['focus'][1]];
            }
        }
        if (!empty($data['caption']) && ($title !== '' || $body !== '')) {
            $item['caption'] = array_filter(['title' => $title, 'text' => $body]);
        }
        if (!empty($data['web']) && preg_match('#^https?://#i', (string) $data['web'])) {
            // Its web, for a QR on the screen and the address written short under it.
            $item['web'] = (string) $data['web'];
        }
        return $item;
    }

    /**
     * Whether a screen may read the files of an item: the item is published and reaches the screen.
     *
     * @param int $itemid
     * @param int $screenid
     * @return bool
     */
    public static function reaches(int $itemid, int $screenid): bool {
        global $DB;
        $sql = "SELECT 1
                  FROM {local_oksigeniahechauka_item} i
                 WHERE i.id = :item AND i.visible = 1
                       AND (i.targetall = 1
                            OR EXISTS (SELECT 1 FROM {local_oksigeniahechauka_target} t
                                        WHERE t.itemid = i.id AND t.screenid = :screen1)
                            OR EXISTS (SELECT 1 FROM {local_oksigeniahechauka_target} t
                                         JOIN {local_oksigeniahechauka_member} m ON m.groupid = t.groupid
                                        WHERE t.itemid = i.id AND m.screenid = :screen2))";
        return $DB->record_exists_sql($sql, ['item' => $itemid, 'screen1' => $screenid, 'screen2' => $screenid]);
    }

    /**
     * Where an item goes: every screen, or its groups and screens.
     *
     * @param \stdClass $item
     * @return array ['all' => bool, 'groups' => int[], 'screens' => int[]]
     */
    public static function targets(\stdClass $item): array {
        global $DB;
        $out = ['all' => (bool) $item->targetall, 'groups' => [], 'screens' => []];
        foreach ($DB->get_records('local_oksigeniahechauka_target', ['itemid' => $item->id]) as $t) {
            if ($t->groupid) {
                $out['groups'][] = (int) $t->groupid;
            } else if ($t->screenid) {
                $out['screens'][] = (int) $t->screenid;
            }
        }
        return $out;
    }

    /**
     * Sets where an item goes.
     *
     * @param int $itemid
     * @param int[] $groups
     * @param int[] $screens
     * @return void
     */
    public static function set_targets(int $itemid, array $groups, array $screens): void {
        global $DB;
        $DB->delete_records('local_oksigeniahechauka_target', ['itemid' => $itemid]);
        foreach (array_unique(array_map('intval', $groups)) as $g) {
            $DB->insert_record('local_oksigeniahechauka_target', (object) ['itemid' => $itemid, 'groupid' => $g]);
        }
        foreach (array_unique(array_map('intval', $screens)) as $s) {
            $DB->insert_record('local_oksigeniahechauka_target', (object) ['itemid' => $itemid, 'screenid' => $s]);
        }
    }

    /**
     * Whether an urgent notice is on: published, and its end (if it has one) has not come.
     *
     * @param \stdClass $item
     * @param int $now
     * @return bool
     */
    public static function urgent_on(\stdClass $item, int $now): bool {
        $ends = (int) (self::data($item)['ends'] ?? 0);
        return $item->type === 'urgent' && !empty($item->visible) && (!$ends || $ends > $now);
    }

    /**
     * Whether an item can be copied: not an agenda (its events come from outside) nor an urgent notice (it is for now).
     *
     * @param \stdClass $item
     * @return bool
     */
    public static function copyable(\stdClass $item): bool {
        return in_array($item->type, ['media', 'notice', 'event', 'ticker'], true);
    }

    /**
     * A copy of an item to change and publish: the same content, the same destinations and its files, still unpublished,
     * of whoever copies it.
     *
     * @param \stdClass $item
     * @param int $userid
     * @param int $now
     * @return int the new item's id
     */
    public static function duplicate(\stdClass $item, int $userid, int $now): int {
        global $DB;
        $copy = clone $item;
        unset($copy->id);
        $copy->visible = 0;
        $copy->createdby = $userid;
        $copy->usermodified = $userid;
        $copy->timecreated = $now;
        $copy->timemodified = $now;
        $id = (int) $DB->insert_record('local_oksigeniahechauka_item', $copy);
        $targets = self::targets($item);
        self::set_targets($id, $targets['groups'], $targets['screens']);
        $fs = get_file_storage();
        $context = files::context();
        foreach ([files::MEDIA, files::VIDEO, files::POSTER, files::BACKDROP] as $area) {
            foreach ($fs->get_area_files($context->id, files::COMPONENT, $area, (int) $item->id, 'id', false) as $file) {
                $fs->create_file_from_storedfile(['itemid' => $id], $file);
            }
        }
        return $id;
    }

    /**
     * Deletes an item, its targets and its files.
     *
     * @param int $itemid
     * @return void
     */
    public static function delete(int $itemid): void {
        global $DB;
        $fs = get_file_storage();
        foreach ([files::MEDIA, files::VIDEO, files::POSTER, files::BACKDROP] as $area) {
            $fs->delete_area_files(files::context()->id, files::COMPONENT, $area, $itemid);
        }
        agendas::delete($itemid);
        $DB->delete_records('local_oksigeniahechauka_target', ['itemid' => $itemid]);
        $DB->delete_records('local_oksigeniahechauka_item', ['id' => $itemid]);
    }
}
