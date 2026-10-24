#!/usr/bin/env python3
"""0.3.6 前台 Java 场景一致性 + 原生帧键覆盖测试。

1) 编译运行 ScenePolicyTest（MoriAppearance.scene 与 web matrixScene 同规则）。
2) 按 MoriMatrix.artKey 的键规则遍历 8 角色 × 12 场景 × 3 阶段 × 3 性格 × 4 饰品
   （含耳机 hp/ 前缀），验证 pet-frames.json 都能解析到完整 8 帧——即原生 PetArt
   一定能取到帧，不会静默回退到 idle。
"""
from pathlib import Path
import json
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]


def java_home() -> Path:
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


def run_java_policy() -> int:
    home = java_home()
    appearance = root / "app" / "src" / "com" / "diandian" / "neopet" / "MoriAppearance.java"
    test = root / "tools" / "ScenePolicyTest.java"
    with tempfile.TemporaryDirectory() as tmp:
        build = subprocess.run([str(home / "bin" / "javac"), "-d", tmp, str(appearance), str(test)], capture_output=True, text=True)
        if build.returncode != 0:
            print(build.stdout)
            print(build.stderr, file=sys.stderr)
            return 1
        run = subprocess.run([str(home / "bin" / "java"), "-cp", tmp, "com.diandian.neopet.ScenePolicyTest"], capture_output=True, text=True)
        print(run.stdout.strip())
        if run.returncode != 0:
            print(run.stderr, file=sys.stderr)
            return 1
    return 0


def check_frame_keys() -> int:
    data = json.loads((root / "app" / "assets" / "pet-frames.json").read_text())
    characters = ["star", "block", "sprout", "bunny", "fox", "otter", "owl", "drake"]
    scenes = ["idle", "walk", "eat", "play", "wash", "sleep", "pet", "happy",
              "hungry", "unhappy", "sick", "dead"]
    stages = ["seedling", "bloom", "luminary"]
    personalities = ["gentle", "playful", "curious"]
    wearables = ["none", "star-ribbon", "sprout-crown", "moon-charm"]
    W = 17
    checks = 0

    def apply(frame, pairs):
        out = list(frame)
        for i in range(0, len(pairs), 2):
            out[pairs[i]] = pairs[i + 1]
        return out

    def resolve(key, index, depth=0):
        if depth > 4:
            raise AssertionError(f"resolve loop: {key}")
        if key.startswith("hp/"):
            parts = key.split("/")
            overlay = data.get(f"hp/{parts[1]}/{parts[2]}")
            if overlay is None or "overlay" not in overlay:
                raise AssertionError(f"missing headphone overlay: {key}")
            base = resolve(key[3:], index, depth + 1)
            return apply(base, overlay["overlay"][index])
        entry = data.get(key)
        if entry is None:
            raise AssertionError(f"missing entry (native PetArt would fall back to idle): {key}")
        if "frames" in entry:
            return entry["frames"][index]
        if "overlay" in entry:
            raise AssertionError(f"overlay entries are addressed by hp/<character>/<scene>: {key}")
        base = resolve(entry["base"], index, depth + 1)
        if "delta" in entry:
            return apply(base, entry["delta"])
        if "deltaFrames" in entry:
            return apply(base, entry["deltaFrames"][index])
        raise AssertionError(f"entry without frames/delta/overlay: {key}")

    for character in characters:
        for scene in scenes:
            for stage in stages:
                for personality in personalities:
                    for wearable in wearables:
                        for headphones in (False, True):
                            key = (("hp/" if headphones else "") + character + "/" + scene + "/" +
                                   stage + "/" + personality + "/" + wearable)
                            for index in range(8):
                                frame = resolve(key, index)
                                assert len(frame) == W * 23, f"{key}: wrong frame size"
                                assert all(isinstance(v, int) and 0 <= v <= 255 for v in frame), f"{key}: out of range"
                            checks += 1
    print(f"{checks} native art keys resolve to full frames with the correct appearance base (8 characters × 12 scenes × 36 variants × headphones)")
    return 0


if __name__ == "__main__":
    code = run_java_policy()
    if code == 0:
        code = check_frame_keys()
    raise SystemExit(code)
