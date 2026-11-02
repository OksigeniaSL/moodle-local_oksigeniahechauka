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
 * A table is a piece of content like an agenda: a name, the address of a spreadsheet published as CSV, or of a JSON, and where it
 * goes. The server reads it every few minutes and keeps the last good one, so a source that fails leaves the screen as it was.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class tables {
    /** @var int The biggest file read. */
    const MAX_BYTES = 1024 * 1024;

    /** @var int The most rows kept: a screen is not the place for more. */
    const MAX_ROWS = 100;

    /** @var int The most columns kept. */
    const MAX_COLS = 6;

    /** @var int The longest cell. */
    const MAX_CELL = 60;

    /**
     * What a file says, as a head and its rows.
     *
     * @param string $body
     * @return array|null {head, rows}, or null if it is neither a table nor a list
     */
    public static function parse(string $body): ?array {
        $body = trim(preg_replace('/^\xEF\xBB\xBF/', '', $body));
        if ($body === '' || stripos($body, '<html') !== false || stripos($body, '<!doctype') !== false) {
            return null;
        }
        $first = $body[0];
        $rows = $first === '[' || $first === '{' ? self::from_json($body) : self::from_csv($body);
        if (!$rows || count($rows) < 2) {
            return null;
        }
        $head = array_shift($rows);
        $clean = function (array $row) {
            return array_map(function ($cell) {
                return sources::line(is_scalar($cell) ? (string) $cell : '', self::MAX_CELL);
            }, array_slice(array_values($row), 0, self::MAX_COLS));
        };
        $width = min(count($head), self::MAX_COLS);
        $out = [];
        foreach (array_slice($rows, 0, self::MAX_ROWS) as $row) {
            $cells = array_pad($clean($row), $width, '');
            if (implode('', $cells) !== '') {
                $out[] = $cells;
            }
        }
        return $out ? ['head' => $clean($head), 'rows' => $out] : null;
    }

    /**
     * The rows of a JSON: a list of lists, or a list of objects, whose keys are then the head.
     *
     * @param string $body
     * @return array|null
     */
    protected static function from_json(string $body): ?array {
        $data = json_decode($body, true);
        if (!is_array($data) || !$data || !isset($data[0]) || !is_array($data[0])) {
            return null;
        }
        if (array_is_list($data[0])) {
            return $data;
        }
        $keys = array_keys($data[0]);
        $rows = [$keys];
        foreach ($data as $row) {
            if (is_array($row)) {
                $rows[] = array_map(function ($key) use ($row) {
                    return $row[$key] ?? '';
                }, $keys);
            }
        }
        return $rows;
    }

    /**
     * The rows of a CSV, with the separator its first line uses.
     *
     * @param string $body
     * @return array|null
     */
    protected static function from_csv(string $body): ?array {
        $line = strtok($body, "\n");
        $separator = ',';
        $most = 0;
        foreach ([',', ';', "\t"] as $candidate) {
            $count = substr_count((string) $line, $candidate);
            if ($count > $most) {
                $most = $count;
                $separator = $candidate;
            }
        }
        if (!$most) {
            return null;
        }
        $handle = fopen('php://memory', 'r+');
        fwrite($handle, $body);
        rewind($handle);
        $rows = [];
        while (($row = fgetcsv($handle, 0, $separator, '"', '')) !== false && count($rows) <= self::MAX_ROWS) {
            if ($row !== [null]) {
                $rows[] = $row;
            }
        }
        fclose($handle);
        return $rows;
    }

    /**
     * Reads a table and keeps it; if it fails, the last good one stays, and it says what happened.
     *
     * @param int $itemid
     * @param int $now
     * @return string ok or the error
     */
    public static function fetch(int $itemid, int $now): string {
        global $CFG, $DB;
        $item = $DB->get_record('local_oksigeniahechauka_item', ['id' => $itemid, 'type' => 'table']);
        if (!$item) {
            return 'gone';
        }
        $data = items::data($item);
        $url = (string) ($data['url'] ?? '');
        $result = 'ok';
        if (!preg_match('#^https?://#i', $url)) {
            $result = 'url';
        } else {
            require_once($CFG->libdir . '/filelib.php');
            $curl = new \curl(['ignoresecurity' => false]);
            $curl->setHeader(['User-Agent: ' . weather::AGENT, 'Accept: text/csv, application/json, */*']);
            $body = $curl->get($url, [], ['CURLOPT_TIMEOUT' => 30, 'CURLOPT_CONNECTTIMEOUT' => 10,
                'CURLOPT_MAXFILESIZE' => self::MAX_BYTES, 'CURLOPT_FOLLOWLOCATION' => true, 'CURLOPT_MAXREDIRS' => 3]);
            $code = (int) ($curl->get_info()['http_code'] ?? 0);
            if ($curl->get_errno() || $code !== 200) {
                $result = $curl->get_errno() ? 'network' : 'http ' . $code;
            } else {
                $table = self::parse((string) $body);
                if ($table) {
                    $data['table'] = $table;
                    $data['count'] = count($table['rows']);
                } else {
                    $result = 'nottable';
                }
            }
        }
        $data['fetched'] = $now;
        $data['result'] = $result;
        $DB->set_field('local_oksigeniahechauka_item', 'data', json_encode($data), ['id' => $itemid]);
        return $result;
    }

    /**
     * Reads the tables not read for a while.
     *
     * @param int $now
     * @param int $age seconds
     * @return array item id => result
     */
    public static function fetch_all(int $now, int $age): array {
        global $DB;
        $out = [];
        foreach ($DB->get_records('local_oksigeniahechauka_item', ['type' => 'table', 'visible' => 1]) as $item) {
            $data = items::data($item);
            // One with no address (the example's) keeps what it has.
            if (($data['url'] ?? '') !== '' && $now - (int) ($data['fetched'] ?? 0) >= $age) {
                $out[$item->id] = self::fetch((int) $item->id, $now);
            }
        }
        return $out;
    }
}
