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
 * The preview: the same player a screen runs, at the size of the screen, on the day and at the time chosen.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\player_page;

require_login(null, false);
$context = context_system::instance();
require_capability('local/oksigeniahechauka:manage', $context);

$screenid = optional_param('screen', 0, PARAM_INT);
$at = optional_param('at', '', PARAM_RAW_TRIMMED);
$frame = optional_param('frame', 0, PARAM_BOOL);
$shape = optional_param('shape', '', PARAM_ALPHA);

if ($frame) {
    player_page::send(player_page::preview_boot($screenid, $at), true);
}

$c = 'local_oksigeniahechauka';
$url = new moodle_url('/local/oksigeniahechauka/preview.php', ['screen' => $screenid]);
$PAGE->set_context($context);
$PAGE->set_url($url);
$PAGE->set_pagelayout('admin');
$PAGE->set_title(get_string('preview', $c));
$PAGE->set_heading(get_string('manage', $c));
navigation_node::override_active_url(new moodle_url('/local/oksigeniahechauka/index.php'));

$screens = $DB->get_records('local_oksigeniahechauka_screen', null, 'sortorder, name', 'id, name, lastinfo');
$width = 1920;
$height = 1080;
if ($screenid && isset($screens[$screenid])) {
    $info = json_decode((string) $screens[$screenid]->lastinfo, true) ?: [];
    if (!empty($info['display']['width']) && !empty($info['display']['height'])) {
        $width = (int) $info['display']['width'];
        $height = (int) $info['display']['height'];
    }
}
if ($shape === 'vertical' && $width > $height || $shape === 'horizontal' && $height > $width) {
    [$width, $height] = [$height, $width];
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $at)) {
    $at = userdate(time(), '%Y-%m-%dT%H:%M', core_date::get_server_timezone(), false);
}

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('preview', $c));

// The controls: which screen, which day and hour, which shape.
$options = [0 => get_string('preview_general', $c)];
foreach ($screens as $s) {
    $options[$s->id] = format_string($s->name);
}
echo html_writer::start_tag('form', ['method' => 'get', 'action' => $url->out_omit_querystring(),
    'class' => 'd-flex flex-wrap align-items-end mb-3 hk-preview-controls']);
echo html_writer::start_div('me-3 mb-2');
echo html_writer::label(get_string('screen', $c), 'hk-screen', true, ['class' => 'd-block']);
echo html_writer::select($options, 'screen', $screenid, false, ['id' => 'hk-screen', 'class' => 'form-select']);
echo html_writer::end_div();
echo html_writer::start_div('me-3 mb-2');
echo html_writer::label(get_string('preview_at', $c), 'hk-at', true, ['class' => 'd-block']);
echo html_writer::empty_tag('input', ['type' => 'datetime-local', 'name' => 'at', 'id' => 'hk-at', 'value' => $at,
    'class' => 'form-control']);
echo html_writer::end_div();
echo html_writer::start_div('me-3 mb-2');
echo html_writer::label(get_string('preview_orientation', $c), 'hk-shape', true, ['class' => 'd-block']);
echo html_writer::select(
    ['horizontal' => get_string('preview_horizontal', $c),
    'vertical' => get_string('preview_vertical', $c)],
    'shape',
    $height > $width ? 'vertical' : 'horizontal',
    false,
    ['id' => 'hk-shape', 'class' => 'form-select']
);
echo html_writer::end_div();
echo html_writer::tag('button', get_string('preview', $c), ['type' => 'submit', 'class' => 'btn btn-primary mb-2']);
echo html_writer::end_tag('form');

// The screen itself: the player at its real size, scaled down to the page.
$src = new moodle_url('/local/oksigeniahechauka/preview.php', ['screen' => $screenid, 'at' => $at, 'frame' => 1]);
$maxwidth = $height > $width ? 540 : 1100;
echo html_writer::start_div('hk-preview', ['style' => 'position: relative; width: 100%; max-width: ' . $maxwidth .
    'px; aspect-ratio: ' . $width . ' / ' . $height . '; overflow: hidden; border-radius: .5rem; ' .
    'box-shadow: 0 0 0 1px rgba(0, 0, 0, .15); background: #000;', 'data-width' => $width, 'data-height' => $height]);
echo html_writer::tag('iframe', '', ['src' => $src->out(false), 'title' => get_string('preview', $c),
    'width' => $width, 'height' => $height, 'style' => 'position: absolute; top: 0; left: 0; border: 0; ' .
    'transform-origin: 0 0;']);
echo html_writer::end_div();
$PAGE->requires->js_amd_inline("
    const box = document.querySelector('.hk-preview');
    const frame = box.querySelector('iframe');
    const fit = () => {
        frame.style.transform = 'scale(' + (box.clientWidth / Number(box.dataset.width)) + ')';
    };
    window.addEventListener('resize', fit);
    fit();
");
echo $OUTPUT->footer();
