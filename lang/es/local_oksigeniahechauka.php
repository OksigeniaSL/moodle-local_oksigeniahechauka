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
 * Spanish strings for local_oksigeniahechauka.
 *
 * @package    local_oksigeniahechauka
 * @copyright  2026 Oksigenia SL <dev@oksigenia.cc>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['add_agenda'] = 'Agenda (iCal)';
$string['add_event'] = 'Evento';
$string['add_media'] = 'Foto o vídeo';
$string['add_notice'] = 'Aviso';
$string['add_ticker'] = 'Línea de la cinta';
$string['addcontent'] = 'Añadir';
$string['addscreen'] = 'Añadir una pantalla';
$string['addscreen_code'] = 'Código de la pantalla';
$string['addscreen_go'] = 'Seguir';
$string['addscreen_help'] = 'Abre esta dirección en la pantalla nueva. Enseñará un código: escríbelo aquí o escanea su código QR con el móvil.';
$string['agenda_bad_url'] = 'Una dirección que empiece por https://, http:// o webcal://.';
$string['agenda_failed'] = 'No se pudo leer la agenda ({$a}). Revisa la dirección.';
$string['agenda_read'] = 'Agenda leída: {$a} eventos en las próximas semanas.';
$string['agenda_status'] = '{$a->count} eventos · leída hace {$a->ago}';
$string['agenda_unread'] = 'Sin leer todavía';
$string['agenda_url'] = 'Dirección iCal';
$string['agenda_url_help'] = 'La dirección de un calendario en formato iCal (acaba en .ics, o empieza por webcal://): la dirección pública de un calendario de Google, de Outlook o del centro. Sus eventos llegan a las pantallas elegidas en «Dónde», con el color elegido aquí.';
$string['alert_back_body'] = '«{$a->name}» vuelve a dar señales de vida. {$a->url}';
$string['alert_back_subject'] = 'La pantalla «{$a->name}» vuelve a funcionar';
$string['alert_down_body'] = 'La pantalla «{$a->name}» no da señales de vida desde el {$a->since}. Puede estar apagada, sin red o bloqueada. Si se apaga a propósito a ciertas horas, ponle su horario y solo avisará dentro de él: {$a->url}';
$string['alert_down_subject'] = 'La pantalla «{$a->name}» no responde';
$string['alerts'] = 'Avisar si deja de responder';
$string['alerts_help'] = 'Quien lleva las pantallas recibe un aviso cuando esta pasa 15 minutos sin dar señales dentro de su horario, y otro cuando vuelve.';
$string['all'] = 'Todas las pantallas';
$string['allday'] = 'Todo el día';
$string['body_event'] = 'Para quién o dónde';
$string['body_media'] = 'Segunda línea';
$string['body_notice'] = 'Detalle';
$string['caption'] = 'Poner el título sobre la foto';
$string['claim'] = 'Ponle nombre a esta pantalla';
$string['claim_bad'] = 'Este código no vale o ha caducado. La pantalla enseña uno nuevo cada pocos minutos: usa ese.';
$string['claim_done'] = '«{$a}» empieza en unos segundos.';
$string['claim_existing'] = 'Pantalla';
$string['claim_existing_help'] = 'Para cambiar el aparato de una pantalla que ya existe, elígela: conserva su nombre, sus grupos y sus contenidos.';
$string['claim_go'] = 'Empezar';
$string['claim_new'] = 'Una pantalla nueva';
$string['clock_wrong'] = 'El reloj de esta pantalla se desvía {$a}. Cada cosa sale según su reloj: ponle bien la fecha y la hora.';
$string['closed'] = 'Hoy no hay comedor';
$string['colour'] = 'Color';
$string['colour_bystage'] = 'Por la etapa de cada título (Inf, Pri, ESO, Bach); gris lo de todo el centro';
$string['colour_n'] = 'Color {$a}';
$string['colouraccent'] = 'Segundo color';
$string['colouraccent_desc'] = 'Los dos puntos de la hora y la etiqueta de la cinta.';
$string['colourprimary'] = 'Color principal';
$string['colourprimary_desc'] = 'La cinta y los títulos. Vacío, los colores de la plantilla.';
$string['colours_desc'] = 'Cuatro colores para distinguir las etapas: 1 Infantil, 2 Primaria, 3 ESO, 4 Bachillerato. Un evento toma su etapa del título («3º ESO - Acampada»); lo de todo el centro va en gris.';
$string['confirmdelete'] = '¿Borrar «{$a}»?';
$string['confirmdeletescreen'] = '¿Quitar la pantalla «{$a}»? Volverá a enseñar un código para darla de alta.';
$string['content'] = 'Contenidos';
$string['content_none'] = 'Todavía no hay nada. Añade una foto, un aviso o un evento: llega solo a las pantallas.';
$string['darkfrom'] = 'Oscuro desde';
$string['darkuntil'] = 'Oscuro hasta';
$string['date_format'] = '{d} de {m}';
$string['datefrom'] = 'Desde';
$string['dates'] = 'Fechas';
$string['dates_day'] = 'Un solo día';
$string['dates_from'] = 'Desde una fecha';
$string['dates_range'] = 'Entre dos fechas';
$string['dates_until'] = 'Todos los días hasta una fecha';
$string['dateuntil'] = 'Hasta';
$string['day'] = 'Día';
$string['days'] = 'Domingo,Lunes,Martes,Miércoles,Jueves,Viernes,Sábado';
$string['days_abbr'] = 'Dom,Lun,Mar,Mié,Jue,Vie,Sáb';
$string['days_abbr_mid'] = 'dom,lun,mar,mié,jue,vie,sáb';
$string['days_short'] = 'L,M,X,J,V,S,D';
$string['daysmode_all'] = 'Todos los días';
$string['daysmode_some'] = 'Solo estos días';
$string['duration'] = 'Segundos en pantalla';
$string['duration_help'] = 'Vacío, lo normal: diez segundos una foto y el vídeo entero un vídeo.';
$string['end'] = 'Acaba';
$string['event_start'] = 'Empieza';
$string['everyweeks'] = 'Repetir';
$string['everyweeks_1'] = 'Todas las semanas';
$string['everyweeks_n'] = 'Cada {$a} semanas';
$string['ffmpeg'] = 'Ruta de ffmpeg';
$string['ffmpeg_desc'] = 'Con ffmpeg, el servidor prepara cada vídeo para las pantallas al subirlo, de uno en uno: H.264, 1080p y 30 fps como mucho, sin sonido. Basta una versión estática de ffmpeg 4.4 o posterior, por ejemplo /opt/ffmpeg/ffmpeg. Sin él, los vídeos van tal cual.';
$string['fit'] = 'Encaje';
$string['fit_blur'] = 'Entera, sobre una copia difuminada';
$string['fit_contain'] = 'Entera';
$string['fit_cover'] = 'Llenar la zona';
$string['group_editors'] = 'Publican aquí: {$a}';
$string['group_noeditors'] = 'Aquí no publica nadie más';
$string['groups'] = 'Grupos';
$string['groups_add'] = 'Grupo nuevo';
$string['groups_none'] = 'Todavía no hay grupos. Un grupo sirve para publicar en varias pantallas a la vez: «Primaria», «pasillos», «fuera».';
$string['hidden'] = 'Oculto';
$string['hoursmode_all'] = 'Todo el día';
$string['hoursmode_some'] = 'En estas franjas de horas';
$string['important'] = 'Importante';
$string['label_days'] = 'días';
$string['label_events'] = 'Hoy';
$string['label_menu'] = 'Menú de hoy';
$string['label_menu_tomorrow'] = 'Menú de mañana';
$string['label_notices'] = 'Avisos';
$string['label_ticker'] = 'Al día';
$string['label_today'] = 'Hoy';
$string['label_tomorrow'] = 'Mañana';
$string['label_upcoming'] = 'Próximos días';
$string['lastseen'] = 'Vista hace {$a}';
$string['location'] = 'Ubicación del centro';
$string['location_desc'] = 'La localidad o la dirección del centro, para el tiempo; también vale «latitud, longitud».';
$string['location_found'] = 'Encontrado: {$a->place} ({$a->lat}, {$a->lon}).';
$string['location_notfound'] = 'No encuentro ese lugar. Prueba con la localidad y la provincia, o con «latitud, longitud».';
$string['logo'] = 'Logotipo';
$string['logodark'] = 'Logotipo para el tema oscuro';
$string['manage'] = 'Pantallas informativas';
$string['menucentre'] = 'Comedor';
$string['menucentre_desc'] = 'El número del comedor en Oksigenia Meals; 0 para el primero del sitio.';
$string['menulink'] = 'Pantallas';
$string['messageprovider:screendown'] = 'Una pantalla deja de responder o vuelve';
$string['months'] = 'enero,febrero,marzo,abril,mayo,junio,julio,agosto,septiembre,octubre,noviembre,diciembre';
$string['months_abbr'] = 'ene,feb,mar,abr,may,jun,jul,ago,sep,oct,nov,dic';
$string['name'] = 'Nombre';
$string['never'] = 'Sin estrenar';
$string['newsdays'] = 'Días que dura una noticia';
$string['notimes'] = 'Escribe al menos una franja de horas, por ejemplo de 08:00 a 10:30.';
$string['off_hours'] = 'Apagada por horario';
$string['offline'] = 'Sin conexión. Lo vuelvo a intentar…';
$string['offline_since'] = 'Sin señal desde hace {$a}';
$string['oksigeniahechauka:managescreens'] = 'Llevar las pantallas: darlas de alta, configurarlas, sus grupos y quién publica en cada uno';
$string['oksigeniahechauka:publish'] = 'Publicar en las pantallas de sus grupos';
$string['oksigeniahechauka:publishall'] = 'Publicar en todas las pantallas y cambiar el contenido de los demás';
$string['oksigeniahechauka:view'] = 'Ver el panel de las pantallas y su vista previa';
$string['online'] = 'En marcha';
$string['pair_steps'] = 'Abre esta dirección en el móvil o escanea el código, y ponle nombre a la pantalla.';
$string['pair_title'] = 'Una pantalla nueva';
$string['player_url'] = 'Dirección para las pantallas';
$string['player_version'] = 'reproductor {$a}';
$string['pluginname'] = 'Pantallas informativas (Oksigenia Hechauka)';
$string['power'] = 'Horario de encendido';
$string['power_always'] = 'Siempre';
$string['power_hours'] = 'Estos días y horas';
$string['power_mode'] = 'Encendida';
$string['power_mode_help'] = 'Fuera de este horario la pantalla se queda en negro y no avisa si deja de responder.';
$string['power_nodays'] = 'Elige al menos un día.';
$string['preview'] = 'Vista previa';
$string['preview_at'] = 'Día y hora';
$string['preview_general'] = 'Todas las pantallas';
$string['preview_horizontal'] = 'Horizontal';
$string['preview_orientation'] = 'Forma';
$string['preview_vertical'] = 'Vertical';
$string['privacy:metadata'] = 'Oksigenia Hechauka guarda quién cambió por última vez cada contenido.';
$string['privacy:metadata:item'] = 'Los contenidos de las pantallas.';
$string['privacy:metadata:item:timemodified'] = 'Cuándo.';
$string['privacy:metadata:item:usermodified'] = 'Quién lo cambió por última vez.';
$string['publish_choosegroup'] = 'Elige al menos un grupo de pantallas.';
$string['publish_nogroups'] = 'Aún no publicas en ningún grupo de pantallas. Quien lleva las pantallas puede añadirte a los tuyos.';
$string['published'] = 'Publicado';
$string['reload'] = 'Recargar';
$string['reload_done'] = 'La pantalla se recarga en menos de un minuto.';
$string['reloadall'] = 'Recargar todas';
$string['reloadall_done'] = 'Todas las pantallas se recargan en menos de un minuto.';
$string['remove'] = 'Quitar';
$string['role_missing'] = 'El rol «Publica en las pantallas» no está en el sitio; reinstala la extensión o pídeselo a la administración.';
$string['role_oksigeniahechauka_manager'] = 'Lleva las pantallas';
$string['role_oksigeniahechauka_manager_desc'] = 'Lleva las pantallas informativas sin ser administrador: las pantallas, sus grupos, quién publica en cada uno y todo el contenido. Se da una vez, en todo el sitio.';
$string['role_oksigeniahechauka_publisher'] = 'Publica en las pantallas';
$string['role_oksigeniahechauka_publisher_desc'] = 'Añade y cambia su propio contenido en las pantallas de los grupos donde quien lleva las pantallas le deja publicar. Se da desde el panel de las pantallas, grupo a grupo.';
$string['sample'] = 'Datos de ejemplo';
$string['schedule'] = 'Cuándo';
$string['schedule_always'] = 'Siempre';
$string['screen'] = 'Pantalla';
$string['screen_errors'] = 'Lo que avisa la pantalla';
$string['screens'] = 'Pantallas';
$string['screens_none'] = 'Todavía no hay pantallas.';
$string['settings'] = 'Ajustes';
$string['sky_clearsky'] = 'Despejado';
$string['sky_cloudy'] = 'Cubierto';
$string['sky_fair'] = 'Poco nuboso';
$string['sky_fog'] = 'Niebla';
$string['sky_lightrain'] = 'Lluvia débil';
$string['sky_partlycloudy'] = 'Intervalos nubosos';
$string['sky_rain'] = 'Lluvia';
$string['sky_showers'] = 'Chubascos';
$string['sky_sleet'] = 'Aguanieve';
$string['sky_snow'] = 'Nieve';
$string['sky_thunder'] = 'Tormenta';
$string['sound'] = 'Con sonido';
$string['sound_help'] = 'Sus vídeos suenan. Apagado por defecto: muchas pantallas están detrás de una cristalera, y una sala se cansa de oír lo mismo cuarenta veces por hora.';
$string['sourcecalendar'] = 'Los eventos del calendario del sitio';
$string['sourcemenu'] = 'El menú del día, de Oksigenia Meals';
$string['sourcemenu_missing'] = 'Oksigenia Meals no está instalado en este sitio.';
$string['sourcenews'] = 'Las noticias del sitio, como avisos';
$string['sources'] = 'Lo que llega solo a las pantallas';
$string['sourceweather'] = 'El tiempo, de MET Norway';
$string['sourceweather_desc'] = 'En la cabecera de cada pantalla, y hoy y mañana en el momento de «Hoy». Necesita la ubicación del centro.';
$string['task_check_screens'] = 'Avisar de las pantallas que dejan de responder';
$string['task_fetch_agendas'] = 'Volver a leer las agendas';
$string['task_fetch_weather'] = 'Traer el tiempo del centro';
$string['task_prepare_video'] = 'Preparar un vídeo para las pantallas';
$string['template'] = 'Diseño';
$string['template_full'] = 'Foto a todo lo ancho';
$string['template_zones'] = 'Foto y «Hoy»';
$string['thememode'] = 'Claro u oscuro';
$string['thememode_auto'] = 'Oscuro por la noche';
$string['thememode_dark'] = 'Oscuro';
$string['thememode_light'] = 'Claro';
$string['thememode_site'] = 'Como el sitio';
$string['times'] = 'Horas';
$string['times_help'] = 'Hasta dos franjas, de «08:00» a «10:30». La hora final no entra; una franja que acaba antes de empezar pasa de medianoche.';
$string['timezone_wrong'] = 'Esta pantalla está en otra zona horaria ({$a->device}; el sitio, {$a->site}) y su horario irá desfasado. Ponle la zona horaria del centro.';
$string['title_agenda'] = 'Nombre';
$string['title_event'] = 'Qué';
$string['title_media'] = 'Título';
$string['title_notice'] = 'Aviso';
$string['title_ticker'] = 'Texto';
$string['type_agenda'] = 'Agenda';
$string['type_event'] = 'Evento';
$string['type_media'] = 'Foto o vídeo';
$string['type_notice'] = 'Aviso';
$string['type_ticker'] = 'Cinta';
$string['video_asis'] = 'El servidor no tiene ffmpeg: los vídeos van tal como se subieron, y uno grabado con el móvil puede no verse en todas las pantallas. Pide a quien lleva el sitio que ponga la ruta de ffmpeg.';
$string['video_failed'] = 'no se pudo preparar; va tal como se subió';
$string['video_pending'] = 'preparándose para las pantallas…';
$string['weather_credit'] = 'Datos de MET Norway';
$string['week_from'] = 'desde el';
$string['week_holiday'] = 'Festivo';
$string['week_more'] = '+{n} más';
$string['week_none'] = 'Sin actividades';
$string['week_until'] = 'hasta el';
$string['weekdays'] = 'Días';
$string['when_day'] = 'El {$a}';
$string['when_from'] = 'Desde el {$a}';
$string['when_until'] = 'Hasta el {$a}';
$string['where'] = 'Dónde';
$string['where_some'] = 'Solo en…';
$string['wrongdates'] = 'El último día va antes que el primero.';
$string['wrongfile'] = 'Una foto o un vídeo, por favor.';
$string['wronghour'] = 'Una hora como 08:30.';
$string['wrongrange'] = 'El tramo necesita principio y final.';
