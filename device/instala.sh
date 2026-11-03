#!/bin/bash
# Installs a Hechauka screen on a Raspberry Pi. cloud-init runs it on first boot from the boot partition
# (/boot/firmware/hechauka); a copy stays in /usr/local/lib/hechauka/instalacion to redo it:
#   sudo bash /usr/local/lib/hechauka/instalacion/instala.sh
# Log in /var/log/hechauka-instala.log.
set -uo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
log() { echo "$(date '+%F %T') $*"; }
log "== installing the screen ($(tr -d '\0' < /proc/device-tree/model))"

# 0. All this takes minutes with nothing but a desktop on the screen, which looks stuck: it says what is going on, as soon as the
#    session is up. The maintenance account is the one in session until the reboot; the screen's own never sees this.
(
    for i in $(seq 1 60); do pgrep -u hechauka -x labwc >/dev/null && break; sleep 2; done
    sudo -u hechauka env XDG_RUNTIME_DIR="/run/user/$(id -u hechauka)" WAYLAND_DISPLAY=wayland-0 pcmanfm --profile default \
        --set-wallpaper="$AQUI/raiz/usr/share/hechauka/preparando.png" --wallpaper-mode=stretch
) >/dev/null 2>&1 &

# 1. The account of the screen: «pantalla», without a password or admin rights; it goes straight into the session.
#    cloud-init turns the spare user of the image (uid 1000, «pi») into the maintenance account, so it is usually new.
if getent passwd pi >/dev/null; then
    mkdir -p /var/lib/userconf-pi && touch /var/lib/userconf-pi/autologin
    /usr/lib/userconf-pi/userconf pi pantalla '' && log "screen account: pantalla (the spare one)"
fi
if ! getent passwd pantalla >/dev/null; then
    useradd -m -c Pantalla -s /bin/bash -G audio,video,render,input pantalla && log "screen account: pantalla"
fi
for g in sudo adm lpadmin gpio spi i2c dialout plugdev netdev; do gpasswd -d pantalla "$g" >/dev/null 2>&1; done
sed -i '/^pantalla /d' /etc/sudoers.d/010_pi-nopasswd 2>/dev/null

# 2. Packages: the system up to date, cec-ctl (v4l-utils) to switch the display on and off, wlrctl to move the pointer
#    away, the colour emoji (school calendars put them in their titles: «🎃 Halloween») and security updates every day.
#    The clock first: a Raspberry has none of its own, and with the time it had when it was switched off the signatures of
#    the repositories are «not live yet», which apt only warns about before going on with the old lists of the image
#    (3 November 2026). So it waits for the time, and a list that does not check out counts as no network.
for i in $(seq 1 60); do [ "$(timedatectl show -p NTPSynchronized --value 2>/dev/null)" = yes ] && break; sleep 5; done
log "clock: $(date '+%F %T %Z')"
for i in $(seq 1 40); do apt-get update -q --error-on=any && break; log "no network yet ($i)"; sleep 15; done
export DEBIAN_FRONTEND=noninteractive
O=(-y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)
apt-get "${O[@]}" full-upgrade && log "system upgraded"
apt-get "${O[@]}" install v4l-utils wlrctl fonts-noto-color-emoji unattended-upgrades && log "packages installed"

# 3. Our files (the FAT boot partition keeps no permissions: they are set here).
cp -r "$AQUI/raiz/." /
(cd "$AQUI/raiz" && find . -type f) | sed 's|^\.||' | while read -r f; do chown root:root "$f"; chmod 644 "$f"; done
chmod 755 /usr/local/bin/hechauka-* /usr/local/lib/hechauka/*.py
systemd-tmpfiles --create /etc/tmpfiles.d/hechauka.conf
# The version of the software just installed: the guardian keeps it up to date from the screen's Moodle.
install -d -m 755 /var/lib/hechauka
python3 -B -c 'import json, sys; json.dump({"version": json.load(open(sys.argv[1]))["version"]}, open(sys.argv[2], "w"))' \
    "$AQUI/manifest.json" /var/lib/hechauka/instalado.json

# 3b. What is this screen's own. The card is the same for every centre; the file of the panel («Prepare a screen»),
#     copied to the card next to this folder, brings the address of its Moodle, the name of the screen, its time zone and
#     the keys for its maintenance. It is read, not run (it was written on any computer), and each value is checked.
#     Without an address, or with one that does not answer, the screen asks for it (hechauka-ajuste).
LIB="$AQUI/raiz/usr/local/lib/hechauka"
PANEL=$(ls -t /boot/firmware/hechauka*.conf* 2>/dev/null | head -n 1)
[ -n "$PANEL" ] || PANEL="$AQUI/panel.conf"
valor() {   # valor KEY: from the panel's file, else from the card's own conf
    python3 -B - "$LIB" "$1" "$PANEL" "$AQUI/pantalla.conf" <<'PY'
import sys
sys.path.insert(0, sys.argv[1])
import ajuste
for path in sys.argv[3:]:
    v = ajuste.read_conf(path).get(sys.argv[2])
    if v:
        print('\n'.join(v) if isinstance(v, list) else v)
        break
PY
}
URL=$(valor URL)
if [ -n "$URL" ]; then
    URL=$(python3 -B -c 'import sys; sys.path.insert(0, sys.argv[1]); import ajuste; c = ajuste.candidates(sys.argv[2]);
print(c[0] + ajuste.PLUGIN + "/player/" if c else "")' "$LIB" "$URL")
fi
NUEVA=0
[ -e /etc/hechauka/pantalla.conf ] || NUEVA=1
if [ -z "$URL" ] && [ "$NUEVA" = 0 ]; then
    # Done again by hand on a screen that already had its Moodle: it keeps it.
    URL=$(sed -n 's/^URL=//p' /etc/hechauka/pantalla.conf | tail -n 1)
fi
printf 'URL=%s\n' "$URL" > /etc/hechauka/pantalla.conf
ZONA=$(valor ZONA)
if [ -n "$ZONA" ] && [[ $ZONA =~ ^[A-Za-z][A-Za-z0-9_+/-]*$ ]] && [ -f "/usr/share/zoneinfo/$ZONA" ]; then
    timedatectl set-timezone "$ZONA" && printf 'ZONA=%s\n' "$ZONA" >> /etc/hechauka/pantalla.conf && log "time zone: $ZONA"
fi
chmod 644 /etc/hechauka/pantalla.conf
# Checked at the next boot before the player opens on it, and asked for if it does not answer.
[ "$NUEVA" = 1 ] && touch /var/lib/hechauka/por-comprobar
log "files copied; player: ${URL:-none yet, the screen will ask for it}"

# The name on the network: the one from the panel, the one the card was made with or, for the card of everyone,
# hechauka- and the end of the Raspberry's serial number, so that two screens of the same centre never share it.
NOMBRE=$(valor NOMBRE | tr '[:upper:]' '[:lower:]' | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null |
    sed 's/[^a-z0-9-]/-/g; s/--*/-/g; s/^-//; s/-$//' | cut -c1-50)
if [ -z "$NOMBRE" ] && { [ "$(hostname)" = hechauka ] || [ "$(hostname)" = raspberrypi ]; }; then
    NOMBRE="hechauka-$(tr -d '\0' < /proc/device-tree/serial-number | tail -c 4 | tr '[:upper:]' '[:lower:]')"
fi
if [ -n "$NOMBRE" ]; then
    hostnamectl set-hostname "$NOMBRE" && log "name on the network: $NOMBRE"
fi
if grep -q '^127\.0\.1\.1' /etc/hosts; then
    sed -i "s/^127\.0\.1\.1.*/127.0.1.1\t$(hostname)/" /etc/hosts
else
    printf '127.0.1.1\t%s\n' "$(hostname)" >> /etc/hosts
fi

# The keys of whoever looks after the screen by SSH (user hechauka), if the panel's file brings any.
valor LLAVE | while read -r k; do
    if [[ $k =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com)\ [A-Za-z0-9+/=]+(\ [[:print:]]*)?$ ]]; then
        install -d -m 700 -o hechauka -g hechauka /home/hechauka/.ssh
        touch /home/hechauka/.ssh/authorized_keys
        grep -qxF "$k" /home/hechauka/.ssh/authorized_keys || echo "$k" >> /home/hechauka/.ssh/authorized_keys
        chown hechauka:hechauka /home/hechauka/.ssh/authorized_keys && chmod 600 /home/hechauka/.ssh/authorized_keys
        log "maintenance key: ${k:0:24}…"
    else
        log "WARNING: a maintenance key that is not one, left out"
    fi
done
# A copy of the panel's file goes with the installation (step 6), and it leaves the card.
if [ "$PANEL" != "$AQUI/panel.conf" ] && [ -f "$PANEL" ]; then
    cp "$PANEL" "$AQUI/panel.conf" 2>/dev/null
    rm -f /boot/firmware/hechauka*.conf*
fi

# 4. The screen session with «pantalla» instead of the Raspberry desktop, and no text console left logged in on tty1.
sed -i 's/^autologin-user=.*/autologin-user=pantalla/; s/^autologin-session=.*/autologin-session=hechauka/;
        s/^user-session=.*/user-session=hechauka/' /etc/lightdm/lightdm.conf
grep -q "^autologin-user=pantalla" /etc/lightdm/lightdm.conf || log "WARNING: autologin does not point to pantalla"
rm -f /etc/systemd/system/getty@tty1.service.d/autologin.conf
rmdir /etc/systemd/system/getty@tty1.service.d 2>/dev/null
raspi-config nonint do_blanking 1 >/dev/null 2>&1   # the display never blanks by itself

# The boot: our mark, without the firmware's rainbow, the kernel's logo or the Raspberry splash.
grep -q '^disable_splash=1' /boot/firmware/config.txt || echo 'disable_splash=1' >> /boot/firmware/config.txt
grep -q 'logo.nologo' /boot/firmware/cmdline.txt || sed -i '1s/$/ logo.nologo vt.global_cursor_default=0/' /boot/firmware/cmdline.txt
plymouth-set-default-theme -R hechauka && log "boot: our splash"

# 5. Services: where the screen finds its Moodle, SSH only with the key, the measurements every minute, updates. The
#    maintenance account gets no sound server when it logs in over SSH (only for it: the screen session keeps its sound,
#    for the screens that play it).
systemctl enable ssh hechauka-ajuste hechauka-mide.timer hechauka-guardian hechauka-reinicio.timer unattended-upgrades >/dev/null 2>&1
install -d -o hechauka -g hechauka /home/hechauka/.config /home/hechauka/.config/systemd /home/hechauka/.config/systemd/user
for u in pipewire.socket pipewire-pulse.socket wireplumber.service; do
    ln -sf /dev/null "/home/hechauka/.config/systemd/user/$u"
done

# 6. cloud-init does not act again, and a copy of the installation stays.
touch /etc/cloud/cloud-init.disabled
rm -rf /usr/local/lib/hechauka/instalacion && mkdir -p /usr/local/lib/hechauka/instalacion
cp -r "$AQUI/." /usr/local/lib/hechauka/instalacion/
[ "$AQUI" = /boot/firmware/hechauka ] && rm -rf /boot/firmware/hechauka
log "== installed; rebooting"
sync
systemctl reboot
