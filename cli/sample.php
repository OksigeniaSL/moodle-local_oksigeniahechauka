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
 * Example content for a demo site: pictures, notices, events and the ticker, marked as example data on the screens.
 *
 * Usage: php local/oksigeniahechauka/cli/sample.php [--remove]
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/clilib.php');

use local_oksigeniahechauka\local\files;
use local_oksigeniahechauka\local\items;

[$options] = cli_get_params(['remove' => false, 'help' => false], ['h' => 'help']);
if ($options['help']) {
    echo "Example content for the screens. --remove takes it away.\n";
    exit(0);
}

$c = 'local_oksigeniahechauka';
// Everything this script made carries «sample» in its data, so --remove takes only that.
foreach (
    $DB->get_records_select(
        'local_oksigeniahechauka_item',
        $DB->sql_like('data', ':m'),
        ['m' => '%"sample":true%']
    ) as $old
) {
    items::delete((int) $old->id);
}
if ($options['remove']) {
    unset_config('sampledata', $c);
    cli_writeln('Example content removed.');
    exit(0);
}

$now = time();
$today = userdate($now, '%Y-%m-%d', core_date::get_server_timezone(), false);
$midnight = usergetmidnight($now, core_date::get_server_timezone());
$order = 0;
$add = function (string $type, string $title, string $body, array $data, array $extra = []) use ($DB, $now, &$order) {
    $data = ['sample' => true] + $data;
    return (int) $DB->insert_record('local_oksigeniahechauka_item', (object) ($extra + [
        'type' => $type,
        'title' => $title,
        'body' => $body,
        'data' => json_encode($data),
        'duration' => 0,
        'sortorder' => ++$order,
        'visible' => 1,
        'targetall' => 1,
        'everyweeks' => 0,
        'usermodified' => get_admin()->id,
        'timecreated' => $now,
        'timemodified' => $now,
    ]));
};
$fs = get_file_storage();
$picture = function (int $itemid, string $name) use ($fs) {
    $fs->create_file_from_pathname([
        'contextid' => files::context()->id,
        'component' => files::COMPONENT,
        'filearea' => files::MEDIA,
        'itemid' => $itemid,
        'filepath' => '/',
        'filename' => $name,
    ], __DIR__ . '/../player/demo/media/' . $name);
};

$id = $add(
    'media',
    'El huerto, listo para la siembra de otoño',
    'Esta semana plantan las clases de 3.º de Primaria',
    ['caption' => true, 'fit' => 'cover']
);
$picture($id, 'huerto.jpg');
$id = $add(
    'media',
    'Una foto en vertical, entera',
    'Sobre un fondo difuminado de sí misma',
    ['caption' => true, 'fit' => 'blur']
);
$picture($id, 'huerto-vertical.jpg');

$add('notice', 'Fotos de grupo', 'Martes y miércoles, con el uniforme', []);
$add('notice', 'Biblioteca en el recreo', 'De 11:00 a 11:30, con préstamo', [], ['days' => '1,2,3,4,5']);
$add('notice', 'Salida temprana el viernes', 'Las clases acaban a las 13:00', ['important' => true]);

$add(
    'event',
    'Teatro en inglés',
    '3.º y 4.º de Primaria',
    ['start' => $midnight + 10 * HOURSECS + 30 * MINSECS, 'end' => $midnight + 11 * HOURSECS + 30 * MINSECS, 'color' => 2]
);
$add(
    'event',
    'Charla de orientación',
    '4.º de ESO',
    ['start' => $midnight + 12 * HOURSECS, 'end' => $midnight + 13 * HOURSECS, 'color' => 3]
);
$add(
    'event',
    'Reunión de familias',
    'Infantil',
    ['start' => $midnight + 17 * HOURSECS, 'end' => $midnight + 18 * HOURSECS, 'color' => 1]
);

$add('ticker', 'El viernes, festival de otoño en el patio a las 16:00', '', []);
$add('ticker', 'Abiertas las inscripciones para el torneo de ajedrez', '', []);

set_config('sampledata', 1, $c);
cli_writeln('Example content added for ' . $today . '.');
