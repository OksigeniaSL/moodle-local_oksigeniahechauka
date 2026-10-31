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
 * English strings for local_oksigeniahechauka.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['add_event'] = 'Event';
$string['add_media'] = 'Picture or video';
$string['add_notice'] = 'Notice';
$string['add_ticker'] = 'Ticker line';
$string['addcontent'] = 'Add';
$string['addscreen'] = 'Add a screen';
$string['addscreen_code'] = 'Code on the screen';
$string['addscreen_go'] = 'Continue';
$string['addscreen_help'] = 'Open this address on the new screen. It will show a code: type it here, or scan its QR code with your phone.';
$string['alert_back_body'] = '«{$a->name}» is giving signs of life again. {$a->url}';
$string['alert_back_subject'] = 'The screen «{$a->name}» is back';
$string['alert_down_body'] = 'The screen «{$a->name}» has given no signs of life since {$a->since}. It may be switched off, without a network or stuck. If it is switched off on purpose at some hours, give it its hours and it will only warn within them: {$a->url}';
$string['alert_down_subject'] = 'The screen «{$a->name}» is not answering';
$string['alerts'] = 'Warn if it stops answering';
$string['alerts_help'] = 'The people who run the screens get a notification when this screen has said nothing for 15 minutes within its hours, and another one when it comes back.';
$string['all'] = 'All screens';
$string['allday'] = 'All day';
$string['body_event'] = 'Who it is for, or where';
$string['body_media'] = 'Second line';
$string['body_notice'] = 'Detail';
$string['caption'] = 'Show the title over the picture';
$string['claim'] = 'Name this screen';
$string['claim_bad'] = 'This code is not valid or has expired. The screen shows a new one every few minutes: use that one.';
$string['claim_done'] = '«{$a}» starts in a few seconds.';
$string['claim_existing'] = 'Screen';
$string['claim_existing_help'] = 'To replace the device of a screen that already exists, choose it: it keeps its name, groups and content.';
$string['claim_go'] = 'Start';
$string['claim_new'] = 'A new screen';
$string['clock_wrong'] = 'The clock of this screen is {$a} out. Each thing shows by its own clock: set its date and time.';
$string['closed'] = 'No canteen today';
$string['colour'] = 'Colour';
$string['colour_n'] = 'Colour {$a}';
$string['colouraccent'] = 'Second colour';
$string['colouraccent_desc'] = 'The clock\'s colon and the label of the ticker.';
$string['colourprimary'] = 'Main colour';
$string['colourprimary_desc'] = 'The ticker and the titles. Empty for the colours of the template.';
$string['colours_desc'] = 'Four colours to tell kinds apart (stages, departments), for the events.';
$string['confirmdelete'] = 'Delete «{$a}»?';
$string['confirmdeletescreen'] = 'Remove the screen «{$a}»? It will show a pairing code again.';
$string['content'] = 'Content';
$string['content_none'] = 'Nothing yet. Add a picture, a notice or an event: it reaches the screens by itself.';
$string['darkfrom'] = 'Dark from';
$string['darkuntil'] = 'Dark until';
$string['date_format'] = '{d} {m}';
$string['datefrom'] = 'From';
$string['dateuntil'] = 'Until';
$string['days'] = 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday';
$string['days_short'] = 'Mon,Tue,Wed,Thu,Fri,Sat,Sun';
$string['duration'] = 'Seconds on screen';
$string['duration_help'] = 'Empty for the default: ten seconds for a picture, the whole video for a video.';
$string['end'] = 'Ends';
$string['event_start'] = 'Starts';
$string['everyweeks'] = 'Repeat';
$string['everyweeks_1'] = 'Every week';
$string['everyweeks_n'] = 'Every {$a} weeks';
$string['ffmpeg'] = 'Path to ffmpeg';
$string['ffmpeg_desc'] = 'With ffmpeg the server prepares each video for the screens when it is uploaded, one at a time: H.264, 1080p and 30 fps at most, without sound. A static build is enough, for example /opt/ffmpeg/ffmpeg. Without it, videos go as they are.';
$string['fit'] = 'Fit';
$string['fit_blur'] = 'Whole, over a blurred copy';
$string['fit_contain'] = 'Whole';
$string['fit_cover'] = 'Fill the zone';
$string['groups'] = 'Groups';
$string['groups_add'] = 'New group';
$string['groups_none'] = 'No groups yet. A group lets you publish on several screens at once: «Primary», «corridors», «outside».';
$string['hidden'] = 'Hidden';
$string['important'] = 'Important';
$string['label_events'] = 'Today';
$string['label_menu'] = 'Today\'s menu';
$string['label_menu_tomorrow'] = 'Tomorrow\'s menu';
$string['label_notices'] = 'Notices';
$string['label_ticker'] = 'Latest';
$string['lastseen'] = 'Seen {$a} ago';
$string['logo'] = 'Logo';
$string['logodark'] = 'Logo for the dark theme';
$string['manage'] = 'Information screens';
$string['menucentre'] = 'Canteen';
$string['menucentre_desc'] = 'The id of the canteen in Oksigenia Meals; 0 for the first one of the site.';
$string['messageprovider:screendown'] = 'A screen stops answering or comes back';
$string['months'] = 'January,February,March,April,May,June,July,August,September,October,November,December';
$string['name'] = 'Name';
$string['never'] = 'Never seen';
$string['newsdays'] = 'Days a piece of news stays';
$string['off_hours'] = 'Off by its hours';
$string['offline'] = 'No connection. Trying again…';
$string['offline_since'] = 'No signal for {$a}';
$string['online'] = 'On';
$string['pair_steps'] = 'Open this address on your phone or scan the code, and give the screen a name.';
$string['pair_title'] = 'A new screen';
$string['player_url'] = 'Address for the screens';
$string['player_version'] = 'player {$a}';
$string['pluginname'] = 'Information screens (Oksigenia Hechauka)';
$string['power'] = 'Hours on';
$string['power_always'] = 'Always';
$string['power_hours'] = 'These days and hours';
$string['power_mode'] = 'On';
$string['power_mode_help'] = 'Outside these hours the screen goes black, and it does not warn if it stops answering.';
$string['power_nodays'] = 'Choose at least one day.';
$string['preview'] = 'Preview';
$string['preview_at'] = 'Day and time';
$string['preview_general'] = 'Every screen';
$string['preview_horizontal'] = 'Horizontal';
$string['preview_orientation'] = 'Shape';
$string['preview_vertical'] = 'Vertical';
$string['privacy:metadata'] = 'Oksigenia Hechauka keeps who last changed each piece of content.';
$string['privacy:metadata:item'] = 'The content of the screens.';
$string['privacy:metadata:item:timemodified'] = 'When.';
$string['privacy:metadata:item:usermodified'] = 'Who last changed it.';
$string['published'] = 'Published';
$string['remove'] = 'Remove';
$string['sample'] = 'Example data';
$string['schedule'] = 'When';
$string['schedule_always'] = 'Always';
$string['screen'] = 'Screen';
$string['screens'] = 'Screens';
$string['screens_none'] = 'No screens yet.';
$string['settings'] = 'Settings';
$string['sourcecalendar'] = 'Events of the site calendar';
$string['sourcemenu'] = 'Menu of the day, from Oksigenia Meals';
$string['sourcemenu_missing'] = 'Oksigenia Meals is not installed on this site.';
$string['sourcenews'] = 'Site news, as notices';
$string['sources'] = 'What reaches the screens by itself';
$string['task_check_screens'] = 'Warn about the screens that stop answering';
$string['task_prepare_video'] = 'Prepare a video for the screens';
$string['template'] = 'Layout';
$string['template_full'] = 'Picture across the screen';
$string['template_zones'] = 'Picture and «Today»';
$string['thememode'] = 'Light or dark';
$string['thememode_auto'] = 'Dark at night';
$string['thememode_dark'] = 'Dark';
$string['thememode_light'] = 'Light';
$string['thememode_site'] = 'As the site';
$string['times'] = 'Hours';
$string['times_help'] = 'Up to two ranges, «08:00» to «10:30». Empty for the whole day.';
$string['timezone_wrong'] = 'This screen runs in another time zone ({$a->device}; the site, {$a->site}), so its schedule will be out. Set the time zone of the school on it.';
$string['title_event'] = 'What';
$string['title_media'] = 'Title';
$string['title_notice'] = 'Notice';
$string['title_ticker'] = 'Text';
$string['type_event'] = 'Event';
$string['type_media'] = 'Picture or video';
$string['type_notice'] = 'Notice';
$string['type_ticker'] = 'Ticker';
$string['video_asis'] = 'The server has no ffmpeg: videos go as they were uploaded, and one recorded with a phone may not play on every screen. Ask whoever runs the site to set the path to ffmpeg.';
$string['video_failed'] = 'could not be prepared; it goes as it was uploaded';
$string['video_pending'] = 'being prepared for the screens…';
$string['weekdays'] = 'Days';
$string['where'] = 'Where';
$string['where_some'] = 'Only on…';
$string['wrongfile'] = 'A picture or a video, please.';
$string['wronghour'] = 'An hour like 08:30.';
$string['wrongrange'] = 'The range needs a start and an end.';
