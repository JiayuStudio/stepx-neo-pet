/** 17×23 dot-matrix interpretation of the 8 companion characters (0.3.6).
 *
 * 角色轮廓（可编辑逐行字符串）在 studio-art/pets.ts，渲染与动画在本文件：
 *   - 常态 idle：呼吸 + 眨眼 + 1 格重心转移
 *   - walk / explore：双腿交替迈步 + 手臂反向摆
 *   - eat：嘴型咀嚼 + 鼓肚 + 食物提示
 *   - play / happy：蓄力下沉 → 小跳 + 挥手 + 星点
 *   - wash：泡泡 + 身体左右晃
 *   - sleep：闭眼下沉 + Z
 *   - pet / cuddle：闭眼蹭头 + 爱心
 *   - hungry：捂肚 + 食物提示；unhappy：垂头 + 泪滴
 *   - sick：高频发抖 + 温度点；dead：横躺 + X 眼 + 灵魂星点消散
 *   - egg / crack / hatch：孵化三阶段（沿用 0.3.3 规则）
 *
 * 耳机（黑橙）在生成阶段与身体共用位移（hp/ 前缀帧），正面 3D 由 PetScene 表达。
 * 性格印记 / 饰品 / 成长标记沿用 Mori 机制。 */
import { PET_BY_ID, PETS, type CharacterId, type PetDef } from './pets.ts'

export type { CharacterId, PetDef } from './pets.ts'
export { PETS, PET_BY_ID } from './pets.ts'

export const WIDTH = 17
export const HEIGHT = 23
export const SCENES = [
  'idle', 'walk', 'eat', 'play', 'wash', 'sleep', 'pet', 'happy',
  'hungry', 'unhappy', 'sick', 'dead',
  'egg', 'crack', 'hatch',
] as const
export const STAGES = ['seedling', 'bloom', 'luminary'] as const
export const PERSONALITIES = ['gentle', 'playful', 'curious'] as const
export const WEARABLES = ['none', 'star-ribbon', 'sprout-crown', 'moon-charm'] as const
export const CHARACTERS = PETS.map((pet) => pet.id)
export type Scene = typeof SCENES[number]
export type Stage = typeof STAGES[number]
export type Personality = typeof PERSONALITIES[number]
export type Wearable = typeof WEARABLES[number]
export type Character = CharacterId
export const FPS: Record<Scene, number> = {
  idle: 1.5, walk: 3, eat: 3, play: 4, wash: 2.5, sleep: 1, pet: 2, happy: 1.5,
  hungry: 1.5, unhappy: 1.2, sick: 4, dead: 1.2,
  egg: 1.2, crack: 1.5, hatch: 4,
}
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
}

/* ------------------------------------------------------------------ *
 * 蛋阶段三场景：egg 呼吸轻晃 → crack 逐渐裂纹 → hatch 破壳露雏形
 * 键为 `<scene>/<character>`（与养成维度无关）
 * ------------------------------------------------------------------ */
function renderEggScene(scene: 'egg' | 'crack' | 'hatch', character: Character, phase: number): number[] {
  const c = new Canvas()
  const def = PET_BY_ID[character]
  const warm = 200 + Math.round(def.tone.body / 16) // 角色色调 → 蛋壳暖度
  const warmDeep = warm - 26
  const sway = scene === 'egg' ? [0, 0, 0.5, 0.5, 0, -0.5, -0.5, 0][phase] : 0
  const rise = scene === 'hatch' ? [0, -0.5, -1, -1.5, -2, -2, -1, 0][phase] : 0
  const cx = 8 + sway
  const cy = 12.5 + rise
  const point = (x: number, y: number, v: number) => c.point(x + sway, y + rise, v)
  const ellipse = (x: number, y: number, rx: number, ry: number, v: number, shaded = false) => c.ellipse(x + sway, y + rise, rx, ry, v, shaded)

  c.ellipse(8, 21.5, 4.2, 0.55, 34)
  if (scene === 'hatch' && phase >= 3) {
    c.ellipse(cx - 1.2, cy - 4.6, 3.4, 2.6, 238)
    c.ellipse(cx + 1.6, cy + 4.4, 3.6, 2.4, 214)
    // 雏形：用角色自己的色调画迷你剪影
    c.ellipse(cx, cy + 0.6, 2.6, 2.8, def.tone.light, true)
    c.ellipse(cx, cy - 2.4, 0.9, 1.1, def.tone.accent)
    c.rect(cx - 1.6, cy - 0.6, cx - 0.6, cy + 0.8, 0)
    c.rect(cx + 0.6, cy - 0.6, cx + 1.6, cy + 0.8, 0)
    c.rect(cx - 1, cy, cx - 0.2, cy + 0.6, 255)
    c.rect(cx + 0.2, cy, cx + 1, cy + 0.6, 255)
    c.point(cx - 4, cy - 3, 210); c.point(cx + 4, cy + 3, 190); c.point(cx + 3, cy - 4, 170)
  } else {
    const puff = phase === 2 || phase === 5 ? 1.06 : 1
    ellipse(cx, cy, 4.6 * puff, 5.6 / puff, warm, true)
    ellipse(cx, cy + 1.2, 2.5 * puff, 2.6 / puff, warmDeep)
    c.ellipse(cx - 2.4, cy - 2.2, 0.9, 0.7, warmDeep)
    c.ellipse(cx + 2.2, cy + 0.6, 0.8, 0.6, warmDeep)
    c.ellipse(cx - 1.2, cy + 2.8, 0.7, 0.5, warmDeep)
    if (scene === 'crack') {
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

/* ------------------------------------------------------------------ *
 * 角色姿势：每个场景逐帧给出局部变化（头 / 腿 / 眼 / 嘴 / 附带像素）
 * ------------------------------------------------------------------ */
type EyeMode = 'open' | 'blink' | 'half' | 'x'

interface Pose {
  rows: string[]
  dy: number
  headDx: number
  legDx: number
  eye: EyeMode
  mouth: number
  extras: [number, number, number][]
}

/** 每帧 ≤1 格的摆动表：不使用整体大幅漂浮 */
const SWAY = [0, 0, 0, 1, 1, 0, -1, -1]
const WALK_LEG = [0, 1, 1, 0, 0, -1, -1, 0]
const SHAKE = [0, 1, -1, 1, 0, -1, 1, 0]

function poseFor(def: PetDef, scene: Scene, phase: number): Pose {
  const base: Pose = { rows: def.rows, dy: 0, headDx: 0, legDx: 0, eye: 'open', mouth: 1, extras: [] }
  const eyeY = def.top + def.eyeRow
  const bellyY = def.top + Math.min(def.rows.length - 3, def.legRow - 2)
  switch (scene) {
    case 'idle':
      return {
        ...base,
        headDx: phase === 3 ? 1 : 0,
        eye: phase === 5 ? 'blink' : 'open',
        // 呼吸只改肚子两侧各 1 格，不动整体
        extras: phase === 1 || phase === 4
          ? [[3, bellyY + 1, def.tone.body], [13, bellyY + 1, def.tone.body], [3, bellyY + 2, def.tone.body], [13, bellyY + 2, def.tone.body]]
          : [],
      }
    case 'walk':
      return {
        ...base,
        dy: WALK_LEG[phase] === 0 ? 0 : -1,
        headDx: WALK_LEG[phase] === 0 ? 0 : -WALK_LEG[phase],
        legDx: WALK_LEG[phase],
        eye: phase === 5 ? 'blink' : 'open',
      }
    case 'eat':
      return {
        ...base,
        headDx: [0, 0, 1, 0, -1, 0, 0, 0][phase],
        mouth: [1, 2, 3, 2][phase % 4],
        eye: phase === 6 ? 'blink' : 'open',
        extras: phase % 2 === 0
          ? [[14, eyeY + 3, 240], [14, eyeY + 4, 190]]
          : [[3, eyeY + 3, 240], [3, eyeY + 4, 190]],
      }
    case 'play':
      return {
        ...base,
        dy: [0, -1, -1, 0, 0, -1, -1, 0][phase],
        headDx: [0, 1, 0, -1, 0, 1, 0, -1][phase],
        eye: phase === 4 ? 'blink' : 'open',
        extras: [
          [1, eyeY - 3 + (phase % 3), 240],
          [15, eyeY - 2 + ((phase + 1) % 3), 220],
          [8, def.top - 1, phase % 2 ? 255 : 200],
        ],
      }
    case 'wash':
      return {
        ...base,
        headDx: SWAY[phase],
        eye: phase === 3 || phase === 7 ? 'blink' : 'open',
        extras: [
          [2, eyeY - 2 + (phase % 2), 250],
          [13, eyeY - 3 + ((phase + 1) % 2), 250],
          [15, eyeY + 2 - (phase % 2), 235],
          [1, eyeY + 3 + (phase % 2), 235],
          [8, def.top - 1, 255],
        ],
      }
    case 'sleep':
      return {
        ...base,
        dy: phase === 3 || phase === 4 ? 1 : 0,
        eye: 'blink',
        extras: [
          [13, 2, 150], [14, 2, 150], [13, 3, 150], [14, 4, 150],
          [12, phase % 2 ? 4 : 3, 120],
        ],
      }
    case 'pet':
      return {
        ...base,
        headDx: [0, 0, 1, 1, -1, -1, 0, 0][phase],
        eye: phase === 2 || phase === 3 ? 'blink' : 'half',
        extras: [
          [1, 2, 200], [3, 2, 200], [2, 3, 255],
          [14, 1 + (phase % 2), 210],
        ],
      }
    case 'happy':
      return {
        ...base,
        dy: [1, 1, -1, -1, 0, 0, -1, 0][phase],
        headDx: [0, 0, 1, 0, -1, 0, 1, 0][phase],
        eye: phase === 6 ? 'blink' : 'open',
        // 开心时轻挥一只手（右手抬 1 格）
        extras: [
          [13, eyeY + 2, def.tone.body],
          [12, eyeY + 3, def.tone.body],
          [1, eyeY - 2 + (phase % 2), 240],
          [15, eyeY - 1 + (phase % 2), 240],
        ],
      }
    case 'hungry':
      return {
        ...base,
        headDx: [0, 0, -1, 0, 1, 0, 0, 0][phase],
        eye: 'half',
        // 捂肚：双手在肚子两侧轻揉（两段位置）；右上角食物提示逐帧闪烁
        extras: [
          ...(phase % 4 < 2
            ? [[4, bellyY, def.tone.dark] as [number, number, number], [12, bellyY, def.tone.dark] as [number, number, number]]
            : [[5, bellyY + 1, def.tone.dark] as [number, number, number], [11, bellyY + 1, def.tone.dark] as [number, number, number]]),
          [4, bellyY + 2, def.tone.body], [12, bellyY + 2, def.tone.body],
          ...(phase % 2 === 0
            ? [[14, eyeY, 245] as [number, number, number], [15, eyeY + 1, 200] as [number, number, number]]
            : [[15, eyeY - 1, 230] as [number, number, number]]),
        ],
      }
    case 'unhappy':
      return {
        ...base,
        dy: 0,
        headDx: [0, 0, 0, 1, 0, -1, 0, 0][phase],
        eye: 'half',
        mouth: 0,
        // 垂头 + 泪滴逐帧滑落（两行位置交替）
        extras: [
          [6, eyeY + 1 + (phase % 2), 230], [6, eyeY + 3 + (phase % 2), 175],
          [10, eyeY + 2 - (phase % 2), 230], [10, eyeY + 4 - (phase % 2), 165],
          [8, def.top + def.eyeRow - 3 + (phase % 3), def.tone.dark],
        ],
      }
    case 'sick':
      return {
        ...base,
        headDx: SHAKE[phase],
        eye: phase % 3 === 0 ? 'blink' : 'half',
        mouth: 0,
        // 发抖 + 额头温度点（亮）+ 汗滴
        extras: [
          [8, def.top + def.eyeRow - 3, 250],
          [7, def.top + def.eyeRow - 4, 250],
          [12, eyeY - 1, 235],
          [3, eyeY + 2, 200],
        ],
      }
    case 'dead':
      return {
        ...base,
        rows: def.deadRows,
        eye: 'x',
        mouth: 0,
        // 灵魂星点逐帧上飘
        extras: [
          [8, 6 - (phase % 4), 255],
          [5, 4 - (phase % 3), 190],
          [11, 5 - ((phase + 1) % 3), 210],
        ],
      }
    default:
      return base
  }
}

/** 按姿势把角色行栅格化；eyes / mouth 覆盖局部，不做整体几何变换 */
function drawPose(c: Canvas, def: PetDef, pose: Pose) {
  const tone = def.tone
  const color = (ch: string): number | null => {
    switch (ch) {
      case 'B': return tone.body
      case 'L': return tone.light
      case 'D': return tone.dark
      case 'A': return tone.accent
      case 's': return tone.secondary
      case 'W': return 255
      case 'x': return 0
      case 'm': return Math.max(30, tone.dark - 40)
      default: return null
    }
  }
  const eyeFrom = def.eyeRow
  const eyeTo = def.eyeRow + 2
  for (let r = 0; r < pose.rows.length; r++) {
    const row = pose.rows[r]
    // 垂头：仅头部行下移 1 格（局部形变，不是整图漂移）
    const rowDy = pose.dy + (pose.headDx === 0 && r >= def.head[0] && r <= def.head[1] && pose.rows === def.deadRows ? 0 : 0)
    const inHead = r >= def.head[0] && r <= def.head[1]
    const dx = r >= def.legRow ? pose.legDx : inHead ? pose.headDx : 0
    for (let x = 0; x < WIDTH; x++) {
      const ch = row[x]
      if (ch === '.' || ch === ' ') continue
      let value = color(ch)
      if (value === null) continue
      const isEye = ch === 'W' || ch === 'x'
      if (isEye && r >= eyeFrom && r <= eyeTo) {
        if (pose.eye === 'blink') {
          value = r === eyeFrom + 1 ? tone.dark : (ch === 'W' ? tone.body : tone.dark)
        } else if (pose.eye === 'half') {
          value = r === eyeFrom ? (ch === 'W' ? 255 : 0) : tone.body
        } else if (pose.eye === 'x') {
          value = ch === 'W' ? tone.dark : 0
        }
      }
      if (ch === 'm') {
        if (pose.mouth === 0) { value = tone.body; }
        else if (pose.mouth === 2) { value = Math.max(20, tone.dark - 50); }
        else if (pose.mouth === 3) { value = Math.max(20, tone.dark - 70); }
      }
      c.point(x + dx, def.top + r + rowDy, value)
    }
  }
  for (const [x, y, value] of pose.extras) c.point(x, y, value)
}

function renderPet(
  character: Character,
  scene: Scene,
  phase: number,
  stage: Stage,
  personality: Personality,
  wearable: Wearable,
  headphones: boolean,
): number[] {
  const def = PET_BY_ID[character]
  const c = new Canvas()
  const pose = poseFor(def, scene, phase)
  drawPose(c, def, pose)
  // 死亡姿态横躺：耳机按 deadRows 的眼睛行定位（不是站姿行）
  const eyeRowForScene = scene === 'dead'
    ? Math.max(0, def.deadRows.findIndex((row) => row.includes('x')))
    : def.eyeRow
  const eyeY = def.top + eyeRowForScene
  // 配件与耳机跟随头部姿势（局部 ≤1 格），保证逐帧与身体一起动
  const ox = pose.headDx
  const oy = pose.dy

  // 性格印记：放在嘴边下方（不压五官）
  const markY = def.top + def.legRow - 3 + oy
  if (personality === 'gentle') { c.point(7 + ox, markY, 110); c.point(9 + ox, markY, 110); c.point(8 + ox, markY + 1, 110) }
  else if (personality === 'playful') { c.point(8 + ox, markY, 105); c.point(7 + ox, markY + 1, 105); c.point(9 + ox, markY + 1, 105) }
  else { c.point(8 + ox, markY, 100); c.point(8 + ox, markY + 1, 255) }

  // 饰品（随角色顶部偏移，并跟随头部姿势）
  if (wearable === 'star-ribbon') {
    c.point(4 + ox, def.top + 2 + oy, 255); c.point(3 + ox, def.top + 1 + oy, 180); c.point(3 + ox, def.top + 3 + oy, 180)
    c.point(5 + ox, def.top + 1 + oy, 180); c.point(5 + ox, def.top + 3 + oy, 180)
  } else if (wearable === 'sprout-crown') {
    c.point(8 + ox, def.top - 1 + oy, 150); c.point(7 + ox, def.top - 2 + oy, 230); c.point(9 + ox, def.top - 2 + oy, 230)
  } else if (wearable === 'moon-charm') {
    c.point(12 + ox, def.top + def.legRow - 2 + oy, 255); c.point(11 + ox, def.top + def.legRow - 1 + oy, 220); c.point(12 + ox, def.top + def.legRow + oy, 255)
  }

  // 耳机：耳罩贴脸两侧（眼睛行起 3 行），头梁跨头顶；与身体共用同一帧位移
  if (headphones) {
    const bandY = eyeY - 2 + oy
    for (let x = 5; x <= 11; x++) c.point(x + ox, bandY, 26)
    c.point(4 + ox, bandY + 1, 26); c.point(12 + ox, bandY + 1, 26)
    c.point(3 + ox, bandY + 2, 26); c.point(13 + ox, bandY + 2, 26)
    for (let y = eyeY + oy; y <= eyeY + 2 + oy; y++) {
      c.point(3 + ox, y, 242); c.point(13 + ox, y, 242)
      c.point(2 + ox, y, 26); c.point(14 + ox, y, 26)
    }
  }

  // 成长阶段标记（画面两侧）
  if (stage !== 'seedling') { c.point(1, 20, 90); c.point(15, 20, 90) }
  if (stage === 'luminary') { c.point(1, 19, 180); c.point(15, 19, 180) }
  return c.pixels
}

export function renderMori(
  character: Character,
  scene: Scene,
  index: number,
  stage: Stage,
  personality: Personality,
  wearable: Wearable,
  headphones = false,
): number[] {
  const phase = index % FRAME_COUNT
  if (scene === 'egg' || scene === 'crack' || scene === 'hatch') return renderEggScene(scene, character, phase)
  return renderPet(character, scene, phase, stage, personality, wearable, headphones)
}

/** 蛋阶段键：`<scene>/<character>`（忽略养成维度）；其余走全维度键 */
export const isEggScene = (scene: Scene) => scene === 'egg' || scene === 'crack' || scene === 'hatch'
export const eggArtKey = (scene: Scene, character: Character) => `${scene}/${character}`

/** 场景中文说明（界面 / 图集共用，不暴露内部 key） */
export const SCENE_LABELS: Record<Scene, string> = {
  idle: '悠闲待着', walk: '散步探索', eat: '吃饭中', play: '玩耍中', wash: '洗澡泡泡',
  sleep: '睡觉中', pet: '亲昵依赖', happy: '心满意足', hungry: '饿肚子', unhappy: '不开心',
  sick: '生病发抖', dead: '倒下了', egg: '蛋', crack: '蛋出现裂纹', hatch: '即将破壳',
}
