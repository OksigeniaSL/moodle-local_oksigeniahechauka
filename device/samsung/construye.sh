#!/bin/bash
# Builds the Hechauka app for Samsung professional displays (SSSP, Tizen 4 to 6.5) and leaves it where the plugin serves
# it, next to the player: player/Hechauka.wgt, signed, and player/sssp_config.xml, which the display's URL Launcher reads
# first (the version, to update itself; the size; and the name of the package to download). So the address of the
# player, https://MOODLE/local/oksigeniahechauka/player/, is also the one for the URL Launcher.
#
#   bash device/samsung/construye.sh
#
# What it needs, outside the repository:
# - the command line of Tizen Studio (web-cli), at TIZEN_STUDIO (by default ~/tizen-studio);
# - Oksigenia's Tizen author certificate, HECHAUKA_TIZEN_AUTHOR (by default ~/.config/oksigenia/hechauka-tizen-autor.p12),
#   and its password, HECHAUKA_TIZEN_PASSWORD, or the line HECHAUKA_TIZEN_PASSWORD=... of HECHAUKA_TIZEN_ENV (by default
#   ~/.config/oksigenia/hechauka-tizen.env). A display only takes an update signed by the same author as the app it has:
#   this certificate cannot be made again.
#
# The distributor is the SDK's public one of 2012 (Tizen Public Distributor), which displays with Tizen 4 and 5 accept;
# the SDK's newer one (2022, «-new») is unknown to their firmware. Tizen 7 and later ask for a Samsung certificate instead.
#
# Each change to the app raises the last number of the version in app/config.xml: it is the <ver> the displays compare,
# and the build refuses to make a different package with the same one. The build is reproducible: the same app and the
# same certificates make the same bytes. At the end, comprueba.py checks the package and shows its certificates.
set -euo pipefail
AQUI=$(cd "$(dirname "$0")" && pwd)
RAIZ=$(cd "$AQUI/../.." && pwd)
APP=$AQUI/app
OUT=$RAIZ/player
TIZEN_STUDIO=${TIZEN_STUDIO:-$HOME/tizen-studio}
AUTHOR=${HECHAUKA_TIZEN_AUTHOR:-$HOME/.config/oksigenia/hechauka-tizen-autor.p12}
ENVFILE=${HECHAUKA_TIZEN_ENV:-$HOME/.config/oksigenia/hechauka-tizen.env}
CLI=$TIZEN_STUDIO/tools/ide/bin/tizen
CLICONF=$TIZEN_STUDIO/tools/.tizen-cli-config
DIST=$TIZEN_STUDIO/tools/certificate-generator/certificates/distributor/tizen-distributor-signer.p12
DIST_SHA256=16bd01646a08c294cd52b4ab2280357fd6b203da19dbe1774c81aedb690d6c84
# The SDK's own password of its public distributor, the same in every copy of Tizen Studio: not a secret of ours.
DIST_PASS=tizenpkcs12passfordsigner

[ -x "$CLI" ] || { echo "no Tizen Studio command line at $TIZEN_STUDIO (set TIZEN_STUDIO)"; exit 1; }
[ -f "$AUTHOR" ] || { echo "no author certificate at $AUTHOR (set HECHAUKA_TIZEN_AUTHOR)"; exit 1; }
[ -f "$DIST" ] && [ "$(sha256sum "$DIST" | cut -d' ' -f1)" = "$DIST_SHA256" ] ||
    { echo "the SDK's distributor is not the public one of 2012: $DIST"; exit 1; }
if [ -z "${HECHAUKA_TIZEN_PASSWORD:-}" ] && [ -f "$ENVFILE" ]; then
    HECHAUKA_TIZEN_PASSWORD=$(sed -n 's/^HECHAUKA_TIZEN_PASSWORD=//p' "$ENVFILE" | head -1)
fi
[ -n "${HECHAUKA_TIZEN_PASSWORD:-}" ] || { echo "no author password (HECHAUKA_TIZEN_PASSWORD, or $ENVFILE)"; exit 1; }
export HECHAUKA_TIZEN_PASSWORD
DATA=$(sed -n 's/^TIZEN_SDK_DATA_PATH=//p' "$TIZEN_STUDIO/sdk.info")

# The version, and what the package there is already carries.
VERSION=$(python3 -B -c 'import sys, xml.etree.ElementTree as E; print(E.parse(sys.argv[1]).getroot().get("version", ""))' \
    "$APP/config.xml")
[[ $VERSION =~ ^[0-9]+\.[0-9]+\.([0-9]+)$ ]] || { echo "app/config.xml: the version is x.y.z, not $VERSION"; exit 1; }
VER=${BASH_REMATCH[1]}
if [ -f "$OUT/sssp_config.xml" ] && [ -f "$OUT/Hechauka.wgt" ]; then
    python3 -B - "$OUT/sssp_config.xml" "$OUT/Hechauka.wgt" "$APP" "$VER" <<'PY'
import os, re, sys, zipfile, xml.etree.ElementTree as E
sssp, wgt, app, ver = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
old = int(E.parse(sssp).getroot().findtext('ver') or 0)
with zipfile.ZipFile(wgt) as z:
    packed = {n: z.read(n) for n in z.namelist() if not re.match(r'^(author-signature|signature[0-9]+)\.xml$', n)}
mine = {}
for top, _dirs, files in os.walk(app):
    for name in files:
        path = os.path.join(top, name)
        with open(path, 'rb') as f:
            mine[os.path.relpath(path, app).replace(os.sep, '/')] = f.read()
if ver < old:
    sys.exit('app/config.xml: version %d is lower than the %d already built' % (ver, old))
if ver == old and packed != mine:
    sys.exit('the app has changed: raise the last number of the version in app/config.xml (now %d)' % ver)
PY
fi

umask 077
W=$(mktemp -d)
BEFORE=$(sed -n 's/^default\.profiles\.path=//p' "$CLICONF" 2>/dev/null | head -1 || true)
# The command line runs with a home of its own and no session bus: it does not touch the desktop's keyring.
tizen() {
    HOME=$W/home DBUS_SESSION_BUS_ADDRESS=disabled: "$CLI" "$@"
}
# The command line keeps a log with its arguments: nothing of the author's password stays in it, nor the profile that
# carried it, nor the command line's setting pointing at it.
cleanup() {
    if [ -n "$BEFORE" ]; then
        tizen cli-config "default.profiles.path=$BEFORE" >/dev/null 2>&1 || true
    else
        tizen cli-config -d default.profiles.path >/dev/null 2>&1 || true
    fi
    if [ -d "$DATA/cli/logs" ]; then
        python3 -B - "$DATA/cli/logs" <<'PY'
import os, sys
secrets = [s for s in (os.environ.get('HECHAUKA_TIZEN_PASSWORD'), os.environ.get('AUTHOR_OBSCURED')) if s]
for top, _dirs, files in os.walk(sys.argv[1]):
    for name in files:
        path = os.path.join(top, name)
        with open(path, encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
        kept = [line for line in lines if not any(s in line for s in secrets)]
        if len(kept) != len(lines):
            with open(path, 'w', encoding='utf-8') as f:
                f.writelines(kept)
PY
    fi
    rm -rf "$W"
}
trap cleanup EXIT
mkdir -p "$W/home" "$W/app" "$W/out"
cp -r "$APP/." "$W/app/"
# The profile keeps each password as the command line itself does (CipherUtil of Tizen Studio): Triple DES with the key
# that every copy of it carries, so a disguise and not a lock. It lives in the work folder only while signing.
obscure() {
    openssl enc -des-ede3 -K "$(printf 'KYANINYLhijklmnopqrstuvw' | od -An -tx1 | tr -d ' \n')" | base64 -w0
}
AUTHOR_OBSCURED=$(printf '%s' "$HECHAUKA_TIZEN_PASSWORD" | obscure)
DIST_OBSCURED=$(printf '%s' "$DIST_PASS" | obscure)
export AUTHOR_OBSCURED
python3 -B - "$W/profiles.xml" "$AUTHOR" "$DIST" "$DIST_OBSCURED" <<'PY'
import os, sys
from xml.sax.saxutils import quoteattr
path, author, dist, dist_pass = sys.argv[1:]
with open(path, 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<profiles active="hechauka" version="3.1">\n'
            '<profile name="hechauka">\n'
            '<profileitem ca="" distributor="0" key=%s password=%s rootca=""/>\n'
            '<profileitem ca="" distributor="1" key=%s password=%s rootca=""/>\n'
            '<profileitem ca="" distributor="2" key="" password="" rootca=""/>\n'
            '</profile>\n</profiles>\n' % (quoteattr(author), quoteattr(os.environ['AUTHOR_OBSCURED']),
                                            quoteattr(dist), quoteattr(dist_pass)))
PY
tizen cli-config "default.profiles.path=$W/profiles.xml" >/dev/null
tizen package -t wgt -s hechauka -o "$W/out" -- "$W/app" > "$W/package.log" 2>&1 ||
    { grep -v -F "$HECHAUKA_TIZEN_PASSWORD" "$W/package.log"; exit 1; }
SIGNED=$(find "$W/out" -name '*.wgt' | head -1)
[ -n "$SIGNED" ] || { grep -v -F "$HECHAUKA_TIZEN_PASSWORD" "$W/package.log"; exit 1; }

# The same zip whatever the day and the folder: the files in order, with a fixed date. The signatures cover what the files
# say, not how they are packed.
python3 -B - "$SIGNED" "$W/Hechauka.wgt" <<'PY'
import sys, zipfile
src, dst = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(src) as z:
    files = {n: z.read(n) for n in z.namelist() if not n.endswith('/')}
with zipfile.ZipFile(dst, 'w') as out:
    for name in sorted(files):
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        info.create_system = 3
        out.writestr(info, files[name], compresslevel=9)
PY
SIZE=$(stat -c %s "$W/Hechauka.wgt")
printf '<?xml version="1.0" encoding="UTF-8"?>\n<widget>\n<ver>%s</ver>\n<size>%s</size>\n<widgetname>Hechauka</widgetname>\n<webtype>tizen</webtype>\n</widget>\n' \
    "$VER" "$SIZE" > "$W/sssp_config.xml"
python3 -B "$AQUI/comprueba.py" "$W/Hechauka.wgt" "$W/sssp_config.xml" "$APP"
SAME=no
if [ -f "$OUT/Hechauka.wgt" ] && cmp -s "$W/Hechauka.wgt" "$OUT/Hechauka.wgt"; then
    SAME=yes
fi
install -m 644 "$W/Hechauka.wgt" "$OUT/Hechauka.wgt"
install -m 644 "$W/sssp_config.xml" "$OUT/sssp_config.xml"
echo "player/Hechauka.wgt ($SIZE bytes, version $VERSION) and player/sssp_config.xml (ver $VER)" \
    "$([ $SAME = yes ] && echo '- the same bytes as before')"
