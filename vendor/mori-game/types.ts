export type ThemeId = 'sakura' | 'cyber' | 'moss' | 'moon'
export type CharacterId = 'star' | 'block' | 'sprout' | 'bunny' | 'fox' | 'otter' | 'owl' | 'drake'
export type GameMode = 'cozy' | 'classic'
export type NeedKey = 'hunger' | 'joy' | 'hygiene' | 'energy' | 'health'
export type PetNeeds = Record<NeedKey, number>
export type CareAction = 'feed' | 'play' | 'wash' | 'rest' | 'cuddle' | 'explore'
export type MiniGameId = 'star-catch' | 'memory-flip'
export type PetMood = 'radiant' | 'happy' | 'peckish' | 'sleepy' | 'grumpy' | 'unwell'
export type PersonalityId = 'gentle' | 'playful' | 'curious'
export type GrowthStageId = 'seedling' | 'bloom' | 'luminary'
export type IncidentId = 'static-cloud' | 'tangled-sprout' | 'wandering-signal'
export type KeepsakeId = 'star-ribbon' | 'sprout-crown' | 'moon-charm' | 'memory-lantern' | 'tiny-garden' | 'dream-mobile'
export type KeepsakeCategory = 'wearable' | 'room'
export type ActionSignal = CareAction | 'story' | 'activity' | 'workshop' | null
export type PersonalityScores = Record<PersonalityId, number>

export interface ActiveIncident {
  id: IncidentId
  startedAt: number
  lastPenaltyAt: number
}

export interface ThemeDefinition {
  id: ThemeId
  name: string
  number: string
  tagline: string
  shell: string
  shellDark: string
  accent: string
  ink: string
  screen: string
  sky: string
  ground: string
  glow: string
  particle: string
}

export interface StoryChoice {
  label: string
  reply: string
  bond: number
  joy: number
  trait: PersonalityId
}

export interface StoryEvent {
  eyebrow: string
  title: string
  body: string
  choices: readonly StoryChoice[]
}

/** 0.3.3 孵化：新领养从蛋开始；旧存档 hatched=true 直接进入养成 */
export interface EggState {
  startedAt: number
  durationMs: number
}

export interface GameSnapshot {
  petName: string
  /** 0.3.3 角色：星跃（圆润星形精灵）/ 方跃（像素方块精灵）；旧存档缺省按星跃迁移 */
  character: CharacterId
  /** 0.3.3 耳机开关（黑橙耳机造型，正背面同步） */
  headphones: boolean
  needs: PetNeeds
  bond: number
  ageMinutes: number
  mode: GameMode
  themeId: ThemeId
  lastUpdated: number
  lastAction: ActionSignal
  actionNonce: number
  storyIndex: number
  storyOpen: boolean
  lastReply: string | null
  sparks: number
  playStreak: number
  lastActivityDate: string | null
  activityBest: Record<MiniGameId, number>
  personalityScores: PersonalityScores
  personalityFocus: PersonalityId
  growthPoints: number
  growthCooldownUntil: number
  lastGrowthActivityDate: string | null
  activeIncident: ActiveIncident | null
  nextIncidentAt: number | null
  ownedItemIds: KeepsakeId[]
  equippedWearable: KeepsakeId | null
  equippedRoomItem: KeepsakeId | null
  /** 孵化状态：null = 已孵化（旧存档）；非 null = 蛋计时中 */
  egg: EggState | null
  /** 是否已孵化（旧 0.3.2 / 0.3.3 养成存档均为 true） */
  hatched: boolean
  /** 蛋阶段轻触安抚的时间戳（短暂反馈） */
  eggSoothedAt: number | null
}

export const clampNeed = (value: number) => Math.max(0, Math.min(100, value))

export const getMood = (needs: PetNeeds): PetMood => {
  if (needs.health < 30) return 'unwell'
  if (needs.energy < 24) return 'sleepy'
  if (needs.hunger < 28) return 'peckish'
  if (needs.joy < 28 || needs.hygiene < 22) return 'grumpy'
  const average = Object.values(needs).reduce((sum, value) => sum + value, 0) / 5
  return average > 88 ? 'radiant' : average > 64 ? 'happy' : 'peckish'
}