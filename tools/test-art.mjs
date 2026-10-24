import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PETS } from '../studio-art/pets.ts';
import { renderMori } from '../studio-art/mori.ts';

const CHARACTERS = PETS.map((pet) => pet.id);

const all = JSON.parse(readFileSync(process.argv[2] || new URL('../app/assets/pet-frames.json', import.meta.url)));
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };

const SCENES = ['idle','walk','eat','play','wash','sleep','pet','happy','hungry','unhappy','sick','dead'];
const EGG = ['egg','crack','hatch'];
const STAGES = ['seedling','bloom','luminary'];
const PERSONALITIES = ['gentle','playful','curious'];
const WEARABLES = ['none','star-ribbon','sprout-crown','moon-charm'];
const W = 17, H = 23, N = W * H;

/** 与 Java PetArt / 导出脚本同语义的解码：完整帧 → 叠加 delta → 叠加耳机 overlay */
const applyPairs = (frame, pairs) => {
  const out = frame.slice();
  for (let i = 0; i + 1 < pairs.length; i += 2) out[pairs[i]] = pairs[i + 1];
  return out;
};
const resolve = (key, index, depth = 0) => {
  assert.ok(depth <= 4, `resolve loop: ${key}`);
  // hp/<角色>/<场景>/<阶段>/<性格>/<饰品>：同一外观的 base + 该角色/场景的绝对覆盖对
  if (key.startsWith('hp/')) {
    const parts = key.split('/');
    const overlay = all[`hp/${parts[1]}/${parts[2]}`];
    assert.ok(overlay && overlay.overlay, `missing headphone overlay for ${key}`);
    return applyPairs(resolve(key.slice(3), index, depth + 1), overlay.overlay[index]);
  }
  const def = all[key];
  if (!def) throw new Error(`missing entry: ${key}`);
  if (def.frames) return def.frames[index];
  if (def.overlay) throw new Error(`overlay entry must be addressed as hp/<character>/<scene>: ${key}`);
  const base = resolve(def.base, index, depth + 1);
  if (def.delta) return applyPairs(base, def.delta);
  if (def.deltaFrames) return applyPairs(base, def.deltaFrames[index]);
  throw new Error(`entry without frames/delta/overlay: ${key}`);
};
const key = (c, s, stage = 'seedling', p = 'gentle', w = 'none', hp = false) =>
  EGG.includes(s) ? `${s}/${c}` : `${hp ? 'hp/' : ''}${c}/${s}/${stage}/${p}/${w}`;
const framesFor = (c, s, stage, p, w, hp = false) =>
  Array.from({ length: 8 }, (_, i) => resolve(key(c, s, stage, p, w, hp), i));
const bbox = (frame) => {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  frame.forEach((v, i) => {
    if (v <= 0) return;
    const x = i % W, y = Math.floor(i / W);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  });
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0, x1, y1 };
};

/* ---- 1. 每角色 × 每场景：条目 / 帧数 / 帧合法 / ≥4 不同帧 ---- */
for (const character of CHARACTERS) {
  for (const scene of SCENES) {
    const def = all[key(character, scene)];
    check(!!def, `${character}/${scene}: packaged`);
    check(Number.isFinite(def.fps) && def.fps > 0 && def.fps <= 5, `${character}/${scene}: bounded fps`);
    const frames = framesFor(character, scene);
    eq(frames.length, 8, `${character}/${scene}: 8 frames`);
    for (const frame of frames) {
      eq(frame.length, N, `${character}/${scene}: 391 cells`);
      check(frame.every((v) => Number.isInteger(v) && v >= 0 && v <= 255), `${character}/${scene}: 0..255 integers`);
    }
    const distinct = new Set(frames.map((f) => f.join(','))).size;
    check(distinct >= 4, `${character}/${scene}: at least 4 distinct frames (${distinct})`);
    // 不是整图平移：头部/腿部/附加像素需要有局部差异（比较两次相邻帧的 bbox 或局部差异数）
    const diffs = frames.slice(1).map((f, i) => f.reduce((n, v, p) => n + (v !== frames[i][p] ? 1 : 0), 0));
    check(Math.max(...diffs) >= 2, `${character}/${scene}: frames change locally, not just the whole sprite`);
  }
}

/* ---- 2. 8 角色轮廓彼此不同（每场景整段动画签名不同）---- */
for (const scene of SCENES) {
  const seen = new Map();
  for (const character of CHARACTERS) {
    const sig = framesFor(character, scene).map((f) => f.join(',')).join('|');
    check(!seen.has(sig), `${scene}: ${character} silhouette differs from ${seen.get(sig)}`);
    seen.set(sig, character);
  }
}

/* ---- 3. 角色本体尺寸：15 行 × 17 列，放在画布内不裁切；同角色站姿/躺姿都完整 ---- */
for (const pet of PETS) {
  for (const [label, rows] of [['rows', pet.rows], ['deadRows', pet.deadRows]]) {
    eq(rows.length, 15, `${pet.id}.${label}: 15 rows`);
    check(rows.every((row) => row.length === 17), `${pet.id}.${label}: every row is 17 wide`);
    check(pet.top + rows.length <= H, `${pet.id}.${label}: not clipped at the bottom`);
    const lit = rows.join('').replace(/[^A-Za-z]/g, '').length;
    check(lit > 20, `${pet.id}.${label}: has a readable silhouette (${lit} cells)`);
  }
}

/* ---- 4. 每只都有可辨认的眼睛（白竖眼或暗方眼），且每帧不丢失 ---- */
for (const pet of PETS) {
  for (const scene of ['idle', 'walk', 'eat', 'play', 'wash', 'sleep', 'pet', 'happy', 'hungry', 'unhappy', 'sick']) {
    for (const [i, frame] of framesFor(pet.id, scene).entries()) {
      // 眼区：角色眼睛行附近，存在 255 或 0 的强对比像素
      const eyeY = pet.top + pet.eyeRow;
      let contrast = false;
      for (let y = eyeY; y <= eyeY + 2 && !contrast; y += 1) {
        for (let x = 3; x <= 13; x += 1) {
          const v = frame[y * W + x];
          if (v === 255 || v === 0) { contrast = true; break; }
        }
      }
      check(contrast, `${pet.id}/${scene} frame ${i}: eyes remain readable`);
    }
  }
}

/* ---- 5. 状态特征：饥饿捂肚 / 不开心泪滴 / 生病发抖 / 死亡横躺+X眼+灵魂 ---- */
for (const pet of PETS) {
  const hungry = framesFor(pet.id, 'hungry');
  // 捂肚：肚子区域存在角色暗色（=tone.dark）像素
  check(hungry.some((f) => f.some((v) => v === pet.tone.dark)), `${pet.id}: hungry shows hands on belly`);
  // 食物提示：右侧/左侧出现高亮像素
  check(hungry.some((f) => f.some((v, i) => v >= 190 && (i % W === 14 || i % W === 15))), `${pet.id}: hungry shows food cue`);

  const unhappy = framesFor(pet.id, 'unhappy');
  check(unhappy.some((f) => f.some((v, i) => v >= 160 && v < 255 && (i % W === 6 || i % W === 10))), `${pet.id}: unhappy shows tears`);
  // 头部区域位置/像素变化（垂头轻晃），不是只换表情
  const headCells = (pet.top + pet.eyeRow + 3) * W;
  check(new Set(unhappy.map((f) => f.slice(0, headCells).join(','))).size >= 2, `${pet.id}: unhappy shifts posture`);

  const sick = framesFor(pet.id, 'sick');
  check(new Set(sick.map((f) => f.join(','))).size >= 4, `${pet.id}: sick shivers across frames`);
  check(sick.some((f) => f.some((v, i) => v >= 235 && Math.floor(i / W) <= pet.top + pet.eyeRow)), `${pet.id}: sick shows temperature cue`);

  const dead = framesFor(pet.id, 'dead');
  // 只看主体（排除上方消散的灵魂星点）：横躺主体必须落在画面下半部
  const bodyOnly = dead[0].map((v, i) => (Math.floor(i / W) >= pet.top + 6 ? v : 0));
  const deadBox = bbox(bodyOnly);
  check(deadBox.y0 >= pet.top + 6, `${pet.id}: dead sprite lies down (low on screen)`);
  check(dead.some((f) => f.some((v) => v === 0)), `${pet.id}: dead shows closed/X features`);
  check(dead.some((f) => f.some((v, i) => v >= 240 && Math.floor(i / W) < 8)), `${pet.id}: dead shows drifting spirit sparkles`);
}

/* ---- 6. 耳机：非空、含黑橙、随身体动（死亡态身体静止除外）---- */
for (const character of CHARACTERS) {
  for (const scene of SCENES) {
    const hpKey = `hp/${character}/${scene}`;
    const overlay = all[hpKey].overlay;
    eq(overlay.length, 8, `${hpKey}: overlay frame count`);
    check(overlay.every((pairs) => pairs.length >= 2), `${hpKey}: non-empty overlay`);
    check(overlay.every((pairs) => {
      for (let i = 0; i + 1 < pairs.length; i += 2) if (pairs[i] < 0 || pairs[i] >= N || pairs[i + 1] < 0 || pairs[i + 1] > 255) return false;
      return true;
    }), `${hpKey}: overlay in range`);
    check(overlay.some((pairs) => pairs.some((v, i) => i % 2 === 1 && (v === 26 || v === 242))), `${hpKey}: headphone pixels present`);
    if (scene !== 'dead') {
      check(new Set(overlay.map((p) => p.join(','))).size >= 2, `${hpKey}: headphones follow body motion`);
    }
  }
}

/* ---- 7. 阶段 / 性格 / 饰品变体可解码且有可见差异 ---- */
for (const character of CHARACTERS) {
  const base = framesFor(character, 'idle');
  for (const stage of STAGES.slice(1)) {
    const frames = framesFor(character, 'idle', stage);
    check(frames.some((f, i) => f.some((v, p) => v !== base[i][p])), `${character}/${stage}: growth mark visible`);
  }
  for (const personality of PERSONALITIES.slice(1)) {
    const frames = framesFor(character, 'idle', 'seedling', personality);
    check(frames.some((f, i) => f.some((v, p) => v !== base[i][p])), `${character}/${personality}: personality mark visible`);
  }
  for (const wearable of WEARABLES.slice(1)) {
    const frames = framesFor(character, 'idle', 'seedling', 'gentle', wearable);
    check(frames.some((f, i) => f.some((v, p) => v !== base[i][p])), `${character}/${wearable}: wearable visible`);
  }
  // 耳机 + 饰品 + 阶段叠加仍可解码
  const combo = framesFor(character, 'happy', 'luminary', 'curious', 'moon-charm', true);
  for (const frame of combo) eq(frame.length, N, `${character}: combined variant decodes to 391 cells`);
}

/* ---- 8. 蛋阶段：8 角色 × 3 场景，动画与角色差异 ---- */
for (const character of CHARACTERS) {
  for (const scene of EGG) {
    const def = all[`${scene}/${character}`];
    check(!!def, `${scene}/${character}: packaged`);
    const frames = def.frames;
    eq(frames.length, 8, `${scene}/${character}: 8 frames`);
    for (const frame of frames) check(frame.length === N && frame.every((v) => Number.isInteger(v) && v >= 0 && v <= 255), `${scene}/${character}: valid matrix`);
    check(new Set(frames.map((f) => f.join(','))).size >= 4, `${scene}/${character}: egg animation has 4+ distinct frames`);
  }
}
{
  const cracked = all['crack/star'].frames[7].filter((v) => v === 0).length;
  check(cracked > 0, 'crack frames contain crack pixels');
  const hatch = all['hatch/star'].frames[5];
  check(hatch.filter((v) => v > 0).length > 0, 'hatch frame shows shell and baby');
  const a = all['egg/star'].frames[0].join(',');
  const b = all['egg/block'].frames[0].join(',');
  check(a !== b, 'egg shells differ per character tone');
}

/* ---- 9. 体积控制：不是“8 角色 × 全部组合”的完整帧复制 ---- */
{
  const fullFrames = Object.values(all).filter((d) => d.frames).length;
  const deltas = Object.values(all).filter((d) => d.delta || d.deltaFrames).length;
  const overlays = Object.values(all).filter((d) => d.overlay).length;
  check(fullFrames <= CHARACTERS.length * (SCENES.length + EGG.length + 1), `full-frame entries stay bounded (${fullFrames})`);
  check(deltas > fullFrames, `stage/personality/wearable variants are stored as deltas (${deltas})`);
  check(overlays === CHARACTERS.length * SCENES.length, `one headphone overlay per character/scene (${overlays})`);
  check(JSON.stringify(all).length < 4_500_000, 'packaged frame data under 4.5 MB');
}

/* ---- 10. 全量逐像素一致：打包解析结果 == 前台 renderMori ----
 * 覆盖 8 角色 × 15 场景 × 全部外观组合 × 耳机（共 55,488 帧），
 * 确保耳机组合不会退回默认幼苗外观，也不存在任何帧级漂移。 */
{
  let framesCompared = 0;
  for (const character of CHARACTERS) {
    for (const scene of [...SCENES, ...EGG]) {
      const combos = EGG.includes(scene)
        ? [['seedling', 'gentle', 'none', false]]
        : STAGES.flatMap((stage) => PERSONALITIES.flatMap((personality) => WEARABLES.flatMap((wearable) => [
            [stage, personality, wearable, false],
            [stage, personality, wearable, true],
          ])));
      for (const [stage, personality, wearable, hp] of combos) {
        const k = key(character, scene, stage, personality, wearable, hp);
        for (let i = 0; i < 8; i += 1) {
          const expected = renderMori(character, scene, i, stage, personality, wearable, hp);
          const actual = resolve(k, i);
          for (let p = 0; p < N; p += 1) {
            if (expected[p] !== actual[p]) {
              throw new Error(`${k} frame ${i}: pixel ${p} differs (render ${expected[p]} vs packaged ${actual[p]})`);
            }
          }
          framesCompared += 1;
        }
      }
    }
  }
  eq(framesCompared, 55488, 'every renderMori frame matches the packaged data');
  check(true, `all ${framesCompared} frames are pixel-identical`);
}

/* ---- 10. 兜底键 ---- */
eq(JSON.stringify(all.idle), JSON.stringify(all['star/idle/seedling/gentle/none']), 'fallback matches star seedling idle');

console.log(`${checks} packaged 0.3.6 eight-character × fifteen-scene checks passed`);
