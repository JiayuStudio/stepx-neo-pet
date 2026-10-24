/* 前台 17×23 背屏预览的场景 / 键选择规则——与原生 MoriMatrix + MoriAppearance
 * 逐条镜像（同一份规则、同一份帧生成器），保证预览与真机背屏一致。 */
import { EGG_CRACK_MS, EGG_DURATION_MS, EGG_HATCH_MS, eggPhase } from './progression'
import type { GameSnapshot } from './types'
import type { Scene } from '../../../studio-art/mori'

const SCENE_BY_ACTION: Record<string, Scene> = {
  feed: 'eat',
  rest: 'sleep',
  cuddle: 'pet',
  story: 'pet',
  wash: 'wash',
  play: 'play',
  explore: 'walk',
  activity: 'play',
}

/** 照料窗口追踪器（调用方持有，跨 tick 持久；nonce 变化时只记录一次时间） */
export interface ActionTracker {
  lastNonce: number
  actionAt: number
}

/** 与 MoriMatrix.scene 一致：蛋阶段 → 死亡 → 照料 6 秒窗口 → 需求状态 */
export function selectScene(snapshot: GameSnapshot, now: number, tracker: ActionTracker): Scene {
  const phase = eggPhase(snapshot.egg, snapshot.hatched, now)
  if (phase === 'egg' || phase === 'crack' || phase === 'hatch') return phase
  // 死亡按既有 health 零值显示（不新增离线必死、不删档）；恢复沿用原照料规则
  if (snapshot.needs.health <= 0) return 'dead'
  // Track even null actions so the first real care action opens its window.
  if (snapshot.actionNonce !== tracker.lastNonce) {
    if (tracker.lastNonce >= 0) tracker.actionAt = now
    tracker.lastNonce = snapshot.actionNonce
  }
  if (snapshot.lastAction !== null && SCENE_BY_ACTION[snapshot.lastAction] && now - tracker.actionAt < 6000) {
    return SCENE_BY_ACTION[snapshot.lastAction]
  }
  const { health, energy, hunger, joy, hygiene } = snapshot.needs
  if (health < 30 || hygiene < 22) return 'sick'
  if (hunger < 28) return 'hungry'
  if (joy < 28) return 'unhappy'
  if (energy < 24) return 'sleep'
  return (health + energy + hunger + joy + hygiene) / 5 > 64 ? 'happy' : 'idle'
}

/** 外观维度：与 MoriAppearance.stage / personality 完全一致（最高分优先，平分看 focus） */
export function selectAppearance(snapshot: GameSnapshot): { stage: 'seedling' | 'bloom' | 'luminary'; personality: 'gentle' | 'playful' | 'curious'; wearable: 'none' | 'star-ribbon' | 'sprout-crown' | 'moon-charm' } {
  const growth = snapshot.growthPoints
  const stage = growth >= 320 ? 'luminary' : growth >= 120 ? 'bloom' : 'seedling'
  const { gentle, playful, curious } = snapshot.personalityScores
  const max = Math.max(gentle, Math.max(playful, curious))
  const focus = snapshot.personalityFocus
  const personality =
    (focus === 'gentle' && gentle === max) || (focus === 'playful' && playful === max) || (focus === 'curious' && curious === max)
      ? focus
      : gentle === max ? 'gentle' : playful === max ? 'playful' : 'curious'
  const equipped = snapshot.equippedWearable
  const wearable = equipped === 'star-ribbon' || equipped === 'sprout-crown' || equipped === 'moon-charm' ? equipped : 'none'
  return { stage, personality, wearable }
}

/** 与 MoriMatrix.artKey 一致：蛋阶段 <scene>/<角色>；其余 角色/场景/阶段/性格/饰品，耳机加 hp/ 前缀 */
export function selectArtKey(snapshot: GameSnapshot, scene: Scene): string {
  if (scene === 'egg' || scene === 'crack' || scene === 'hatch') return `${scene}/${snapshot.character}`
  const { stage, personality, wearable } = selectAppearance(snapshot)
  const prefix = snapshot.headphones ? `hp/${snapshot.character}/` : `${snapshot.character}/`
  return `${prefix}${scene}/${stage}/${personality}/${wearable}`
}

/** 孵化剩余秒数（蛋阶段前台提示用） */
export function eggRemainingSeconds(snapshot: GameSnapshot, now: number): number {
  if (snapshot.hatched || !snapshot.egg) return 0
  return Math.max(0, Math.ceil((snapshot.egg.startedAt + snapshot.egg.durationMs - now) / 1000))
}

export { EGG_CRACK_MS, EGG_DURATION_MS, EGG_HATCH_MS, eggPhase }
