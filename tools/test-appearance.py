"""0.3.6 原生外观键与帧包一致性检查。

- 编译运行 MoriAppearanceTest：成长 / 性格 / 饰品规则 + 12 场景边界。
- 生成真实 catalog 键：8 角色 × 12 场景 × 3 阶段 × 3 性格 × 4 饰品（普通键 + 耳机键）。
- 普通键必须直接存在于 pet-frames.json。
- 耳机键按原生 PetArt 的规则解析：同一外观 base + 该角色/场景的绝对覆盖对；
  断言叠加确实发生在对应外观上（不会退回默认幼苗外观）。
"""
from pathlib import Path
import subprocess
import json

from toolchain import ROOT, java_home

out = ROOT / 'build/appearance-tests'
out.mkdir(parents=True, exist_ok=True)
java = java_home() / 'bin'
subprocess.run(
    [str(java / 'javac'), '-encoding', 'UTF-8', '-d', str(out),
     str(ROOT / 'app/src/com/diandian/neopet/MoriAppearance.java'),
     str(ROOT / 'tests/MoriAppearanceTest.java')],
    check=True,
)
lines = subprocess.check_output([str(java / 'java'), '-cp', str(out), 'MoriAppearanceTest'], text=True).splitlines()
checks = lines[0]
keys = lines[1:]
assert checks.startswith('checks='), checks

frames = json.loads((ROOT / 'app/assets/pet-frames.json').read_text())
plain = keys[0::2]
headphones = keys[1::2]
assert len(plain) == 3456 and len(headphones) == 3456, (len(plain), len(headphones))
assert len(set(plain)) == 3456 and len(set(headphones)) == 3456

# 1) 普通键必须直接存在于帧包
missing = [k for k in plain if k not in frames]
assert not missing, f'{len(missing)} catalog keys missing, e.g. {missing[:3]}'


def apply_pairs(frame, pairs):
    result = list(frame)
    for i in range(0, len(pairs), 2):
        result[pairs[i]] = pairs[i + 1]
    return result


def resolve(key, index, depth=0):
    assert depth <= 4, f'resolve loop: {key}'
    if key.startswith('hp/'):
        parts = key.split('/')
        overlay = frames.get(f'hp/{parts[1]}/{parts[2]}')
        assert overlay and 'overlay' in overlay, f'missing headphone overlay for {key}'
        return apply_pairs(resolve(key[3:], index, depth + 1), overlay['overlay'][index])
    entry = frames.get(key)
    assert entry, f'missing entry: {key}'
    if 'frames' in entry:
        return entry['frames'][index]
    base = resolve(entry['base'], index, depth + 1)
    if 'delta' in entry:
        return apply_pairs(base, entry['delta'])
    return apply_pairs(base, entry['deltaFrames'][index])


# 2) 耳机键：base 必须是同名外观，叠加只发生在该角色/场景的耳机像素上
checked = 0
for hp_key in headphones:
    parts = hp_key.split('/')
    character, scene = parts[1], parts[2]
    base_key = hp_key[3:]
    overlay = frames[f'hp/{character}/{scene}']['overlay']
    for index in range(8):
        base = resolve(base_key, index)
        hp = resolve(hp_key, index)
        diff = {p for p in range(391) if base[p] != hp[p]}
        allowed = {overlay[index][i] for i in range(0, len(overlay[index]), 2)}
        assert diff <= allowed, f'{hp_key} frame {index}: pixels changed outside headphone overlay'
        assert len(diff) >= 1, f'{hp_key} frame {index}: headphone overlay had no effect'
        checked += 1

# 3) 非默认外观的耳机帧必须与同角色/场景的默认外观耳机帧不同（证明没有退回幼苗外观）
mismatch = 0
for hp_key in headphones:
    if hp_key.endswith('/seedling/gentle/none'):
        continue
    parts = hp_key.split('/')
    fallback_key = f'hp/{parts[1]}/{parts[2]}/seedling/gentle/none'
    for index in (0, 4):
        if resolve(hp_key, index) == resolve(fallback_key, index):
            mismatch += 1
            break
assert mismatch == 0, f'{mismatch} headphone variants collapsed onto the default seedling appearance'

report = {
    'native_fixtures': int(checks.split('=')[1]),
    'catalog_plain_keys': len(plain),
    'catalog_headphone_keys': len(headphones),
    'headphone_frames_checked': checked,
    'collapsed_to_default': mismatch,
}
(ROOT / 'evidence').mkdir(exist_ok=True)
(ROOT / 'evidence/appearance-tests.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
