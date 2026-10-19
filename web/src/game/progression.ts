import type {
  CharacterId,
  ActiveIncident,
  CareAction,
  GameMode,
  GrowthStageId,
  IncidentId,
  KeepsakeCategory,
  KeepsakeId,
  PersonalityId,
  PersonalityScores,
  PetNeeds,
} from './types'

export const EGG_DURATION_MS = 60_000
export const EGG_CRACK_MS = 50_000
export const EGG_HATCH_MS = 58_000
export type EggPhase = 'egg' | 'crack' | 'hatch' | 'hatched'
export const CHARACTERS: readonly CharacterId[] = ['star', 'block']
export const DEFAULT_CHARACTER_NAMES: Record<CharacterId, string> = { star: '星跃', block: '方跃' }
export const isCharacterId = (value: unknown): value is CharacterId =>
  typeof value === 'string' && (CHARACTERS as readonly string[]).includes(value)

export const MINUTE_MS = 60_000
export const INITIAL_INCIDENT_DELAY_MS = 2 * MINUTE_MS
export const CARE_GROWTH_COOLDOWN_MS = MINUTE_MS
export const INCIDENT_REWARD_SPARKS = 8
export const INCIDENT_REWARD_GROWTH = 10

export interface PersonalityDefinition {
  id: PersonalityId
  name: string
  glyph: string
  description: string
}

export interface GrowthStageDefinition {
  id: GrowthStageId
  name: string
  minimum: number
  nextAt: number | null
}

export interface IncidentDefinition {
  id: IncidentId
  title: string
  glyph: string
  story: string
  action: CareAction
}

export interface KeepsakeDefinition {
  id: KeepsakeId
  name: string
  glyph: string
  category: KeepsakeCategory
  cost: number
  description: string
}

export const PERSONALITIES: readonly PersonalityDefinition[] = [
  { id: 'gentle', name: '温柔', glyph: '♥', description: '耐心的照顾，让心里暖暖的。' },
  { id: 'playful', name: '活泼', glyph: '✦', description: '游戏和惊喜，让点点充满活力。' },
  { id: 'curious', name: '好奇', glyph: '↗', description: '探索和小小仪式，会打开新的道路。' },
]

export const GROWTH_STAGES: readonly GrowthStageDefinition[] = [
  { id: 'seedling', name: '幼苗期', minimum: 0, nextAt: 120 },
  { id: 'bloom', name: '绽放期', minimum: 120, nextAt: 320 },
  { id: 'luminary', name: '星光期', minimum: 320, nextAt: null },
]

export const INCIDENTS: readonly IncidentDefinition[] = [
  { id: 'static-cloud', title: '静电小云', glyph: '⌁', story: '一团毛茸茸的小云跟着点点，需要一个拥抱。', action: 'cuddle' },
  { id: 'tangled-sprout', title: '缠绕的小芽', glyph: '≈', story: '花园里的丝线缠住了小爪子，帮它洗干净吧。', action: 'wash' },
  { id: 'wandering-signal', title: '远方的信号', glyph: '◇', story: '远方传来微弱信号，带点点出去探索吧。', action: 'explore' },
]

export const KEEPSAKES: readonly KeepsakeDefinition[] = [
  { id: 'star-ribbon', name: '星星丝带', glyph: '✦', category: 'wearable', cost: 14, description: '适合快乐日子的小蝴蝶结。' },
  { id: 'sprout-crown', name: '嫩芽王冠', glyph: '♧', category: 'wearable', cost: 24, description: '从回忆里长出的两片小叶子。' },
  { id: 'moon-charm', name: '月亮挂饰', glyph: '☾', category: 'wearable', cost: 36, description: '把安静的小月亮戴在身边。' },
  { id: 'memory-lantern', name: '回忆灯笼', glyph: '□', category: 'room', cost: 18, description: '留住一段温暖的故事。' },
  { id: 'tiny-garden', name: '袖珍花园', glyph: '❋', category: 'room', cost: 30, description: '小小花园，开出想象中的花。' },
  { id: 'dream-mobile', name: '甜梦风铃', glyph: '⋆', category: 'room', cost: 48, description: '在房间上方接住甜梦。' },
]

export const CARE_TRAIT: Readonly<Record<CareAction, PersonalityId>> = {
  feed: 'gentle',
  play: 'playful',
  wash: 'curious',
  rest: 'gentle',
  cuddle: 'gentle',
  explore: 'curious',
}

export const PERSONALITY_IDS = PERSONALITIES.map(({ id }) => id)
export const INCIDENT_IDS = INCIDENTS.map(({ id }) => id)
export const KEEPSAKE_IDS = KEEPSAKES.map(({ id }) => id)
export const INCIDENT_BY_ID = Object.fromEntries(INCIDENTS.map((incident) => [incident.id, incident])) as Record<IncidentId, IncidentDefinition>
export const KEEPSAKE_BY_ID = Object.fromEntries(KEEPSAKES.map((item) => [item.id, item])) as Record<KeepsakeId, KeepsakeDefinition>

export const isPersonalityId = (value: unknown): value is PersonalityId => typeof value === 'string' && PERSONALITY_IDS.includes(value as PersonalityId)
export const isIncidentId = (value: unknown): value is IncidentId => typeof value === 'string' && INCIDENT_IDS.includes(value as IncidentId)
export const isKeepsakeId = (value: unknown): value is KeepsakeId => typeof value === 'string' && KEEPSAKE_IDS.includes(value as KeepsakeId)

export const getDominantPersonality = (scores: PersonalityScores, focus: PersonalityId): PersonalityId => {
  const highest = Math.max(...PERSONALITY_IDS.map((id) => scores[id]))
  if (scores[focus] === highest) return focus
  return PERSONALITY_IDS.find((id) => scores[id] === highest) ?? 'gentle'
}

export const applyTraitAward = (scores: PersonalityScores, trait: PersonalityId, amount: number): PersonalityScores => {
  const reduction = amount / 2
  return {
    gentle: Math.max(1, scores.gentle + (trait === 'gentle' ? amount : -reduction)),
    playful: Math.max(1, scores.playful + (trait === 'playful' ? amount : -reduction)),
    curious: Math.max(1, scores.curious + (trait === 'curious' ? amount : -reduction)),
  }
}

export const getGrowthStage = (points: number): GrowthStageDefinition => {
  if (points >= 320) return GROWTH_STAGES[2]
  if (points >= 120) return GROWTH_STAGES[1]
  return GROWTH_STAGES[0]
}

export const getGrowthProgress = (points: number) => {
  const stage = getGrowthStage(points)
  if (stage.nextAt === null) return { stage, percent: 100, remaining: 0 }
  const range = stage.nextAt - stage.minimum
  const progress = Math.max(0, points - stage.minimum)
  return { stage, percent: Math.min(100, progress / range * 100), remaining: Math.max(0, stage.nextAt - points) }
}

export const utcDateKey = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10)
export const getIncidentDelayMs = (seed: number) => (12 + Math.abs(Math.trunc(seed)) % 7) * MINUTE_MS
export const selectIncidentId = (seed: number): IncidentId => INCIDENTS[Math.abs(Math.trunc(seed)) % INCIDENTS.length].id
export const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

interface TimedState {
  needs: PetNeeds
  mode: GameMode
  lastUpdated: number
  ageMinutes: number
  activeIncident: ActiveIncident | null
  nextIncidentAt: number | null
  actionNonce: number
  storyIndex: number
  ownedItemIds: readonly KeepsakeId[]
  hatched?: boolean
  egg?: { startedAt: number; durationMs: number } | null
}

export interface TimedSettlement {
  needs: PetNeeds
  lastUpdated: number
  ageMinutes: number
  activeIncident: ActiveIncident | null
  nextIncidentAt: number | null
  egg: { startedAt: number; durationMs: number } | null
  hatched: boolean
}

export const settleTimedState = (state: TimedState, sampledNow: number): TimedSettlement => {
  const now = Math.max(state.lastUpdated, sampledNow)
  // 0.3.3 孵化计时（真实时间戳）：到点破壳，离开前台 / 锁屏 / 重启后一致
  const hatchSettled = !state.hatched && state.egg !== null && state.egg !== undefined && now >= state.egg.startedAt + state.egg.durationMs
  const rawMinutes = Math.max(0, (now - state.lastUpdated) / MINUTE_MS)
  const elapsedMinutes = state.mode === 'cozy' ? Math.min(rawMinutes, 12 * 60) : rawMinutes
  const pace = state.mode === 'cozy' ? 0.58 : 1
  const floor = state.mode === 'cozy' ? 18 : 0
  const hunger = Math.max(floor, state.needs.hunger - elapsedMinutes * 0.55 * pace)
  const joy = Math.max(floor, state.needs.joy - elapsedMinutes * 0.38 * pace)
  const hygiene = Math.max(floor, state.needs.hygiene - elapsedMinutes * 0.28 * pace)
  const energy = Math.max(floor, state.needs.energy - elapsedMinutes * 0.32 * pace)
  const struggling = hunger < 18 || hygiene < 16
  const healthDelta = elapsedMinutes * (struggling ? -0.4 : 0.08) * pace
  let health = clampPercent(state.needs.health + healthDelta)
  let activeIncident = state.activeIncident
  let nextIncidentAt = state.nextIncidentAt

  if (activeIncident) {
    const penaltyStart = Math.max(activeIncident.lastPenaltyAt, state.lastUpdated)
    const penaltyMinutes = Math.min(60, Math.max(0, (now - penaltyStart) / MINUTE_MS))
    if (state.mode === 'classic') health = clampPercent(health - penaltyMinutes * 0.12)
    activeIncident = { ...activeIncident, lastPenaltyAt: Math.max(activeIncident.lastPenaltyAt, now) }
    nextIncidentAt = null
  } else if (nextIncidentAt !== null && now >= nextIncidentAt) {
    const seed = state.actionNonce + state.storyIndex + Math.floor(state.ageMinutes + rawMinutes) + state.ownedItemIds.length
    activeIncident = { id: selectIncidentId(seed), startedAt: now, lastPenaltyAt: now }
    nextIncidentAt = null
  }

  return {
    needs: { hunger, joy, hygiene, energy, health },
    lastUpdated: now,
    ageMinutes: state.ageMinutes + rawMinutes,
    activeIncident,
    nextIncidentAt,
    egg: hatchSettled ? null : (state.egg ?? null),
    hatched: hatchSettled ? true : state.hatched === true
  }
}

export const scheduleIncidentAfterResolution = (
  now: number,
  actionNonce: number,
  storyIndex: number,
  incidentId: IncidentId,
  ownedItemCount: number,
) => {
  const incidentIndex = INCIDENT_IDS.indexOf(incidentId)
  const seed = actionNonce + storyIndex + Math.max(0, incidentIndex) + ownedItemCount
  return now + getIncidentDelayMs(seed)
}

export const canPurchaseKeepsake = (sparks: number, owned: readonly KeepsakeId[], itemId: KeepsakeId) => {
  const item = KEEPSAKE_BY_ID[itemId]
  return !owned.includes(itemId) && sparks >= item.cost
}

export const isEquippable = (owned: readonly KeepsakeId[], itemId: KeepsakeId, category: KeepsakeCategory) => (
  owned.includes(itemId) && KEEPSAKE_BY_ID[itemId].category === category
)


/** 蛋阶段判定（与引擎同规则） */
export function eggPhase(egg: { startedAt: number; durationMs: number } | null, hatched: boolean, now: number): EggPhase {
  if (hatched || !egg) return 'hatched'
  const elapsed = Math.max(0, now - egg.startedAt)
  if (elapsed >= egg.durationMs) return 'hatched'
  if (elapsed >= EGG_HATCH_MS) return 'hatch'
  if (elapsed >= EGG_CRACK_MS) return 'crack'
  return 'egg'
}
