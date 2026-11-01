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
 * A piece of content: add it or change it, with the screen beside it (DESIGN.md, «Añadir»).
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../config.php');

use local_oksigeniahechauka\local\access;
use local_oksigeniahechauka\local\agendas;
use local_oksigeniahechauka\local\compose;
use local_oksigeniahechauka\local\items;

$id = optional_param('id', 0, PARAM_INT);
$type = optional_param('type', 'notice', PARAM_ALPHA);
$context = context_system::instance();
require_login(null, false);
if (!access::publishes()) {
    access::require_cap('publish');
}

$c = 'local_oksigeniahechauka';
$item = $id ? $DB->get_record('local_oksigeniahechauka_item', ['id' => $id], '*', MUST_EXIST) : null;
if ($item && !access::may_edit($item)) {
    throw new required_capability_exception($context, 'local/oksigeniahechauka:publishall', 'nopermissions', '');
}
if ($item) {
    $type = $item->type;
}
if ($type === 'urgent') {
    // An urgent notice is put on and taken off from the home of the panel, not changed.
    redirect(new moodle_url('/local/oksigeniahechauka/index.php'));
}
if (!in_array($type, items::TYPES)) {
    throw new moodle_exception('invalidparameter', 'debug');
}
if ($type === 'agenda') {
    // A calendar brings content for everyone: the office and who runs the screens.
    access::require_cap('publishall');
}
$panel = new moodle_url('/local/oksigeniahechauka/index.php');
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/local/oksigeniahechauka/edit.php', $id ? ['id' => $id] : ['type' => $type]));
$PAGE->set_pagelayout('standard');
$PAGE->add_body_class('hkp-page');
$PAGE->set_title(get_string($item ? 'compose_edit' : 'compose_add', $c));
$PAGE->set_heading('');
$PAGE->set_primary_active_tab('local_oksigeniahechauka');

$posted = [];
$errors = [];
if (data_submitted() && confirm_sesskey()) {
    $now = time();
    [$saved, $posted, $errors] = compose::save($item, $type, $now);
    if ($saved) {
        if ($type === 'agenda') {
            // Read at once, so the panel says whether the address works.
            $result = agendas::fetch($saved, $now);
            $data = items::data($DB->get_record('local_oksigeniahechauka_item', ['id' => $saved]));
            $ok = $result === 'ok';
            redirect(
                $panel,
                $ok ? get_string('agenda_read', $c, (int) ($data['count'] ?? 0)) : get_string('agenda_failed', $c, $result),
                null,
                $ok ? \core\output\notification::NOTIFY_SUCCESS : \core\output\notification::NOTIFY_WARNING
            );
        }
        redirect(
            $panel,
            get_string($posted['publish'] ? 'compose_published' : 'compose_kept', $c),
            null,
            \core\output\notification::NOTIFY_SUCCESS
        );
    }
}

$PAGE->requires->js(new moodle_url('/local/oksigeniahechauka/panel/compose.js', ['v' => get_config($c, 'version')]));
echo $OUTPUT->header();
echo $OUTPUT->render_from_template('local_oksigeniahechauka/compose', compose::context(
    $item,
    $type,
    time(),
    $posted,
    $errors
));
echo $OUTPUT->footer();
