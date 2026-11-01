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
 * Where the school is, for the weather («Tu centro»): the places that match what one writes, and a small locator map
 * drawn by the plugin itself, without any map service: the land of Natural Earth's 1:50m outlines (public domain,
 * data/land.json, simplified to about 1.5 km), cropped 640 km wide around the point, a grid of degrees and a 100 km
 * bar, in a 320 × 200 box.
 *
 * Nominatim's policy does not allow searching as one types: the search runs on «Buscar», from the server, with the
 * plugin's own User-Agent.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class place {
    /** @var string */
    const C = 'local_oksigeniahechauka';

    /** @var float Pixels of the map per kilometre: 320 px are 640 km. */
    const PXKM = 0.5;

    /**
     * The places that match a text, or the point of «latitud, longitud».
     *
     * @param string $text
     * @return array [{name, detail, lat, lon}], up to six
     */
    public static function search(string $text): array {
        $text = trim($text);
        if ($text === '') {
            return [];
        }
        if (preg_match('/^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/', $text, $m)) {
            $lat = (float) str_replace(',', '.', $m[1]);
            $lon = (float) str_replace(',', '.', $m[2]);
            if (abs($lat) > 90 || abs($lon) > 180) {
                return [];
            }
            return [['name' => self::degrees(round($lat, 4), round($lon, 4)), 'detail' => '', 'lat' => round($lat, 4),
                'lon' => round($lon, 4)]];
        }
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl(['ignoresecurity' => false]);
        $curl->setHeader(['User-Agent: ' . weather::AGENT, 'Accept: application/json']);
        $body = $curl->get('https://nominatim.openstreetmap.org/search', ['q' => $text, 'format' => 'jsonv2',
            'limit' => 6, 'addressdetails' => 1, 'accept-language' => current_language()], ['CURLOPT_TIMEOUT' => 15]);
        return self::results(json_decode((string) $body, true));
    }

    /**
     * Nominatim's answer as places: the town first, then its province and region.
     *
     * @param mixed $list
     * @return array
     */
    public static function results($list): array {
        $out = [];
        foreach (is_array($list) ? $list : [] as $r) {
            if (!isset($r['lat'], $r['lon'])) {
                continue;
            }
            $a = $r['address'] ?? [];
            $name = $a['city'] ?? $a['town'] ?? $a['village'] ?? $a['municipality'] ?? $a['hamlet'] ?? '';
            $parts = array_map('trim', explode(',', (string) ($r['display_name'] ?? '')));
            if ($name === '') {
                $name = $parts[0] ?? '';
            }
            $detail = array_values(array_unique(array_filter([$a['county'] ?? $a['province'] ?? '', $a['state'] ?? '',
                $a['country'] ?? ''], function ($p) use ($name) {
                    return $p !== '' && $p !== $name;
                })));
            $key = $name . '|' . implode('|', $detail);
            if ($name === '' || isset($out[$key])) {
                continue;
            }
            $out[$key] = ['name' => $name, 'detail' => implode(', ', $detail), 'lat' => round((float) $r['lat'], 4),
                'lon' => round((float) $r['lon'], 4)];
        }
        return array_values($out);
    }

    /**
     * «28,4853° N · 16,3201° O», with the decimal mark of the language.
     *
     * @param float $lat
     * @param float $lon
     * @return string
     */
    public static function degrees(float $lat, float $lon): string {
        $c = self::C;
        $n = function (float $v): string {
            return format_float(abs($v), 4, true, false);
        };
        return $n($lat) . '° ' . get_string($lat >= 0 ? 'place_north' : 'place_south', $c) . ' · ' .
            $n($lon) . '° ' . get_string($lon >= 0 ? 'place_east' : 'place_west', $c);
    }

    /**
     * The locator map around a point: the land as an SVG path, the grid of degrees, how long 100 km is.
     *
     * @param float $lat
     * @param float $lon
     * @return array land, grid, km100 (pixels)
     */
    public static function map(float $lat, float $lon): array {
        global $CFG;
        $kmlat = 111.32;
        $kmlon = max(1.0, 111.32 * cos(deg2rad($lat)));
        $halfw = 160 / (self::PXKM * $kmlon);
        $halfh = 100 / (self::PXKM * $kmlat);
        // The box a little larger than the view, in hundredths of a degree: what crosses its edge is cut there.
        $box = [($lon - $halfw * 1.1) * 100, ($lat - $halfh * 1.1) * 100, ($lon + $halfw * 1.1) * 100,
            ($lat + $halfh * 1.1) * 100];
        $x = function (float $h) use ($lon, $kmlon): float {
            return 160 + ($h / 100 - $lon) * $kmlon * self::PXKM;
        };
        $y = function (float $v) use ($lat, $kmlat): float {
            return 100 - ($v / 100 - $lat) * $kmlat * self::PXKM;
        };
        $data = json_decode((string) file_get_contents($CFG->dirroot . '/local/oksigeniahechauka/data/land.json'), true);
        $paths = [];
        foreach ($data['rings'] ?? [] as $ring) {
            if ($ring[2] < $box[0] || $ring[0] > $box[2] || $ring[3] < $box[1] || $ring[1] > $box[3]) {
                continue;
            }
            $flat = $ring[4];
            $points = [[$flat[0], $flat[1]]];
            for ($i = 2; $i + 1 < count($flat); $i += 2) {
                $last = $points[count($points) - 1];
                $points[] = [$last[0] + $flat[$i], $last[1] + $flat[$i + 1]];
            }
            $points = self::clip($points, $box);
            if (count($points) < 3) {
                continue;
            }
            $d = '';
            foreach ($points as $k => $p) {
                $d .= ($k ? 'L' : 'M') . round($x($p[0]), 1) . ' ' . round($y($p[1]), 1);
            }
            $paths[] = $d . 'Z';
        }
        $grid = '';
        for ($g = (int) floor($lon - $halfw); $g <= (int) ceil($lon + $halfw); $g++) {
            $grid .= 'M' . round($x($g * 100), 1) . ' 0V200';
        }
        for ($g = (int) floor($lat - $halfh); $g <= (int) ceil($lat + $halfh); $g++) {
            $grid .= 'M0 ' . round($y($g * 100), 1) . 'H320';
        }
        return ['land' => implode(' ', $paths), 'grid' => $grid, 'km100' => (int) round(100 * self::PXKM)];
    }

    /**
     * A ring cut to a box (Sutherland–Hodgman, one edge after another).
     *
     * @param array $points [[x, y], …]
     * @param array $box [minx, miny, maxx, maxy]
     * @return array
     */
    protected static function clip(array $points, array $box): array {
        $edges = [
            [0, $box[0], true], [0, $box[2], false], [1, $box[1], true], [1, $box[3], false],
        ];
        foreach ($edges as [$axis, $limit, $min]) {
            $inside = function (array $p) use ($axis, $limit, $min): bool {
                return $min ? $p[$axis] >= $limit : $p[$axis] <= $limit;
            };
            $cut = function (array $a, array $b) use ($axis, $limit): array {
                $t = ($limit - $a[$axis]) / (($b[$axis] - $a[$axis]) ?: 1e-9);
                return [$a[0] + ($b[0] - $a[0]) * $t, $a[1] + ($b[1] - $a[1]) * $t];
            };
            $out = [];
            $n = count($points);
            for ($i = 0; $i < $n; $i++) {
                $cur = $points[$i];
                $prev = $points[($i + $n - 1) % $n];
                if ($inside($cur)) {
                    if (!$inside($prev)) {
                        $out[] = $cut($prev, $cur);
                    }
                    $out[] = $cur;
                } else if ($inside($prev)) {
                    $out[] = $cut($prev, $cur);
                }
            }
            $points = $out;
            if (!$points) {
                break;
            }
        }
        return $points;
    }

    /**
     * The place chosen: the same settings as the administration (location, its point and its name), its map, and its
     * weather at once.
     *
     * @param string $name
     * @param string $detail
     * @param float $lat
     * @param float $lon
     * @param int $now
     * @return void
     */
    public static function choose(string $name, string $detail, float $lat, float $lon, int $now): void {
        $c = self::C;
        set_config('location', $name, $c);
        set_config('lat', round($lat, 4), $c);
        set_config('lon', round($lon, 4), $c);
        set_config('place', $detail !== '' ? $name . ', ' . $detail : $name, $c);
        set_config('placemap', json_encode(self::map($lat, $lon)), $c);
        foreach (['weatherdata', 'weathermodified'] as $setting) {
            unset_config($setting, $c);
        }
        set_config('weatherexpires', 0, $c);
        // Its weather now, for the card that confirms it; if the service does not answer, the task brings it.
        weather::fetch($now);
    }
}
