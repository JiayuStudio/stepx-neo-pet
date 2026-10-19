from pathlib import Path
import subprocess,os,hashlib,json
root=Path(__file__).resolve().parents[1]

def java_home():
    # 环境变量优先；其次云端 setup:native 生成的 .toolchains/environment.json；
    # 最后本机 PATH 上的 javac。不在 POSIX 默认参数里执行 macOS java_home（Linux 会炸）。
    configured=os.environ.get('JAVA_HOME')
    if configured and (Path(configured)/'bin/javac').is_file():return Path(configured)
    environment=root.parent/'.toolchains'/'environment.json'
    if environment.is_file():
        try:
            candidate=json.loads(environment.read_text()).get('JAVA_HOME')
            if candidate and (Path(candidate)/'bin/javac').is_file():return Path(candidate)
        except Exception:pass
    import shutil
    compiler=shutil.which('javac')
    if compiler:return Path(compiler).resolve().parent.parent
    raise SystemExit('Install JDK 17+ (or run npm run setup:native); JAVA_HOME not found')

java=java_home()/'bin'
out=root/'build/engine-tests';out.mkdir(parents=True,exist_ok=True)
jar=root/'libs/rhino-1.7.15.1.jar'
subprocess.run([str(java/'javac'),'-encoding','UTF-8','-cp',str(jar),'-d',str(out),str(root/'app/src/com/diandian/neopet/MoriRuntime.java'),str(root/'tests/MoriSuite.java')],check=True)
result=subprocess.check_output([str(java/'java'),'-cp',str(jar)+os.pathsep+str(out),'com.diandian.neopet.MoriSuite',str(root/'app/assets/mori-engine.js'),str(root/'tests/mori-suite.js')],text=True)
expected=json.loads((root/'vendor/mori-source.json').read_text())['modules']
assert all(hashlib.sha256(p.read_bytes()).hexdigest()==expected[p.name] for p in (root/'vendor/mori-game').glob('*.ts'))
report=json.loads(result);report['engine_source_pinned']=True;report['engine_fork']='0.3.3 character/headphones'
(root/'evidence').mkdir(parents=True,exist_ok=True)
(root/'evidence/engine-tests.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
