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
 * The sites of a centre: a group of screens somewhere else (a camp, another campus, a branch) with its own name, place and
 * weather, and logos. Its screens take them instead of the centre's; everything else is the centre's.
 *
 * Kept in the plugin's settings with the group as a suffix, the same keys the centre uses: «lat_g5», «weatherdata_g5»…
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class sites {
    /** The plugin. */
    const C = 'local_oksigeniahechauka';

    /** What a site keeps, each with the group as a suffix. */
    const KEYS = ['site', 'sitename', 'location', 'lat', 'lon', 'place', 'placemap', 'weatherdata', 'weatherexpires',
        'weathermodified'];

    /**
     * The suffix of a group's settings.
     *
     * @param int $groupid
     * @return string
     */
    public static function suffix(int $groupid): string {
        return '_g' . $groupid;
    }

    /**
     * Whether a group is a site.
     *
     * @param int $groupid
     * @param \stdClass|null $config the plugin's, if already read
     * @return bool
     */
    public static function is_site(int $groupid, ?\stdClass $config = null): bool {
        $config = $config ?? get_config(self::C);
        return !empty($config->{'site' . self::suffix($groupid)});
    }

    /**
     * Whether a site has a place of its own.
     *
     * @param int $groupid
     * @param \stdClass|null $config
     * @return bool
     */
    public static function has_place(int $groupid, ?\stdClass $config = null): bool {
        $config = $config ?? get_config(self::C);
        $suffix = self::suffix($groupid);
        return !empty($config->{'lat' . $suffix}) && !empty($config->{'lon' . $suffix});
    }

    /**
     * What a site is called on its screens: its own name, or the group's.
     *
     * @param int $groupid
     * @param \stdClass|null $config
     * @return string
     */
    public static function name(int $groupid, ?\stdClass $config = null): string {
        global $DB;
        $config = $config ?? get_config(self::C);
        $own = trim((string) ($config->{'sitename' . self::suffix($groupid)} ?? ''));
        if ($own !== '') {
            return $own;
        }
        return items::plain((string) $DB->get_field('local_oksigeniahechauka_group', 'name', ['id' => $groupid]));
    }

    /**
     * The site of a screen: the first of its groups, in the order of the groups, that is one.
     *
     * @param int $screenid
     * @return int|null the group, or null if the screen is the centre's
     */
    public static function of_screen(int $screenid): ?int {
        global $DB;
        if (!$screenid) {
            return null;
        }
        $config = get_config(self::C);
        $groups = $DB->get_fieldset_sql('SELECT g.id
                                           FROM {local_oksigeniahechauka_group} g
                                           JOIN {local_oksigeniahechauka_member} m ON m.groupid = g.id
                                          WHERE m.screenid = ?
                                       ORDER BY g.sortorder, g.name', [$screenid]);
        foreach ($groups as $groupid) {
            if (self::is_site((int) $groupid, $config)) {
                return (int) $groupid;
            }
        }
        return null;
    }

    /**
     * The groups that are sites.
     *
     * @return int[]
     */
    public static function all(): array {
        global $DB;
        $config = get_config(self::C);
        $groups = array_map('intval', $DB->get_fieldset_select('local_oksigeniahechauka_group', 'id', '1 = 1'));
        return array_values(array_filter($groups, function ($id) use ($config) {
            return self::is_site($id, $config);
        }));
    }

    /**
     * Makes a group a site, with a name of its own if it has one.
     *
     * @param int $groupid
     * @param string $name empty for the group's
     * @return void
     */
    public static function set(int $groupid, string $name): void {
        set_config('site' . self::suffix($groupid), 1, self::C);
        set_config('sitename' . self::suffix($groupid), \core_text::substr(trim($name), 0, 60), self::C);
    }

    /**
     * Its logo for the light or the dark theme, if it has one.
     *
     * @param int $groupid
     * @param bool $dark
     * @return \stored_file|null
     */
    public static function logo(int $groupid, bool $dark = false): ?\stored_file {
        return files::first($dark ? files::LOGODARK : files::LOGO, $groupid);
    }

    /**
     * Keeps a logo sent with the form.
     *
     * @param int $groupid
     * @param bool $dark
     * @param array|null $upload one file of $_FILES
     * @return bool whether it was kept
     */
    public static function save_logo(int $groupid, bool $dark, ?array $upload): bool {
        if (empty($upload['name']) || !empty($upload['error']) || !is_uploaded_file($upload['tmp_name'])) {
            return false;
        }
        $ext = strtolower(pathinfo($upload['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['svg', 'png', 'jpg', 'jpeg', 'webp']) || $upload['size'] > 2 * 1024 * 1024) {
            return false;
        }
        $area = $dark ? files::LOGODARK : files::LOGO;
        $fs = get_file_storage();
        $context = files::context();
        $fs->delete_area_files($context->id, self::C, $area, $groupid);
        $fs->create_file_from_pathname(['contextid' => $context->id, 'component' => self::C, 'filearea' => $area,
            'itemid' => $groupid, 'filepath' => '/', 'filename' => clean_filename($upload['name'])], $upload['tmp_name']);
        return true;
    }

    /**
     * Stops being a site: its screens go back to the centre's name, place and logos.
     *
     * @param int $groupid
     * @return void
     */
    public static function forget(int $groupid): void {
        foreach (self::KEYS as $key) {
            unset_config($key . self::suffix($groupid), self::C);
        }
        $fs = get_file_storage();
        foreach ([files::LOGO, files::LOGODARK] as $area) {
            $fs->delete_area_files(files::context()->id, self::C, $area, $groupid);
        }
    }

    /**
     * Brings the weather of every site with a place of its own.
     *
     * @param int $now
     * @return array groupid => what happened
     */
    public static function fetch_weather(int $now): array {
        $out = [];
        $config = get_config(self::C);
        foreach (self::all() as $groupid) {
            if (self::has_place($groupid, $config)) {
                $out[$groupid] = weather::fetch($now, self::suffix($groupid));
            }
        }
        return $out;
    }
}
