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
for i in $(seq 1 40); do apt-get update -q && break; log "no network yet ($i)"; sleep 15; done
export DEBIAN_FRONTEND=noninteractive
O=(-y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)
apt-get "${O[@]}" full-upgrade && log "system upgraded"
apt-get "${O[@]}" install v4l-utils wlrctl fonts-noto-color-emoji unattended-upgrades && log "packages installed"

# 3. Our files (the FAT boot partition keeps no permissions: they are set here) and the address of the player.
cp -r "$AQUI/raiz/." /
(cd "$AQUI/raiz" && find . -type f) | sed 's|^\.||' | while read -r f; do chown root:root "$f"; chmod 644 "$f"; done
chmod 755 /usr/local/bin/hechauka-* /usr/local/lib/hechauka/*.py
systemd-tmpfiles --create /etc/tmpfiles.d/hechauka.conf
install -m 644 "$AQUI/pantalla.conf" /etc/hechauka/pantalla.conf
# The version of the software just installed: the guardian keeps it up to date from the screen's Moodle.
install -d -m 755 /var/lib/hechauka
python3 -B -c 'import json, sys; json.dump({"version": json.load(open(sys.argv[1]))["version"]}, open(sys.argv[2], "w"))' \
    "$AQUI/manifest.json" /var/lib/hechauka/instalado.json
log "files copied; player: $(grep '^URL=' /etc/hechauka/pantalla.conf)"

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

# 5. Services: SSH only with the key, the measurements every minute, updates. The maintenance account gets no sound
#    server when it logs in over SSH (only for it: the screen session keeps its sound, for the screens that play it).
systemctl enable ssh hechauka-mide.timer hechauka-guardian hechauka-reinicio.timer unattended-upgrades >/dev/null 2>&1
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
