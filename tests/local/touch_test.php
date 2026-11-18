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
 * The screen people touch: its doors, what the centre tells of itself behind them, today's visits and what the report
 * counts. Example data.
 *
 * @package    local_oksigeniahechauka
 * @category   test
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_oksigeniahechauka\local\touch
 */
#[\PHPUnit\Framework\Attributes\CoversClass(touch::class)]
final class touch_test extends \advanced_testcase {
    /**
     * A tiny picture.
     *
     * @return string
     */
    protected function png(): string {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    }

    /**
     * The tiny picture as an uploaded file would be, on disk.
     *
     * @return string its path
     */
    protected function upload(): string {
        $path = make_request_directory() . '/foto.png';
        file_put_contents($path, $this->png());
        return $path;
    }

    /**
     * A screen as the table keeps it.
     *
     * @param array $fields
     * @return \stdClass
     */
    protected function screen(array $fields = []): \stdClass {
        return (object) ($fields + ['id' => 0, 'name' => 'Secretaría', 'template' => 'zones', 'theme' => 'site', 'power' => null,
            'lastinfo' => null, 'touch' => 0, 'doors' => null]);
    }

    /**
     * Its doors, in its order and only real ones; every one when it keeps none; only a screen people touch has them.
     */
    public function test_doors(): void {
        $this->assertSame(touch::DOORS, touch::doors(null));
        $this->assertSame(['visit', 'menu'], touch::doors('visit,menu,nonsense,menu'));
        $this->assertSame('', touch::doors_param(touch::DOORS));
        $this->assertSame('about,menu', touch::doors_param(['about', 'menu', 'x']));
        $this->assertSame([], touch::contract($this->screen()));
        $contract = touch::contract($this->screen(['touch' => 1, 'doors' => 'about,menu']));
        $this->assertSame(['doors' => ['about', 'menu'], 'idle' => touch::IDLE], $contract);
    }

    /**
     * «How to get here» with what the centre wrote and where it is on a map; «Get to know the centre» with its words, its
     * stages and «A day here», gesture by gesture; nothing when it has told nothing.
     */
    public function test_what_the_centre_tells(): void {
        $this->resetAfterTest();
        $c = 'local_oksigeniahechauka';
        $this->assertSame([], touch::about(get_config($c)));
        touch::change('contact', ['key' => 'web', 'value' => 'centro.example']);
        touch::change('contact', ['key' => 'email', 'value' => 'no es un correo']);
        touch::change('contact', ['key' => 'phone', 'value' => '  900   123 456 ']);
        set_config('lat', 28.4853, $c);
        set_config('lon', -16.3201, $c);
        $contact = touch::contact(get_config($c));
        $this->assertSame('https://centro.example', $contact['web']);
        $this->assertArrayNotHasKey('email', $contact);
        $this->assertSame('900 123 456', $contact['phone']);
        $this->assertStringContainsString('mlat=28.48530&mlon=-16.32010', $contact['geo']);
        touch::change('map', ['file' => $this->upload(), 'filename' => 'plano.png']);
        $this->assertSame('image/png', touch::contact(get_config($c))['map']['mime']);
        touch::change('mapdrop', []);
        $this->assertArrayNotHasKey('map', touch::contact(get_config($c)));

        categories::save([['id' => 'inf', 'name' => 'Infantil', 'colour' => '#2f8a55'], ['id' => 'pri', 'name' => 'Primaria']]);
        touch::change('words', ['value' => 'Un colegio donde se aprende haciendo.']);
        touch::change('stage', ['key' => 'inf', 'value' => '3 a 5 años']);
        touch::change('stage', ['key' => 'nadie', 'value' => 'no']);
        touch::change('day', ['time' => '8.45', 'title' => 'Entramos', 'words' => 'Alguien riega el huerto.',
            'file' => $this->upload(), 'filename' => 'huerto.png']);
        touch::change('day', ['time' => '10:30', 'title' => 'Al recreo']);
        $about = touch::about(get_config($c));
        $this->assertSame('Un colegio donde se aprende haciendo.', $about['words']);
        $this->assertSame([['name' => 'Infantil', 'line' => '3 a 5 años', 'color' => 1],
            ['name' => 'Primaria', 'line' => '', 'color' => 2]], $about['stages']);
        // A moment without its picture does not come out yet.
        $this->assertCount(1, $about['day']);
        $this->assertSame(['08:45', 'Entramos'], [$about['day'][0]['time'], $about['day'][0]['title']]);
        $file = get_file_storage()->get_file_by_id($about['day'][0]['media']['id']);
        $this->assertTrue(files::readable($file));

        touch::change('dayphoto', ['n' => 2, 'file' => $this->upload(), 'filename' => 'recreo.png']);
        touch::change('daymove', ['n' => 2, 'to' => 0]);
        $this->assertSame(['Al recreo', 'Entramos'], array_column(touch::about(get_config($c))['day'], 'title'));
        $panel = touch::change('daydrop', ['n' => 2]);
        $this->assertSame(['Entramos'], array_column($panel['day'], 'title'));
        $this->assertNull(files::first(touch::DAY, 2));
    }

    /**
     * Today's visits still to come, by when they start, each with who receives it and its plan, kept among the screens'
     * files; nothing of the family; a past one or one with no times goes.
     */
    public function test_visits_of(): void {
        $this->resetAfterTest();
        $now = 1795000000;
        $fs = get_file_storage();
        $user = \context_user::instance(2);
        $photo = $fs->create_file_from_string(['contextid' => $user->id, 'component' => 'user', 'filearea' => 'draft',
            'itemid' => 7, 'filepath' => '/', 'filename' => 'f3.png'], $this->png());
        $list = [
            ['id' => 2, 'kind' => 'visit', 'name' => 'Visita', 'timestart' => $now + 3600, 'timeend' => $now + 6300,
                'hosts' => [['name' => 'Ana Martín', 'first' => 'Ana', 'role' => 'Jefa de estudios', 'says' => 'Bienvenidos.',
                    'photofile' => $photo], ['name' => '']], 'where' => 'Hasta el huerto', 'miniaturefile' => null,
                'signed' => 3, 'came' => 0, 'family' => 'nunca'],
            ['id' => 1, 'kind' => 'openday', 'name' => 'Jornada', 'timestart' => $now - 600, 'timeend' => $now + 600,
                'turns' => [['timestart' => $now - 600, 'timeend' => $now + 600]], 'hosts' => []],
            ['id' => 3, 'kind' => 'visit', 'name' => 'Ya pasó', 'timestart' => $now - 7200, 'timeend' => $now - 3600],
            ['id' => 4, 'kind' => 'visit', 'name' => 'Sin horas'],
        ];
        $visits = touch::visits_of($list, $now, function ($file) {
            return $file instanceof \stored_file ? touch::keep($file) : null;
        });
        $this->assertSame([1, 2], array_column($visits, 'id'));
        $this->assertSame('openday', $visits[0]['kind']);
        $this->assertSame([['timestart' => $now - 600, 'timeend' => $now + 600, 'minutes' => 20]], $visits[0]['turns']);
        $this->assertSame(45, $visits[1]['minutes']);
        $this->assertCount(1, $visits[1]['hosts']);
        $host = array_diff_key($visits[1]['hosts'][0], ['img' => 1]);
        $this->assertSame(['first' => 'Ana', 'name' => 'Ana Martín', 'role' => 'Jefa de estudios',
            'says' => 'Bienvenidos.'], $host);
        foreach (['signed', 'came', 'family'] as $key) {
            $this->assertArrayNotHasKey($key, $visits[1]);
        }
        $kept = $fs->get_file_by_id($visits[1]['hosts'][0]['img']['id']);
        $this->assertSame(touch::VISIT, $kept->get_filearea());
        $this->assertTrue(files::from_source($kept));
        // The same picture, kept once.
        $this->assertSame((int) $kept->get_id(), (int) touch::keep($photo)->get_id());
        // Without Eguahe today, the pictures of visits go.
        if (!touch::has_visits()) {
            $this->assertSame(1, touch::prune($now));
        }
    }

    /**
     * A manifest of a screen people touch carries its doors and what the centre told; another screen, nothing of it.
     */
    public function test_in_the_manifest(): void {
        $this->resetAfterTest();
        $this->setAdminUser();
        touch::change('contact', ['key' => 'address', 'value' => 'Calle de Ejemplo, 12']);
        touch::change('words', ['value' => 'Un colegio de ejemplo.']);
        $m = manifest::build($this->screen(['touch' => 1, 'doors' => 'centre,about']), time());
        $this->assertSame(['centre', 'about'], $m['screen']['touch']['doors']);
        $this->assertSame('Calle de Ejemplo, 12', $m['centre']['contact']['address']);
        $this->assertSame('Un colegio de ejemplo.', $m['centre']['about']['words']);
        $plain = manifest::build($this->screen(), time());
        $this->assertArrayNotHasKey('touch', $plain['screen']);
        $this->assertArrayNotHasKey('contact', $plain['centre']);
    }

    /**
     * The report counts each door opened and each time someone began to touch, apart from what came out.
     */
    public function test_the_report_counts(): void {
        $this->assertSame('door-menu', report::key('door-menu'));
        $this->assertSame('touch', report::key('touch'));
        $this->assertNull(report::key('door-nonsense'));
    }
}
