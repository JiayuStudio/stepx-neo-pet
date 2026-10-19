# Adapted from backscreen-toolbox v1.1.0, MIT; see app/assets/LICENSE-backscreen-toolbox.txt
#!/usr/bin/env python3
"""Build from installed Android tools; official signing is always explicit."""
import argparse
import hashlib
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import zipfile
import xml.etree.ElementTree as ET

from toolchain import ROOT, java_home, sdk_home, sdk_tool


def run(args, **kwargs):
    subprocess.run([str(a) for a in args], check=True, **kwargs)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release', action='store_true', help='Require an existing signing key')
    parser.add_argument('--keystore', type=Path)
    parser.add_argument('--ks-key-alias', default='backscreen-toolbox')
    parser.add_argument('--ks-pass-env', default='BACKSCREEN_STORE_PASS')
    args = parser.parse_args()
    if args.release and (not args.keystore or not args.keystore.is_file()):
        parser.error('--release requires --keystore pointing to an existing private key')
    if args.release and not os.environ.get(args.ks_pass_env):
        parser.error('Set the password environment variable named by --ks-pass-env')
    if args.keystore and not args.release:
        parser.error('Use --release when supplying a signing key')

    java, sdk = java_home(), sdk_home()
    os.environ['JAVA_HOME'] = str(java)
    bt = sdk / 'build-tools/36.0.0'
    jar = sdk / 'platforms/android-36/android.jar'
    if not jar.is_file():
        raise SystemExit('Install Android SDK platforms;android-36')
    out = ROOT / 'build/apk'
    if out.exists():
        shutil.rmtree(out)
    for name in ('classes', 'dex', 'gen'):
        (out / name).mkdir(parents=True, exist_ok=True)
    run([sdk_tool(bt, 'aapt2'), 'compile', '--dir', ROOT / 'app/res', '-o', out / 'resources.zip'])
    run([sdk_tool(bt, 'aapt2'), 'link', '-I', jar, '--manifest', ROOT / 'app/AndroidManifest.xml', '-A', ROOT / 'app/assets', '--java', out / 'gen', '-o', out / 'unsigned.apk', out / 'resources.zip'])
    dependencies = [ROOT / 'libs/rhino-1.7.15.1.jar']
    sources = sorted((ROOT / 'app/src').rglob('*.java')) + sorted((out / 'gen').rglob('*.java'))
    run([sdk_tool(java / 'bin', 'javac'), '-encoding', 'UTF-8', '-source', '8', '-target', '8', '-bootclasspath', str(jar) + os.pathsep + str(bt / 'core-lambda-stubs.jar'), '-classpath', os.pathsep.join(map(str,dependencies)), '-d', out / 'classes', *sources])
    run([sdk_tool(bt, 'd8'), '--min-api', '34', '--lib', jar, '--output', out / 'dex', *sorted((out / 'classes').rglob('*.class')), *dependencies])
    with zipfile.ZipFile(out / 'unsigned.apk', 'a') as archive:
        archive.write(out / 'dex/classes.dex', 'classes.dex', compress_type=zipfile.ZIP_DEFLATED)
        for dependency in dependencies:
            with zipfile.ZipFile(dependency) as library:
                for name in library.namelist():
                    if name.endswith('.properties'):
                        archive.writestr(name, library.read(name), compress_type=zipfile.ZIP_DEFLATED)
    run([sdk_tool(bt, 'zipalign'), '-P', '16', '-f', '4', out / 'unsigned.apk', out / 'aligned.apk'])

    if args.release:
        keystore, alias, pass_env = args.keystore, args.ks_key_alias, args.ks_pass_env
    else:
        private = ROOT.parent / '.private' / 'diandian-android'
        private.mkdir(mode=0o700, parents=True, exist_ok=True)
        keystore, alias, pass_env = private / 'development.p12', 'development', 'BACKSCREEN_DEV_PASS'
        password_file = private / 'development-password.txt'
        if keystore.exists() != password_file.exists():
            raise SystemExit('Development key/password pair is incomplete; restore both before building')
        if not password_file.exists():
            password_file.write_text(secrets.token_urlsafe(28))
            password_file.chmod(0o600)
        os.environ[pass_env] = password_file.read_text().strip()
        if not keystore.exists():
            run([sdk_tool(java / 'bin', 'keytool'), '-genkeypair', '-keystore', keystore, '-storepass:env', pass_env, '-alias', alias, '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-dname', 'CN=Diandian Native Local'], stdout=subprocess.DEVNULL)
            keystore.chmod(0o600)
    dist = ROOT / 'artifacts'
    dist.mkdir(exist_ok=True)
    version = ET.parse(ROOT / 'app/AndroidManifest.xml').getroot().get('{http://schemas.android.com/apk/res/android}versionName')
    suffix = '' if args.release else '-dev'
    apk = dist / ('diandian-native-' + version + '.apk')
    run([sdk_tool(bt, 'apksigner'), 'sign', '--ks', keystore, '--ks-key-alias', alias, '--ks-pass', 'env:' + pass_env, '--out', apk, out / 'aligned.apk'])
    run([sdk_tool(bt, 'apksigner'), 'verify', apk])
    (dist / (apk.name + '.sha256')).write_text(hashlib.sha256(apk.read_bytes()).hexdigest() + '  ' + apk.name + '\n')
    print(apk)


if __name__ == '__main__':
    main()
