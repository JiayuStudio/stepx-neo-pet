/* 生成 8 宠物 × 15 场景的动画图集预览页（artifacts/pet-atlas.html，自包含、可离线打开）。
 * 数据与 APK 内 pet-frames.json 同源；只内嵌 seedling/gentle/none 与蛋场景，控制体积。 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PETS, SCENE_LABELS } from '../studio-art/mori.ts';

const all = JSON.parse(readFileSync(new URL('../app/assets/pet-frames.json', import.meta.url)));
const W = 17, H = 23, FRAMES = 8;

const apply = (frame, pairs) => {
  const out = frame.slice();
  for (let i = 0; i + 1 < pairs.length; i += 2) out[pairs[i]] = pairs[i + 1];
  return out;
};
const resolve = (key, index, depth = 0) => {
  if (depth > 4) throw Error(`resolve loop: ${key}`);
  const def = all[key];
  if (!def) {
    if (key.startsWith('hp/')) {
      const p = key.split('/');
      const fallback = ['hp', p[1], p[2], 'seedling', 'gentle', 'none'].join('/');
      if (all[fallback]) return resolve(fallback, index, depth + 1);
    }
    throw Error(`missing entry: ${key}`);
  }
  if (def.frames) return def.frames[index];
  if (def.overlay) return apply(resolve(key.replace(/^hp\//, ''), index, depth + 1), def.overlay[index]);
  const base = resolve(def.base, index, depth + 1);
  if (def.delta) return apply(base, def.delta);
  if (def.deltaFrames) return apply(base, def.deltaFrames[index]);
  throw Error(`entry without frames/delta/overlay: ${key}`);
};

const scenes = ['idle', 'walk', 'eat', 'play', 'wash', 'sleep', 'pet', 'happy', 'hungry', 'unhappy', 'sick', 'dead', 'egg', 'crack', 'hatch'];
const eggSet = new Set(['egg', 'crack', 'hatch']);
const atlas = {};
for (const pet of PETS) {
  atlas[pet.id] = { name: pet.name, tagline: pet.tagline, fps: {}, frames: {} };
  for (const scene of scenes) {
    const key = eggSet.has(scene) ? `${scene}/${pet.id}` : `${pet.id}/${scene}/seedling/gentle/none`;
    atlas[pet.id].fps[scene] = all[key].fps;
    atlas[pet.id].frames[scene] = Array.from({ length: FRAMES }, (_, i) => resolve(key, i));
  }
}

const labels = JSON.stringify(SCENE_LABELS);
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>拓麻歌子 0.3.6 · 8 宠物动画图集</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 20px; background: #0b0c0e; color: #e8e4da; font: 13px/1.5 system-ui, "Noto Sans CJK SC", sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.lead { margin: 0 0 18px; opacity: .7; }
  table { border-collapse: collapse; }
  th, td { padding: 6px; text-align: center; vertical-align: middle; }
  thead th { font-size: 11px; font-weight: 600; opacity: .75; position: sticky; top: 0; background: #0b0c0e; }
  tbody th { text-align: right; font-size: 12px; white-space: nowrap; }
  tbody th small { display: block; font-weight: 400; opacity: .55; }
  canvas { display: block; image-rendering: pixelated; background: #06070a; border-radius: 6px; border: 1px solid #23262e; }
  td span { display: block; font-size: 10px; opacity: .5; margin-top: 3px; }
  .legend { margin-top: 18px; font-size: 12px; opacity: .65; }
</style></head>
<body>
<h1>拓麻歌子 0.3.6 · 8 宠物 × 15 场景</h1>
<p class="lead">与 APK 内 <code>pet-frames.json</code> 同源（seedling / gentle / none 基准组合）。每格循环播放 8 帧，单格放大 6 倍。</p>
<table><thead><tr><th></th>${scenes.map((s) => `<th>${JSON.parse(labels)[s]}</th>`).join('')}</tr></thead>
<tbody id="rows"></tbody></table>
<p class="legend">原创角色：星跃、方跃、芽灵、绒兔、焰狐、泡獭、眠鸮、角龙。仅参考 17×23 灰度点阵密度，不复制任何既有角色形象。</p>
<script>
const ATLAS = ${JSON.stringify(atlas)};
const SCENES = ${JSON.stringify(scenes)};
const LABELS = ${labels};
const W = 17, H = 23, CELL = 6;
const rows = document.getElementById('rows');
const cells = [];
for (const [id, pet] of Object.entries(ATLAS)) {
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.innerHTML = pet.name + '<small>' + pet.tagline + '</small>';
  tr.appendChild(th);
  for (const scene of SCENES) {
    const td = document.createElement('td');
    const canvas = document.createElement('canvas');
    canvas.width = W * CELL; canvas.height = H * CELL;
    const label = document.createElement('span');
    label.textContent = LABELS[scene] + ' · ' + pet.fps[scene].toFixed(1) + 'fps';
    td.appendChild(canvas); td.appendChild(label); tr.appendChild(td);
    cells.push({ canvas, ctx: canvas.getContext('2d'), frames: pet.frames[scene], fps: pet.fps[scene] });
  }
  rows.appendChild(tr);
}
function draw(cell) {
  const t = performance.now() / 1000;
  const index = Math.floor(t * cell.fps) % cell.frames.length;
  const frame = cell.frames[index];
  const { ctx } = cell;
  ctx.fillStyle = '#06070a';
  ctx.fillRect(0, 0, W * CELL, H * CELL);
  for (let i = 0; i < frame.length; i += 1) {
    const v = frame[i];
    if (v <= 0) continue;
    ctx.fillStyle = 'rgba(247, 179, 43, ' + (0.22 + (v / 255) * 0.78).toFixed(3) + ')';
    ctx.fillRect((i % W) * CELL, Math.floor(i / W) * CELL, CELL, CELL);
  }
}
function loop() { for (const cell of cells) draw(cell); requestAnimationFrame(loop); }
loop();
</script>
</body></html>`;

mkdirSync(new URL('../artifacts/', import.meta.url), { recursive: true });
const out = new URL('../artifacts/pet-atlas.html', import.meta.url);
writeFileSync(out, html);
console.log(`pet atlas written: artifacts/pet-atlas.html (${(html.length / 1024).toFixed(0)} KB, ${PETS.length} characters × ${scenes.length} scenes)`);
