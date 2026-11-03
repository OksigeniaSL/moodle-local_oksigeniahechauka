#!/bin/bash
# Builds the card of a Hechauka screen for a Raspberry Pi: Raspberry Pi OS Trixie 64 bits with user-data and hechauka/ in
# the boot partition (mtools, no root needed) and without the welcome wizard, which would cross the installation
# (debugfs). On its first boot, with a network cable, the card installs itself (../instala.sh) and restarts into the screen.
#
# With no options it is the card for every centre, the one published with the plugin's releases: no Moodle (the screen
# asks for it, or takes it from the hechauka.conf of the panel), a name from its serial number, UTC until its Moodle says
# its time zone, and no maintenance key. The options make a card for one screen.
#
#   bash construye.sh WORK_FOLDER [--url PLAYER_URL] [--nombre HOSTNAME] [--zona TIME_ZONE] [--llave KEY.pub] [--xz]
#
# Leaves pantalla.img in the work folder (and pantalla.img.xz with its .sha256, with --xz), ready for Raspberry Pi Imager.
set -euo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
DEVICE=$(cd "$AQUI/.." && pwd)
[ -f "$DEVICE/manifest.sig" ] || { echo "no signed device/ at $DEVICE"; exit 1; }
T=${1:?work folder}
shift
URL=
NOMBRE=hechauka
ZONA=Etc/UTC
LLAVE=
XZ=0
while [ $# -gt 0 ]; do
    case $1 in
        --url) URL=$2; shift 2 ;;
        --nombre) NOMBRE=$2; shift 2 ;;
        --zona) ZONA=$2; shift 2 ;;
        --llave) LLAVE=$2; shift 2 ;;
        --xz) XZ=1; shift ;;
        *) echo "unknown option: $1"; exit 1 ;;
    esac
done
[ -z "$URL" ] || [[ $URL == https://* ]] || { echo "the player address must be https"; exit 1; }
[[ $NOMBRE =~ ^[a-z0-9-]{1,63}$ ]] || { echo "hostname: lowercase letters, digits and hyphens"; exit 1; }
[ -f "/usr/share/zoneinfo/$ZONA" ] || { echo "unknown time zone: $ZONA"; exit 1; }
[ -z "$LLAVE" ] || [ -f "$LLAVE" ] || { echo "no key at $LLAVE"; exit 1; }
IMG_URL=https://downloads.raspberrypi.com/raspios_arm64/images/raspios_arm64-2026-10-06/2026-10-06-raspios-trixie-arm64.img.xz
mkdir -p "$T" && cd "$T"

if [ ! -f raspios.img ]; then
    [ -f raspios.img.xz ] || curl -sSL -o raspios.img.xz "$IMG_URL"
    curl -sSL "$IMG_URL.sha256" | awk '{print $1"  raspios.img.xz"}' | sha256sum -c --quiet
    xz -dk -T2 raspios.img.xz   # two threads: with all of them it goes past 2 GB of memory
fi
cp --reflink=auto raspios.img pantalla.img
read -r _ B_INICIO B_TAM R_INICIO R_TAM < <(/sbin/sfdisk -d pantalla.img |
    awk -F'[=,]' '/img1/{b=$2+0; bs=$4+0} /img2/{r=$2+0; rs=$4+0} END{print "x", b, bs, r, rs}')
echo "partitions: boot at $B_INICIO, system at $R_INICIO"

# Without the welcome wizard (the installation sets the screen account and its automatic login).
dd if=pantalla.img of=sistema.ext4 bs=512 skip="$R_INICIO" count="$R_TAM" status=none
debugfs -w -R "rm /etc/xdg/autostart/piwiz.desktop" sistema.ext4 2>&1 | grep -v "^debugfs" || true
dd if=sistema.ext4 of=pantalla.img bs=512 seek="$R_INICIO" conv=notrunc status=none
rm -f sistema.ext4

# Boot partition: user-data (hostname, time zone and, if given, the maintenance key) and the hechauka/ folder with the
# address of the player, if given.
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
if [ -n "$LLAVE" ]; then
    sed "s|LLAVE|$(cat "$LLAVE")|; s|NOMBRE|$NOMBRE|; s|ZONA|$ZONA|" "$AQUI/user-data" > "$TMP/user-data"
else
    sed '/ssh_authorized_keys:/d; /- LLAVE/d' "$AQUI/user-data" | sed "s|NOMBRE|$NOMBRE|; s|ZONA|$ZONA|" > "$TMP/user-data"
fi
mkdir -p "$TMP/hechauka"
cp -r "$DEVICE/raiz" "$DEVICE/instala.sh" "$DEVICE/manifest.json" "$DEVICE/manifest.sig" "$TMP/hechauka/"
printf 'URL=%s\n' "$URL" > "$TMP/hechauka/pantalla.conf"
P="pantalla.img@@$((B_INICIO * 512))"
mcopy -o -i "$P" "$TMP/user-data" ::user-data
mdeltree -i "$P" ::hechauka 2>/dev/null || true
mcopy -s -i "$P" "$TMP/hechauka" ::
echo "== boot partition:"; mdir -i "$P" -w ::hechauka | head -5
echo "player: ${URL:-asked on the screen} · name: $NOMBRE · time zone: $ZONA · key: ${LLAVE:-none}"
ls -la pantalla.img | awk '{printf "image ready: %s (%.1f GB)\n", $9, $5/1e9}'
if [ "$XZ" = 1 ]; then
    rm -f pantalla.img.xz
    xz -k -T2 -6 pantalla.img
    sha256sum pantalla.img.xz > pantalla.img.xz.sha256
    ls -la pantalla.img.xz | awk '{printf "compressed: %s (%.2f GB)\n", $9, $5/1e9}'
fi
