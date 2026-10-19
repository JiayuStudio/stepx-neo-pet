from pathlib import Path
import subprocess,os,hashlib,json
root=Path(__file__).resolve().parents[1]
java=Path(os.environ.get('JAVA_HOME',subprocess.check_output(['/usr/libexec/java_home'],text=True).strip()))/'bin'
out=root/'build/engine-tests';out.mkdir(parents=True,exist_ok=True)
jar=root/'libs/rhino-1.7.15.1.jar'
subprocess.run([str(java/'javac'),'-encoding','UTF-8','-cp',str(jar),'-d',str(out),str(root/'app/src/com/diandian/neopet/MoriRuntime.java'),str(root/'tests/MoriSuite.java')],check=True)
result=subprocess.check_output([str(java/'java'),'-cp',str(jar)+os.pathsep+str(out),'com.diandian.neopet.MoriSuite',str(root/'app/assets/mori-engine.js'),str(root/'tests/mori-suite.js')],text=True)
expected=json.loads((root/'vendor/mori-source.json').read_text())['modules']
assert all(hashlib.sha256(p.read_bytes()).hexdigest()==expected[p.name] for p in (root/'vendor/mori-game').glob('*.ts'))
report=json.loads(result);report['upstream_source_identical']=True
(root/'evidence/engine-tests.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
