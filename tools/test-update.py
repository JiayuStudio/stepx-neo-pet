#!/usr/bin/env python3
"""编译并运行 UpdatePolicyTest（JDK 直接跑，不依赖 Android / org.json）。

UpdatePolicy.java 是不 import 任何 Android 类的纯逻辑模块；evaluatePayload 的
JSON 决策层与 web/src/game/updatePolicy.ts 同规则，由 tools/test-update.mjs 覆盖。
"""
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]


def java_home() -> Path:
    import json
    import os
    import shutil

    configured = os.environ.get("JAVA_HOME")
    if configured and (Path(configured) / "bin" / "javac").is_file():
        return Path(configured)
    environment = root.parent / ".toolchains" / "environment.json"
    if environment.is_file():
        try:
            candidate = json.loads(environment.read_text()).get("JAVA_HOME")
            if candidate and (Path(candidate) / "bin" / "javac").is_file():
                return Path(candidate)
        except Exception:
            pass
    compiler = shutil.which("javac")
    if compiler:
        return Path(compiler).resolve().parent.parent
    raise SystemExit("Install JDK 17+ (or run npm run setup:native); JAVA_HOME not found")


def main() -> int:
    home = java_home()
    javac = home / "bin" / "javac"
    java = home / "bin" / "java"
    policy = root / "app" / "src" / "com" / "diandian" / "neopet" / "UpdatePolicy.java"
    test = root / "tools" / "UpdatePolicyTest.java"
    with tempfile.TemporaryDirectory() as tmp:
        build = subprocess.run(
            [str(javac), "-d", tmp, str(policy), str(test)],
            capture_output=True,
            text=True,
        )
        if build.returncode != 0:
            print(build.stdout)
            print(build.stderr, file=sys.stderr)
            return 1
        run = subprocess.run(
            [str(java), "-cp", tmp, "com.diandian.neopet.UpdatePolicyTest"],
            capture_output=True,
            text=True,
        )
        print(run.stdout.strip())
        if run.returncode != 0:
            print(run.stderr, file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
