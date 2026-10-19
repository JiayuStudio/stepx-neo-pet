/** 17×23 dot-matrix interpretation of the two 0.3.3 characters.
 *
 * star  = 星跃：圆润橙黄星形精灵（顶部圆尖、左右手、分开双腿、两条白色竖眼、
 *          中央暖红渐变在正面 3D 与背屏亮度分层中表达）。
 * block = 方跃：橙红像素方块精灵（阶梯状头顶、矩形手脚、两只深色方眼）。
 *
 * 耳机（黑橙）在点阵生成阶段与身体共用位移/缩放（hp/ 前缀帧），
 * 正面 3D 由 PetScene 的 Headphones 组件表达；开关保存在共享引擎快照里。
 * 保留 MIT Mori 的性格印记 / 饰品位置 / 成长阶段标记机制。 */
export const WIDTH = 17
export const HEIGHT = 23
export const SCENES = ['idle', 'eat', 'play', 'sleep', 'happy', 'pet', 'hungry', 'egg', 'crack', 'hatch'] as const
export const STAGES = ['seedling', 'bloom', 'luminary'] as const
export const PERSONALITIES = ['gentle', 'playful', 'curious'] as const
export const WEARABLES = ['none', 'star-ribbon', 'sprout-crown', 'moon-charm'] as const
export const CHARACTERS = ['star', 'block'] as const
export type Scene = typeof SCENES[number]
export type Stage = typeof STAGES[number]
export type Personality = typeof PERSONALITIES[number]
export type Wearable = typeof WEARABLES[number]
export type Character = typeof CHARACTERS[number]
export const FPS: Record<Scene, number> = { idle: 1.5, eat: 3, play: 4, sleep: 1, happy: 1.5, pet: 2, hungry: 1.5, egg: 1.2, crack: 1.5, hatch: 4 }
export const FRAME_COUNT = 8
export const artKey = (character: Character, scene: Scene, stage: Stage, personality: Personality, wearable: Wearable, headphones = false) =>
  isEggScene(scene)
    ? eggArtKey(scene, character)
    : [headphones ? 'hp/' + character : character, scene, stage, personality, wearable].join('/')

class Canvas {
  pixels = new Array<number>(WIDTH * HEIGHT).fill(0)
  point(x: number, y: number, value: number) {
    x = Math.round(x); y = Math.round(y)
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) this.pixels[y * WIDTH + x] = Math.round(value)
  }
  rect(x0: number, y0: number, x1: number, y1: number, value: number) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) this.point(x, y, value)
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, value: number, shaded = false) {
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry
      if (nx * nx + ny * ny <= 1) this.point(x, y, shaded ? Math.max(120, Math.min(255, 246 - 44 * nx - 30 * ny - 22 * (nx * nx + ny * ny))) : value)
    }
  }
  polygon(points: number[][], value: number) {
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      let inside = false
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i], [xj, yj] = points[j]
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
      }
      if (inside) this.point(x, y, value)
    }
  }
}


/** 蛋阶段三场景：egg 呼吸轻晃 → crack 逐渐裂纹 → hatch 破壳露雏形。
 *  键为 `<scene>/<character>`（与养成维度无关）。 */
function renderEggScene(scene: 'egg' | 'crack' | 'hatch', character: Character, phase: number): number[] {
  const c = new Canvas()
  const warm = character === 'block' ? 232 : 226
  const warmDeep = character === 'block' ? 200 : 196
  const sway = scene === 'egg' ? [0, 0, 0.5, 0.5, 0, -0.5, -0.5, 0][phase] : 0
  const rise = scene === 'hatch' ? [0, -0.5, -1, -1.5, -2, -2, -1, 0][phase] : 0
  const cx = 8 + sway
  const cy = 12.5 + rise
  const point = (x: number, y: number, v: number) => c.point(x + sway, y + rise, v)
  const ellipse = (x: number, y: number, rx: number, ry: number, v: number, shaded = false) => c.ellipse(x + sway, y + rise, rx, ry, v, shaded)

  c.ellipse(8, 21.5, 4.2, 0.55, 34)
  if (scene === 'hatch' && phase >= 3) {
    // 破壳：上下两半错开，中间露出雏形
    c.ellipse(cx - 1.2, cy - 4.6, 3.4, 2.6, 238) // 上壳左上
    c.ellipse(cx + 1.6, cy + 4.4, 3.6, 2.4, 214) // 下壳右下
    // 雏形（mini 角色）
    if (character === 'block') {
      c.rect(cx - 2, cy - 1, cx + 2, cy + 3, 236)
      c.rect(cx - 1, cy - 2, cx + 1, cy - 1, 222)
      c.rect(cx - 1.6, cy - 0.4, cx - 0.6, cy + 0.6, 0)
      c.rect(cx + 0.6, cy - 0.4, cx + 1.6, cy + 0.6, 0)
    } else {
      c.ellipse(cx, cy + 0.6, 2.6, 2.8, 236, true)
      c.ellipse(cx, cy - 2.4, 0.9, 1.1, 244)
      c.rect(cx - 1.6, cy - 0.6, cx - 0.6, cy + 0.8, 0)
      c.rect(cx + 0.6, cy - 0.6, cx + 1.6, cy + 0.8, 0)
      c.rect(cx - 1, cy, cx - 0.2, cy + 0.6, 255)
      c.rect(cx + 0.2, cy, cx + 1, cy + 0.6, 255)
    }
    // 蛋壳碎片
    c.point(cx - 4, cy - 3, 210); c.point(cx + 4, cy + 3, 190); c.point(cx + 3, cy - 4, 170)
  } else {
    // 完整蛋（呼吸：第 2/5 帧略大）
    const puff = phase === 2 || phase === 5 ? 1.06 : 1
    ellipse(cx, cy, 4.6 * puff, 5.6 / puff, warm, true)
    ellipse(cx, cy + 1.2, 2.5 * puff, 2.6 / puff, warmDeep)
    // 斑点
    c.ellipse(cx - 2.4, cy - 2.2, 0.9, 0.7, warmDeep)
    c.ellipse(cx + 2.2, cy + 0.6, 0.8, 0.6, warmDeep)
    c.ellipse(cx - 1.2, cy + 2.8, 0.7, 0.5, warmDeep)
    if (scene === 'crack') {
      // 裂纹随 phase 增多（第 3 阶段最密）
      const cracks: number[][][] = [
        [[6, 8], [7, 9], [6, 10], [7, 11]],
        [[6, 8], [7, 9], [6, 10], [7, 11], [9, 9], [10, 10], [9, 11]],
        [[6, 8], [7, 9], [6, 10], [7, 11], [9, 9], [10, 10], [9, 11], [8, 12], [7, 13], [8, 14], [10, 13], [11, 14]],
      ]
      const level = phase < 3 ? 0 : phase < 6 ? 1 : 2
      for (const [x, y] of cracks[level]) point(x, y, 0)
    }
  }
  return c.pixels
}

/** 逐行手绘像素轮廓 → 帧（角色唯一真源，改形象只改这里的字符串） */
// Compact sprites: fixed integer cells preserve every facial feature.
// 0.3.4 精修：星跃 = 圆润软团子（短圆顶角、饱满肚子、贴身短手、分开短脚、
// 白竖眼带细暗边、脸居中稍低、1 像素小嘴）；方跃 = 低矮不对称阶梯顶 + 黑方眼、短手短腿。
const STAR_ROWS = [
  ".......###.......",
  "......#####......",
  ".....#######.....",
  "....#########....",
  "....#########....",
  "....#xWWxWWx#....",
  "....#xWWxWWx#....",
  "....#xWWxWWx#....",
  "....####+####....",
  "...###########...",
  "..#############..",
  "...###########...",
  "....#########....",
  ".....###.###.....",
  ".....###.###....."
]
const BLOCK_ROWS = [
  ".......####......",
  ".....######......",
  "....#########....",
  "....#########....",
  "....##xx#xx##....",
  "....##xx#xx##....",
  "...###########...",
  "..#############..",
  "...###########...",
  "....#########....",
  "....#########....",
  "....#########....",
  "....####.####....",
  "....###...###....",
  "....###...###...."
]
function renderCompact(character: Character, scene: Scene, phase: number, stage: Stage, personality: Personality, wearable: Wearable, headphones: boolean): number[] {
  const c = new Canvas()
  const star = character === 'star'
  const rows = star ? STAR_ROWS : BLOCK_ROWS
  const top = star ? 4 : 5
  const cheerful = scene === 'happy' || scene === 'play'
  // 逐帧 1 格以内的可爱动作：常态重心轻转移；开心时摇摆 + 蓄力（下沉 1 格）再小跳（抬 1 格）
  const dx = cheerful ? [0, 0, 0, 1, 1, 0, -1, 0][phase]
    : scene === 'idle' || scene === 'eat' ? (phase === 3 ? 1 : 0)
    : scene === 'pet' ? [0, 0, 1, 1, -1, -1, 0, 0][phase]
    : scene === 'hungry' ? [0, 0, 1, 1, -1, -1, 0, 0][phase]
    : 0
  const dy = scene === 'sleep' ? (phase === 3 || phase === 4 ? 1 : 0)
    : cheerful ? (phase === 1 ? 1 : phase === 3 ? -1 : 0)
    : 0
  const blink = scene === 'sleep' || phase === 5 || (scene === 'pet' && (phase === 2 || phase === 3))
  const point = (x: number, y: number, value: number) => c.point(x + dx, y + dy, value)
  for (let r = 0; r < rows.length; r++) {
    for (let x = 0; x < WIDTH; x++) {
      const ch = rows[r][x]
      if (ch === '.') continue
      let value = ch === 'W' ? 255 : ch === 'x' ? (star ? 24 : 0) : ch === '+' ? (star ? 96 : 56) : (star ? 158 : 220)
      if (blink && star && r >= 5 && r <= 7) value = ch === 'W' && r === 6 ? 255 : 158
      if (blink && !star && ch === 'x') value = r === 4 ? 220 : 0
      point(x, top + r, value)
    }
  }
  // 开心时轻挥一只手（右手抬起 1 格，随摇摆逐帧）
  if (cheerful && phase >= 4) {
    if (star) point(13, top + 8, 158)
    else point(14, top + 6, 220)
  }
  // Gentle breathing changes the tummy, not the outline of the face.
  const puff = phase === 2 || phase === 3
  if (puff && scene !== 'sleep') {
    point(4, top + 10, star ? 158 : 220)
    point(12, top + 10, star ? 158 : 220)
  }
  // Small personality marks sit below the face.
  if (personality === 'gentle') { point(7,top+9,110); point(9,top+9,110); point(8,top+10,110) }
  else if (personality === 'playful') { point(8,top+9,105); point(7,top+10,105); point(9,top+10,105) }
  else { point(8,top+9,100); point(8,top+10,255) }
  if (scene === 'eat') {
    point(8,top+8,phase%2 ? 70 : 0)
    point(14,top+9,240); point(14,top+10,180)
  }
  if (wearable === 'star-ribbon') {
    point(4,top+2,255); point(3,top+1,180); point(3,top+3,180)
    point(5,top+1,180); point(5,top+3,180)
  } else if (wearable === 'sprout-crown') {
    point(8,top-1,150); point(7,top-2,230); point(9,top-2,230)
  } else if (wearable === 'moon-charm') {
    point(12,top+10,255); point(11,top+11,220); point(12,top+12,255)
  }
  if (headphones) {
    // Headband and ear cups share the exact same integer movement as the pet.
    for (let x=6;x<=10;x++) point(x,top-1,26)
    point(5,top,26); point(11,top,26)
    point(4,top+1,26); point(12,top+1,26)
    point(3,top+2,26); point(13,top+2,26)
    for (let y=top+3;y<=top+5;y++) {
      point(3,y,242); point(13,y,242)
      point(2,y,26); point(14,y,26)
    }
  }
  if (stage !== 'seedling') { c.point(1,20,90); c.point(15,20,90) }
  if (stage === 'luminary') { c.point(1,19,180); c.point(15,19,180) }
  if (scene === 'sleep') {
    c.point(13,2,150); c.point(14,2,150); c.point(13,3,150); c.point(14,4,150)
  } else if (scene === 'pet') {
    c.point(1,2,200); c.point(3,2,200); c.point(2,3,255)
  } else if (scene === 'hungry' && phase%2===0) c.point(14,12,150)
  return c.pixels
}
function renderStar(scene: Scene, phase: number, stage: Stage, personality: Personality, wearable: Wearable, headphones: boolean): number[] {
  return renderCompact('star',scene,phase,stage,personality,wearable,headphones)
}
function renderBlock(scene: Scene, phase: number, stage: Stage, personality: Personality, wearable: Wearable, headphones: boolean): number[] {
  return renderCompact('block',scene,phase,stage,personality,wearable,headphones)
}

export function renderMori(character: Character, scene: Scene, index: number, stage: Stage, personality: Personality, wearable: Wearable, headphones = false): number[] {
  const phase = index % FRAME_COUNT
  if (scene === 'egg' || scene === 'crack' || scene === 'hatch') return renderEggScene(scene, character, phase)
  return character === 'block'
    ? renderBlock(scene, phase, stage, personality, wearable, headphones)
    : renderStar(scene, phase, stage, personality, wearable, headphones)
}

/** 蛋阶段键：`<scene>/<character>`（忽略养成维度）；其余走全维度键 */
export const isEggScene = (scene: Scene) => scene === 'egg' || scene === 'crack' || scene === 'hatch'
export const eggArtKey = (scene: Scene, character: Character) => `${scene}/${character}`
