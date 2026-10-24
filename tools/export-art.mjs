import {
  SCENES, STAGES, PERSONALITIES, WEARABLES, CHARACTERS, FPS, FRAME_COUNT,
  artKey, renderMori, isEggScene, PET_BY_ID,
} from '../studio-art/mori.ts';
import { writeFileSync } from 'node:fs';

const all = {};
const eggScenes = SCENES.filter(isEggScene);
const bodyScenes = SCENES.filter((scene) => !isEggScene(scene));
const framesOf = (character, scene, stage, personality, wearable, hp) =>
  Array.from({ length: FRAME_COUNT }, (_, i) => renderMori(character, scene, i, stage, personality, wearable, hp));

/** 与基准帧的差异对（同帧位置 + 值） */
const diffPairs = (base, frame) => {
  const pairs = [];
  for (let p = 0; p < frame.length; p += 1) if (frame[p] !== base[p]) pairs.push(p, frame[p]);
  return pairs;
};

// ---- 蛋阶段：每角色一套（与养成维度无关）----
for (const character of CHARACTERS) {
  for (const scene of eggScenes) {
    all[artKey(character, scene, 'seedling', 'gentle', 'none', false)] = {
      fps: FPS[scene],
      frames: Array.from({ length: FRAME_COUNT }, (_, i) => renderMori(character, scene, i, 'seedling', 'gentle', 'none', false)),
    };
  }
}

// ---- 养成本体：基准组合存完整帧，其余组合存 delta（控制体积）----
for (const character of CHARACTERS) {
  for (const scene of bodyScenes) {
    const baseFrames = framesOf(character, scene, 'seedling', 'gentle', 'none', false);
    const baseKey = artKey(character, scene, 'seedling', 'gentle', 'none', false);
    all[baseKey] = { fps: FPS[scene], frames: baseFrames };

    for (const stage of STAGES) for (const personality of PERSONALITIES) for (const wearable of WEARABLES) {
      if (stage === 'seedling' && personality === 'gentle' && wearable === 'none') continue;
      const key = artKey(character, scene, stage, personality, wearable, false);
      const frames = framesOf(character, scene, stage, personality, wearable, false);
      const perFrame = frames.map((frame, i) => diffPairs(baseFrames[i], frame));
      // 阶段 / 性格 / 饰品是每帧固定的少量像素：八帧相同时只存一份
      const identical = perFrame.every((pairs) => pairs.join(',') === perFrame[0].join(','));
      all[key] = identical
        ? { fps: FPS[scene], base: baseKey, delta: perFrame[0] }
        : { fps: FPS[scene], base: baseKey, deltaFrames: perFrame };
    }

  }
  // ---- 耳机：每个角色/场景一条「绝对覆盖对」。
  // 耳机像素的位置与值只取决于角色/场景/帧（与阶段/性格/饰品无关，且耳机最后绘制覆盖写），
  // 因此同一 (角色, 场景, 帧) 对所有外观组合复用同一份 overlay；
  // 每个外观用自己的 base 帧 + 这份 overlay，绝不退回默认幼苗外观。
  for (const scene of bodyScenes) {
    const baseFrames = framesOf(character, scene, 'seedling', 'gentle', 'none', false);
    const hpFrames = framesOf(character, scene, 'seedling', 'gentle', 'none', true);
    all[`hp/${character}/${scene}`] = {
      fps: FPS[scene],
      overlay: hpFrames.map((frame, i) => diffPairs(baseFrames[i], frame)),
    };
  }
}

// PetArt 的兜底键：星跃幼苗 idle
all.idle = all[artKey('star', 'idle', 'seedling', 'gentle', 'none', false)];

/** 应用 delta 得到最终帧（与 Java PetArt 同语义，用于导出前自检） */
const applyPairs = (frame, pairs) => {
  const out = frame.slice();
  for (let i = 0; i + 1 < pairs.length; i += 2) out[pairs[i]] = pairs[i + 1];
  return out;
};
const resolve = (key, index, depth = 0) => {
  if (depth > 4) throw Error(`resolve loop: ${key}`);
  // hp/<角色>/<场景>/<阶段>/<性格>/<饰品>：
  // 基础帧取**同一外观**的普通键，overlay 取该角色/场景的绝对覆盖对
  if (key.startsWith('hp/')) {
    const parts = key.split('/');
    const overlay = all[`hp/${parts[1]}/${parts[2]}`];
    if (!overlay) throw Error(`missing headphone overlay: ${key}`);
    const base = resolve(key.slice(3), index, depth + 1);
    return applyPairs(base, overlay.overlay[index]);
  }
  const def = all[key];
  if (!def) throw Error(`missing entry: ${key}`);
  if (def.frames) return def.frames[index];
  if (def.overlay) throw Error(`overlay entry must be addressed as hp/<character>/<scene>: ${key}`);
  const base = resolve(def.base, index, depth + 1);
  if (def.delta) return applyPairs(base, def.delta);
  if (def.deltaFrames) return applyPairs(base, def.deltaFrames[index]);
  throw Error(`entry without frames/delta/overlay: ${key}`);
};

// ---- 校验 ----
const valid = (frame) => frame.length === 391 && frame.every((v) => Number.isInteger(v) && v >= 0 && v <= 255);
for (const [key, def] of Object.entries(all)) {
  if (key === 'idle') continue;
  if (def.frames) {
    if (!def.frames.every(valid)) throw Error(`${key}: invalid frame data`);
  } else if (key === 'idle') {
    continue;
  } else if (def.overlay) {
    if (!def.overlay.length) throw Error(`${key}: empty overlay`);
    for (const pairs of def.overlay) for (let i = 0; i + 1 < pairs.length; i += 2) {
      if (pairs[i] < 0 || pairs[i] >= 391 || pairs[i + 1] < 0 || pairs[i + 1] > 255) throw Error(`${key}: overlay out of range`);
    }
  } else if (def.delta || def.deltaFrames) {
    const groups = def.delta ? [def.delta] : def.deltaFrames;
    for (const pairs of groups) for (let i = 0; i + 1 < pairs.length; i += 2) {
      if (pairs[i] < 0 || pairs[i] >= 391 || pairs[i + 1] < 0 || pairs[i + 1] > 255) throw Error(`${key}: delta out of range`);
    }
  } else throw Error(`${key}: entry without frames/delta/overlay`);
}

// 每个角色每个场景：≥4 个有效不同帧，且不是整图平移（头部/腿/附加像素有局部变化）
for (const character of CHARACTERS) {
  for (const scene of SCENES) {
    const key = isEggScene(scene)
      ? artKey(character, scene, 'seedling', 'gentle', 'none', false)
      : artKey(character, scene, 'seedling', 'gentle', 'none', false);
    const frames = Array.from({ length: FRAME_COUNT }, (_, i) => resolve(key, i));
    const distinct = new Set(frames.map((f) => f.join(','))).size;
    if (distinct < 4) throw Error(`${character}/${scene}: only ${distinct} distinct frames (need 4+)`);
    if (frames.some((f) => !valid(f))) throw Error(`${character}/${scene}: invalid frame`);
  }
}

// 8 个角色轮廓必须彼此不同（同场景整段动画不能撞图）
for (const scene of bodyScenes) {
  const seen = new Map();
  for (const character of CHARACTERS) {
    const sig = Array.from({ length: FRAME_COUNT }, (_, i) =>
      resolve(artKey(character, scene, 'seedling', 'gentle', 'none', false), i).join(','),
    ).join('|');
    if (seen.has(sig)) throw Error(`${scene}: ${character} and ${seen.get(sig)} share the same animation`);
    seen.set(sig, character);
  }
}

// 角色本体不越界 / 不被裁切：行栅格必须 17 列、15 行，且 top+15 ≤ 23
for (const pet of Object.values(PET_BY_ID)) {
  for (const [label, rows] of [['rows', pet.rows], ['deadRows', pet.deadRows]]) {
    if (rows.length !== 15) throw Error(`${pet.id}.${label}: expected 15 rows, got ${rows.length}`);
    for (const row of rows) if (row.length !== 17) throw Error(`${pet.id}.${label}: row width ${row.length} != 17`);
    if (pet.top + rows.length > 23) throw Error(`${pet.id}: sprite would be clipped`);
  }
}

// 耳机：非空、随身体动、含黑橙像素
for (const character of CHARACTERS) for (const scene of bodyScenes) {
  const key = `hp/${character}/${scene}`;
  const overlay = all[key].overlay;
  if (overlay.length !== FRAME_COUNT) throw Error(`${character}/${scene}: headphone overlay frame count`);
  if (overlay.some((pairs) => pairs.length === 0)) throw Error(`${character}/${scene}: empty headphone overlay`);
  // 死亡姿态身体静止，不要求耳机随动；其余场景必须至少两种耳机位置
  if (scene !== 'dead' && new Set(overlay.map((pairs) => pairs.join(','))).size < 2) throw Error(`${character}/${scene}: headphones do not move with body`);
  if (!overlay.some((pairs) => pairs.some((v, i) => i % 2 === 1 && (v === 26 || v === 242)))) throw Error(`${character}/${scene}: headphone pixels missing`);
}

// 饰品可见：每种饰品相对 none 至少 1 像素差
for (const character of CHARACTERS) {
  const base = all[artKey(character, 'idle', 'seedling', 'gentle', 'none', false)].frames[0];
  for (const wearable of WEARABLES.slice(1)) {
    const frame = resolve(artKey(character, 'idle', 'seedling', 'gentle', wearable, false), 0);
    if (!frame.some((v, i) => v !== base[i])) throw Error(`${character}/${wearable}: wearable invisible`);
  }
}

// 全量逐像素自检：JSON 解析结果必须与 renderMori 完全一致（含全部外观与耳机）
let compared = 0;
for (const character of CHARACTERS) for (const scene of SCENES) {
  const combos = isEggScene(scene)
    ? [['seedling', 'gentle', 'none', false]]
    : STAGES.flatMap((stage) => PERSONALITIES.flatMap((personality) => WEARABLES.flatMap((wearable) => [
        [stage, personality, wearable, false], [stage, personality, wearable, true],
      ])));
  for (const [stage, personality, wearable, hp] of combos) {
    const key = artKey(character, scene, stage, personality, wearable, hp);
    for (let i = 0; i < FRAME_COUNT; i += 1) {
      const expected = renderMori(character, scene, i, stage, personality, wearable, hp);
      const actual = resolve(key, i);
      for (let p = 0; p < expected.length; p += 1) {
        if (expected[p] !== actual[p]) {
          throw Error(`${key} frame ${i}: pixel ${p} differs (render ${expected[p]} vs packaged ${actual[p]})`);
        }
      }
      compared += 1;
    }
  }
}

writeFileSync(new URL('../app/assets/pet-frames.json', import.meta.url), JSON.stringify(all));
const kb = (JSON.stringify(all).length / 1024).toFixed(0);
console.log(`${Object.keys(all).length - 1} appearance entries (${CHARACTERS.length} characters × ${SCENES.length} scenes) + fallback exported; ${kb} KB; ${compared} frames verified pixel-identical to renderMori`);
