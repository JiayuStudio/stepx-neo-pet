"""Run pure pet and CPU lifecycle policy tests with the configured JDK."""
from pathlib import Path
import subprocess
from toolchain import ROOT, java_home

jdk = java_home()
out = ROOT / 'build/tests'
out.mkdir(parents=True, exist_ok=True)
source = ROOT / 'app/src/com/diandian/neopet'
subprocess.run([str(jdk / 'bin/javac'), '-encoding', 'UTF-8', '-d', str(out),
    str(source / 'PetEngine.java'), str(source / 'LockedDisplayPolicy.java'),
    str(ROOT / 'tests/PetEngineTest.java')], check=True)
subprocess.run([str(jdk / 'bin/java'), '-cp', str(out), 'PetEngineTest'], check=True)
