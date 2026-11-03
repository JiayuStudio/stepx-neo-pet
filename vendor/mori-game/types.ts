export type ThemeId = 'sakura' | 'cyber' | 'moss' | 'moon'
import type { MemorialEntry, NotifySettings, PetMessage, QuietSettings } from './companion-life'
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
  /** 0.3.9 生命周期模式：默认 gentle（温柔陪伴，不告别） */
  lifeMode: 'gentle' | 'cycle'
  /** 生命周期模式的年龄起点；gentle 为 null。切换模式时从当前时刻重新建立 */
  lifeStartedAt: number | null
  /** 自然告别时间；非 null 表示已告别，保留纪念 */
  farewellAt: number | null
  /** 本地消息（最近 20 条，新的在前） */
  messages: PetMessage[]
  /** 上一阶段名（用于检测成长消息，归一化时保留） */
  lastStage: string | null
  /** 健康档位，用于康复消息 */
  healthBand: 'low' | 'ok'
  /** 勿扰设置 */
  quiet: QuietSettings
  /** 主动通知设置（含跨重启的频控计数） */
  notify: NotifySettings
  /** 已产生过的消息日期键（避免重复） */
  lastMessageDay: string | null
  /** 永久纪念（告别 / 重新领养时写入） */
  memorials: MemorialEntry[]
  /** 已通过系统通知发过的消息 id（避免重复，也避免勿扰后补发） */
  lastNotifiedMessageId: string | null
  /** 上次真实互动的时刻（喂养 / 陪玩 / 剧情 / 装扮）；用于「想念」消息，不被每秒 tick 刷新 */
  lastInteractionAt: number
  /** 已产生过的事件 id（持久化，清空消息列表也不会重放） */
  messageLedger: string[]
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

export interface SaveExport {
  contents: string
  fileName: string
}

export type SaveImportResult = { ok: true } | { ok: false; error: string }

export interface GameState extends GameSnapshot {
  tick: () => void
  care: (action: CareAction) => void
  completeActivity: (gameId: MiniGameId, score: number) => void
  chooseStory: (choiceIndex: number) => void
  purchaseKeepsake: (itemId: KeepsakeId) => void
  toggleKeepsake: (itemId: KeepsakeId) => void
  openStory: () => void
  closeStory: () => void
  setTheme: (themeId: ThemeId) => void
  setMode: (mode: GameMode) => void
  setCharacter: (character: CharacterId) => void
  setHeadphones: (on: boolean) => void
  sootheEgg: () => void
  /** 0.3.9 生命周期模式：进入 cycle 时从当前时刻重新起算年龄 */
  setLifeMode: (mode: 'gentle' | 'cycle') => void
  setQuiet: (patch: Partial<QuietSettings>) => void
  setNotify: (patch: Partial<NotifySettings>) => void
  /** 原生通知发送成功后回写计数（跨重启保存） */
  recordNotification: (sentAt: number) => void
  /** 原生在发通知前调用：引擎判断勿扰 / 频控并消费消息；仅发送成功后记录配额 */
  takeNotification: (now: number, systemQuiet: boolean) => { ok: boolean; reason: string; id?: string; title?: string; body?: string; vibrate?: boolean }
  notificationPreview: (now: number, systemQuiet: boolean) => { ok: boolean; reason: string }
  clearMessages: () => void
  /** 告别后重新领养：保留纪念与设置，需用户明确确认后调用 */
  adoptAgain: () => void
  exportSave: () => SaveExport
  importSave: (contents: string) => SaveImportResult
  reset: () => void
}
