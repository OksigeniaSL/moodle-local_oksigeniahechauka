#!/usr/bin/env python3
"""Checks the Samsung package that the plugin serves in player/ (Hechauka.wgt and sssp_config.xml): that it carries the
app of device/samsung/app/ as it is, that sssp_config.xml says its real size and version, and that both of its signatures,
the author's (author-signature.xml) and the distributor's (signature1.xml), cover every file and verify, with the chain and
the dates of each certificate. Signatures are checked with the openssl command; without it, only the digests.

    python3 -B device/samsung/comprueba.py [WGT [SSSP_CONFIG [APP_FOLDER]]]
"""
import base64
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
WGT = os.path.join(ROOT, 'player', 'Hechauka.wgt')
SSSP = os.path.join(ROOT, 'player', 'sssp_config.xml')
APP = os.path.join(HERE, 'app')
DS = '{http://www.w3.org/2000/09/xmldsig#}'
WIDGETS = '{http://www.w3.org/ns/widgets}'
DIGESTS = {'http://www.w3.org/2001/04/xmlenc#sha512': 'sha512', 'http://www.w3.org/2001/04/xmlenc#sha256': 'sha256'}
METHODS = {'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512': 'sha512',
           'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256': 'sha256'}
ROLES = {'author-signature.xml': ('AuthorSignature', 'http://www.w3.org/ns/widgets-digsig#role-author'),
         'signature1.xml': ('DistributorSignature', 'http://www.w3.org/ns/widgets-digsig#role-distributor')}
SIGNATURES = re.compile(r'^(author-signature|signature[0-9]+)\.xml$')


def app_files(folder):
    """The files of the app, as paths relative to its folder."""
    found = []
    for top, _dirs, files in os.walk(folder):
        for name in files:
            found.append(os.path.relpath(os.path.join(top, name), folder).replace(os.sep, '/'))
    return sorted(found)


def version(config):
    """The version of the app (config.xml) and its last number, which is the <ver> the displays compare."""
    text = ET.fromstring(config).get('version', '')
    if not re.match(r'^[0-9]+\.[0-9]+\.[0-9]+$', text):
        raise ValueError('config.xml: the version must be x.y.z, not %r' % text)
    return text, int(text.split('.')[-1])


def canonical(raw, name, attrs=b''):
    """The canonical form of an element of a signature as the Tizen packager writes it: the element as it is in the file,
    with the namespace it inherits. Equal to exclusive C14N for SignedInfo and to C14N 1.1 for the properties Object, for
    what the packager writes (no comments, no attributes but Id, LF line ends): if it were not, neither the digest of the
    properties nor the signature would verify."""
    opening = b'<' + name + attrs + b'>'
    closing = b'</' + name + b'>'
    start = raw.index(opening)
    end = raw.index(closing, start) + len(closing)
    return b'<' + name + b' xmlns="http://www.w3.org/2000/09/xmldsig#"' + attrs + b'>' + raw[start + len(opening):end]


def openssl(*args, data=None):
    return subprocess.run(['openssl'] + list(args), input=data, capture_output=True, check=False)


def pem(b64):
    body = re.sub(r'\s+', '', b64)
    lines = [body[i:i + 64] for i in range(0, len(body), 64)]
    return ('-----BEGIN CERTIFICATE-----\n' + '\n'.join(lines) + '\n-----END CERTIFICATE-----\n').encode()


def describe(cert):
    out = openssl('x509', '-noout', '-subject', '-issuer', '-startdate', '-enddate', '-nameopt', 'RFC2253', data=cert)
    info = {}
    for line in out.stdout.decode().splitlines():
        key, _, value = line.partition('=')
        info[key.strip()] = value.strip()
    return info


def check_signature(name, raw, files, work, problems, report):
    """One signature file: what it covers, its digests, its value and its chain."""
    doc = ET.fromstring(raw)
    want_id, want_role = ROLES[name]
    if doc.get('Id') != want_id:
        problems.append('%s: Id %r, not %r' % (name, doc.get('Id'), want_id))
    role = doc.find('.//{http://www.w3.org/2009/xmldsig-properties}Role')
    if role is None or role.get('URI') != want_role:
        problems.append('%s: the role is not %s' % (name, want_role))
    info = doc.find(DS + 'SignedInfo')
    method = METHODS.get(info.find(DS + 'SignatureMethod').get('Algorithm'))
    if not method:
        problems.append('%s: unknown signature method' % name)
        return
    covered = set()
    for ref in info.findall(DS + 'Reference'):
        uri = ref.get('URI')
        algo = DIGESTS.get(ref.find(DS + 'DigestMethod').get('Algorithm'))
        want = base64.b64decode(re.sub(r'\s+', '', ref.find(DS + 'DigestValue').text))
        if uri == '#prop':
            data = canonical(raw, b'Object', b' Id="prop"')
        elif uri in files:
            data = files[uri]
            covered.add(uri)
        else:
            problems.append('%s: covers %s, which is not in the package' % (name, uri))
            continue
        if not algo or hashlib.new(algo, data).digest() != want:
            problems.append('%s: the digest of %s does not match' % (name, uri))
    # The author covers every file but the signatures; a distributor, also the author's signature.
    if name == 'author-signature.xml':
        must = {n for n in files if not SIGNATURES.match(n)}
    else:
        must = {n for n in files if not re.match(r'^signature[0-9]+\.xml$', n)}
    if covered != must:
        problems.append('%s: covers %s, should cover %s' % (name, sorted(covered), sorted(must)))
    signed = canonical(raw, b'SignedInfo')
    certs = [pem(c.text) for c in doc.iter(DS + 'X509Certificate')]
    if not certs:
        problems.append('%s: no certificate' % name)
        return
    if not shutil.which('openssl'):
        report.append('%s: digests checked; without openssl, neither its value nor its chain' % name)
        return
    leaf = os.path.join(work, name + '.leaf.pem')
    with open(leaf, 'wb') as f:
        f.write(certs[0])
    key = openssl('x509', '-noout', '-pubkey', '-in', leaf).stdout
    keyfile = os.path.join(work, name + '.pub.pem')
    with open(keyfile, 'wb') as f:
        f.write(key)
    sigfile = os.path.join(work, name + '.sig')
    with open(sigfile, 'wb') as f:
        f.write(base64.b64decode(re.sub(r'\s+', '', doc.find(DS + 'SignatureValue').text)))
    done = openssl('dgst', '-' + method, '-verify', keyfile, '-signature', sigfile, data=signed)
    verified = done.returncode == 0 and b'Verified OK' in done.stdout
    if not verified:
        problems.append('%s: the signature does not verify' % name)
    lines = ['%s (%s): signature %s' % (name, want_id, 'verifies' if verified else 'DOES NOT verify')]
    for i, cert in enumerate(certs):
        d = describe(cert)
        link = ''
        if i + 1 < len(certs):
            child = os.path.join(work, '%s.%d.pem' % (name, i))
            parent = os.path.join(work, '%s.%d.ca.pem' % (name, i))
            with open(child, 'wb') as f:
                f.write(cert)
            with open(parent, 'wb') as f:
                f.write(certs[i + 1])
            # The time and the old algorithms (SHA-1, 1024 bits) of these certificates are not what is checked here:
            # only that each one is signed by the next.
            ok = openssl('verify', '-no_check_time', '-partial_chain', '-auth_level', '0', '-CAfile', parent, child)
            link = ', signed by the next' if ok.returncode == 0 else ', NOT signed by the next'
            if ok.returncode != 0:
                problems.append('%s: certificate %d is not signed by the next one' % (name, i + 1))
        lines.append('  %d. %s; valid %s to %s%s' % (i + 1, d.get('subject', '?'), d.get('notBefore', '?'),
                                                      d.get('notAfter', '?'), link))
    report.append('\n'.join(lines))


def check(wgt=WGT, sssp=SSSP, app=APP):
    """The problems found (empty if none) and a report of the signatures."""
    problems = []
    report = []
    with zipfile.ZipFile(wgt) as z:
        files = {n: z.read(n) for n in z.namelist() if not n.endswith('/')}
    for name in ('config.xml', 'author-signature.xml', 'signature1.xml'):
        if name not in files:
            problems.append('the package has no %s' % name)
    if problems:
        return problems, report
    inside = sorted(n for n in files if not SIGNATURES.match(n))
    if app:
        source = app_files(app)
        if inside != source:
            problems.append('the package carries %s, the app has %s' % (inside, source))
        for name in source:
            if name in files:
                with open(os.path.join(app, name), 'rb') as f:
                    if f.read() != files[name]:
                        problems.append('%s in the package is not the one of the app: build it again' % name)
    text, ver = version(files['config.xml'])
    tree = ET.parse(sssp).getroot()
    values = {child.tag: (child.text or '').strip() for child in tree}
    if values.get('widgetname') != 'Hechauka' or values.get('webtype') != 'tizen':
        problems.append('sssp_config.xml: widgetname Hechauka and webtype tizen')
    if values.get('ver') != str(ver):
        problems.append('sssp_config.xml: ver %s, the app is %s' % (values.get('ver'), text))
    if values.get('size') != str(os.path.getsize(wgt)):
        problems.append('sssp_config.xml: size %s, the package has %d bytes' % (values.get('size'), os.path.getsize(wgt)))
    package = ET.fromstring(files['config.xml']).find('{http://tizen.org/ns/widgets}application')
    report.append('%s, version %s (ver %d), %d bytes, app %s' % (os.path.basename(wgt), text, ver, os.path.getsize(wgt),
                                                                  package.get('id') if package is not None else '?'))
    with tempfile.TemporaryDirectory() as work:
        for name in ('author-signature.xml', 'signature1.xml'):
            check_signature(name, files[name], files, work, problems, report)
    return problems, report


def main(argv):
    wgt = argv[1] if len(argv) > 1 else WGT
    sssp = argv[2] if len(argv) > 2 else SSSP
    app = argv[3] if len(argv) > 3 else APP
    problems, report = check(wgt, sssp, app)
    print('\n'.join(report))
    for p in problems:
        print('PROBLEM: ' + p)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
