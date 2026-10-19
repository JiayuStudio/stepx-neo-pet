"""Check native appearance selection against the actual bundled animation catalog."""
from pathlib import Path
import subprocess,json,os
from toolchain import ROOT,java_home
out=ROOT/'build/appearance-tests';out.mkdir(parents=True,exist_ok=True)
java=java_home()/'bin'
subprocess.run([str(java/'javac'),'-encoding','UTF-8','-d',str(out),str(ROOT/'app/src/com/diandian/neopet/MoriAppearance.java'),str(ROOT/'tests/MoriAppearanceTest.java')],check=True)
lines=subprocess.check_output([str(java/'java'),'-cp',str(out),'MoriAppearanceTest'],text=True).splitlines()
frames=json.loads((ROOT/'app/assets/pet-frames.json').read_text());keys=lines[1:]
assert len(keys)==252 and len(set(keys))==252
assert all(k in frames for k in keys)
report={'native_fixtures':int(lines[0].split('=')[1]),'native_keys_resolved_in_packaged_art':len(keys)}
(ROOT/'evidence/appearance-tests.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
