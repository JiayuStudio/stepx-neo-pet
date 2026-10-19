"""Create a reproducible source archive without local caches or device evidence."""
import gzip
import hashlib
import io
from pathlib import Path
import tarfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
version = ET.parse(ROOT / 'app/AndroidManifest.xml').getroot().get('{http://schemas.android.com/apk/res/android}versionName')
prefix = 'diandian-' + version
output = ROOT / 'artifacts' / (prefix + '-source.tar.gz')
skip = {'node_modules', 'build', 'evidence', 'artifacts', '__pycache__', '.git', '.private', 'dist'}
files = []
for path in sorted(ROOT.rglob('*')):
    relative = path.relative_to(ROOT)
    if any(p in skip for p in relative.parts) or path.is_symlink() or not path.is_file():
        continue
    if path.name in {'.DS_Store', 'Icon\r'} or path.name.endswith(('.tsbuildinfo', '.pyc')):
        continue
    files.append((path, relative))
output.parent.mkdir(exist_ok=True)
with output.open('wb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as compressed:
    with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as archive:
        for path, relative in files:
            data = path.read_bytes()
            info = tarfile.TarInfo(prefix + '/' + relative.as_posix())
            info.size = len(data)
            info.mode = 0o644
            info.uid = info.gid = info.mtime = 0
            info.uname = info.gname = ''
            archive.addfile(info, io.BytesIO(data))
digests = []
for artifact in sorted((ROOT / 'artifacts').iterdir()):
    if artifact.suffix == '.apk' or artifact.name.endswith('-source.tar.gz'):
        digests.append(hashlib.sha256(artifact.read_bytes()).hexdigest() + '  ' + artifact.name)
(ROOT / 'artifacts/SHA256SUMS').write_text('\n'.join(digests) + '\n')
print(f'{output.name}: {len(files)} files, {output.stat().st_size} bytes')
