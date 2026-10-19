/** 17×23 interpretation of the MIT Mori PetScene.tsx model: round body, short
 * limbs, small ears, cheeks, personality mark and matching wearable positions. */
export const WIDTH = 17
export const HEIGHT = 23
export const SCENES = ['idle', 'eat', 'play', 'sleep', 'happy', 'pet', 'hungry'] as const
export const STAGES = ['seedling', 'bloom', 'luminary'] as const
export const PERSONALITIES = ['gentle', 'playful', 'curious'] as const
export const WEARABLES = ['none', 'star-ribbon', 'sprout-crown', 'moon-charm'] as const
export type Scene = typeof SCENES[number]
export type Stage = typeof STAGES[number]
export type Personality = typeof PERSONALITIES[number]
export type Wearable = typeof WEARABLES[number]
export const FPS: Record<Scene, number> = { idle: 1.5, eat: 3, play: 4, sleep: 1, happy: 1.5, pet: 2, hungry: 1.5 }
export const FRAME_COUNT = 8
export const artKey = (scene: Scene, stage: Stage, personality: Personality, wearable: Wearable) =>
  [scene, stage, personality, wearable].join('/')

class Canvas {
  pixels = new Array<number>(WIDTH * HEIGHT).fill(0)
  point(x: number, y: number, value: number) {
    x = Math.round(x); y = Math.round(y)
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) this.pixels[y * WIDTH + x] = Math.round(value)
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, value: number, shaded = false) {
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry
      if (nx * nx + ny * ny <= 1) this.point(x, y, shaded ? Math.max(130, Math.min(255, 238 - 38 * nx - 27 * ny - 26 * (nx * nx + ny * ny))) : value)
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

export function renderMori(scene: Scene, index: number, stage: Stage, personality: Personality, wearable: Wearable): number[] {
  const c = new Canvas(), phase = index % FRAME_COUNT
  const rise = [0, 0, -1, -1, 0, 0, 0, 0][phase]
  const bob = scene === 'play' ? [0, 0, -1, -2, -1, 0, 1, 0][phase]
    : scene === 'sleep' ? [0, 0, 0, 1, 1, 1, 0, 0][phase] : rise
  const lean = scene === 'pet' ? [0, 1, 1, 0, -1, -1, 0, 0][phase] * 0.45 : 0
  const scale = stage === 'seedling' ? 0.9 : stage === 'bloom' ? 0.96 : 1
  const dy = wearable === 'sprout-crown' || personality === 'curious' ? Math.max(-1, bob) : bob
  const tx = (x: number) => 8 + (x - 8) * scale + lean
  const ty = (y: number) => 12 + (y - 12) * scale + dy
  const point = (x: number, y: number, value: number) => c.point(tx(x), ty(y), value)
  const ellipse = (x: number, y: number, rx: number, ry: number, value: number, shaded = false) => c.ellipse(tx(x), ty(y), rx * scale, ry * scale, value, shaded)
  const polygon = (points: number[][], value: number) => c.polygon(points.map(([x, y]) => [tx(x), ty(y)]), value)
  c.ellipse(8, 21, scene === 'play' && bob < 0 ? 3 : 4.5, 0.55, 34)
  // Small cone ears behind the single body, matching the front rig.
  polygon([[3.1, 2.8], [2.2, 8.4], [6.2, 7.2]], 205)
  polygon([[12.9, 2.8], [9.8, 7.2], [13.8, 8.4]], 175)
  ellipse(4.2, 19.6, 2.25, 1.05, 218)
  ellipse(11.8, 19.6, 2.25, 1.05, 178)
  ellipse(8, 12, 6.3, scene === 'sleep' ? 6.6 : 7.1, 240, true)
  const raised = scene === 'play' ? (phase >= 2 && phase <= 4 ? -3.2 : -0.8) : 0
  const cuddle = scene === 'pet', feeding = scene === 'eat'
  ellipse(cuddle ? 5.1 : feeding ? 5.5 : 1.6, cuddle ? 15 : feeding ? 14.4 : 13.3 + raised, 0.9, 1.65, 215)
  ellipse(cuddle ? 10.9 : feeding ? 10.5 : 14.4, cuddle ? 15 : feeding ? 14.4 : 13.3 + raised, 0.9, 1.65, 155)
  const closed = scene === 'sleep' || scene === 'pet' || phase === 5 || (scene === 'hungry' && phase === 1)
  for (const x of [5.3, 10.7]) {
    if (closed) { point(x - 0.5, 10.7, 0); point(x + 0.5, 10.7, 0) }
    else { ellipse(x, 10.7, 0.86, scene === 'eat' ? 0.85 : 1.2, 0); point(x - 0.25, 10, 255) }
  }
  ellipse(3.6, 12.9, 1.05, 0.6, 95)
  ellipse(12.4, 12.9, 1.05, 0.6, 85)
  if (scene === 'eat' && phase % 2 === 0) ellipse(8, 13, 0.85, 1, 0)
  else if (scene === 'hungry') { point(7, 13.5, 0); point(8, 13, 0); point(9, 13.5, 0) }
  else { point(7, 13, 0); point(8, 13.6, 0); point(9, 13, 0) }
  // PersonalityMark in PetScene: heart, diamond or a small antenna.
  if (personality === 'gentle') {
    for (const [x, y] of [[7, 16], [9, 16], [7, 17], [8, 17], [9, 17], [8, 18]]) point(x, y, 60)
  } else if (personality === 'playful') {
    for (const [x, y] of [[8, 15.5], [7, 16.5], [9, 16.5], [8, 17.5]]) point(x, y, 60)
  } else {
    point(8, 3, 130); point(8, 2, 130); ellipse(8, 1, 0.85, 0.75, 255)
  }
  if (wearable === 'star-ribbon') {
    polygon([[1.5, 5.2], [4.3, 6.4], [1.5, 8]], 25)
    polygon([[6.9, 5.2], [4.1, 6.4], [6.9, 8]], 25)
    point(2, 6, 255); point(2, 7, 255); point(6, 6, 255); point(6, 7, 255); point(4, 6.5, 140)
  } else if (wearable === 'sprout-crown') {
    point(8, 3, 125); point(8, 2, 125)
    ellipse(6.6, 1.6, 1.7, 0.7, 220); ellipse(9.4, 1.6, 1.7, 0.7, 175)
  } else if (wearable === 'moon-charm') {
    for (const [x, y] of [[11, 15], [10, 16], [10, 17], [11, 18], [12, 18]]) point(x, y, 45)
    point(11, 16, 255); point(11, 17, 255)
  }
  if (stage !== 'seedling') { c.point(0, 8, 95); c.point(16, 8, 95) }
  if (stage === 'luminary') { c.point(0, 10, 170); c.point(16, 10, 170) }
  if (scene === 'eat') c.ellipse(12, 15, 1.2, 1.2, phase % 2 ? 150 : 245)
  if (scene === 'play' || scene === 'happy') {
    const x = phase % 2 ? 1 : 15
    c.point(x, 2, 230); c.point(x - 1, 3, 140); c.point(x + 1, 3, 140); c.point(x, 4, 230)
  }
  if (scene === 'sleep') {
    const y = phase < 4 ? 3 : 2
    for (const [x, yy] of [[13, y], [14, y], [14, y + 1], [13, y + 2], [14, y + 2]]) c.point(x, yy, 160)
  }
  return c.pixels
}
