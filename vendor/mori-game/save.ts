import {
  CHARACTERS,
  EGG_DURATION_MS,
  INITIAL_INCIDENT_DELAY_MS,
  KEEPSAKE_BY_ID,
  DEFAULT_CHARACTER_NAMES,
  isCharacterId,
  isIncidentId,
  isKeepsakeId,
  isPersonalityId,
  utcDateKey,
} from './progression'
import { STORY_COUNT } from './stories'
import {
  DEFAULT_NOTIFY,
  DEFAULT_QUIET,
  clampMinute,
  type MemorialEntry,
  type NotifyFrequency,
  type NotifySettings,
  type PetMessage,
  type PetMessageKind,
  type QuietSettings,
} from './companion-life'
import type {
  ActionSignal,
  ActiveIncident,
  GameMode,
  GameSnapshot,
  KeepsakeId,
  MiniGameId,
  PersonalityScores,
  PetNeeds,
  ThemeId,
} from './types'

const MODES: readonly GameMode[] = ['cozy', 'classic']
const THEMES: readonly ThemeId[] = ['sakura', 'cyber', 'moss', 'moon']
const MINI_GAMES: readonly MiniGameId[] = ['star-catch', 'memory-flip']
const ACTIONS: readonly ActionSignal[] = ['feed', 'play', 'wash', 'rest', 'cuddle', 'explore', 'story', 'activity', 'workshop', null]
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const finite = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback
const bounded = (value: unknown, fallback: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, finite(value, fallback)))
const integer = (value: unknown, fallback: number, minimum: number, maximum: number) => Math.floor(bounded(value, fallback, minimum, maximum))
const validDate = (value: unknown, now: number) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  if (!Number.isFinite(timestamp)) return null
  const exactDate = new Date(timestamp).toISOString().slice(0, 10)
  return exactDate === value && value <= utcDateKey(now) ? value : null
}
const validTimestamp = (value: unknown, fallback: number, now: number, futureLimit = now) => bounded(value, fallback, 0, futureLimit)

export const freshSnapshot = (now = Date.now()): GameSnapshot => ({
  petName: DEFAULT_CHARACTER_NAMES.star,
  character: 'star',
  headphones: false,
  egg: { startedAt: now, durationMs: EGG_DURATION_MS },
  hatched: false,
  eggSoothedAt: null,
  needs: { hunger: 78, joy: 72, hygiene: 84, energy: 76, health: 92 },
  bond: 4,
  ageMinutes: 0,
  mode: 'cozy',
  themeId: 'sakura',
  lastUpdated: now,
  lastAction: null,
  actionNonce: 0,
  storyIndex: 0,
  storyOpen: true,
  lastReply: null,
  sparks: 0,
  playStreak: 0,
  lastActivityDate: null,
  activityBest: { 'star-catch': 0, 'memory-flip': 0 },
  personalityScores: { gentle: 1, playful: 1, curious: 1 },
  personalityFocus: 'gentle',
  growthPoints: 0,
  growthCooldownUntil: now,
  lastGrowthActivityDate: null,
  activeIncident: null,
  nextIncidentAt: now + INITIAL_INCIDENT_DELAY_MS,
  ownedItemIds: [],
  equippedWearable: null,
  equippedRoomItem: null,
  lifeMode: 'gentle',
  lifeStartedAt: null,
  farewellAt: null,
  messages: [],
  lastStage: null,
  healthBand: 'ok',
  quiet: { ...DEFAULT_QUIET },
  notify: { ...DEFAULT_NOTIFY },
  lastMessageDay: null,
  memorials: [],
  lastNotifiedMessageId: null,
  lastInteractionAt: now,
  messageLedger: [],
})

const normalizeQuiet = (value: unknown): QuietSettings => {
  const source = isRecord(value) ? value : {}
  return {
    manual: source.manual === true,
    schedule: typeof source.schedule === 'boolean' ? source.schedule : DEFAULT_QUIET.schedule,
    startMinute: clampMinute(source.startMinute, DEFAULT_QUIET.startMinute),
    endMinute: clampMinute(source.endMinute, DEFAULT_QUIET.endMinute),
    weekdaysOnly: source.weekdaysOnly === true,
  }
}

const normalizeNotify = (value: unknown, now: number): NotifySettings => {
  const source = isRecord(value) ? value : {}
  const frequency: NotifyFrequency = source.frequency === 'normal' ? 'normal' : 'low'
  const sentCount = integer(source.sentCount, 0, 0, 1000)
  const windowStartedAt = finite(source.windowStartedAt, 0)
  const lastSentAt = finite(source.lastSentAt, Number.NaN)
  return {
    enabled: source.enabled === true,
    vibrate: source.vibrate === true,
    frequency,
    sentCount,
    windowStartedAt: windowStartedAt > 0 && windowStartedAt <= now ? windowStartedAt : 0,
    lastSentAt: Number.isFinite(lastSentAt) && lastSentAt > 0 && lastSentAt <= now ? lastSentAt : null,
  }
}

const MESSAGE_KINDS: readonly PetMessageKind[] = ['morning', 'night', 'miss', 'care', 'recover', 'growth', 'farewell', 'idle']

const normalizeMessages = (value: unknown, now: number): PetMessage[] => {
  if (!Array.isArray(value)) return []
  const out: PetMessage[] = []
  for (const item of value.slice(0, 30)) {
    if (!isRecord(item)) continue
    const kind = MESSAGE_KINDS.includes(item.kind as PetMessageKind) ? item.kind as PetMessageKind : null
    const at = finite(item.at, Number.NaN)
    const text = typeof item.text === 'string' ? item.text.slice(0, 160) : ''
    const id = typeof item.id === 'string' ? item.id.slice(0, 80) : null
    if (!kind || !id || !text || !Number.isFinite(at) || at < 0 || at > now) continue
    const action = typeof item.action === 'string' ? item.action.slice(0, 20) : 'idle'
    out.push({ id, kind, at, text, action: action as PetMessage['action'] })
  }
  return out.slice(0, 20)
}

const normalizeNeeds = (value: unknown, fallback: PetNeeds): PetNeeds => {
  const needs = isRecord(value) ? value : {}
  return {
    hunger: bounded(needs.hunger, fallback.hunger, 0, 100),
    joy: bounded(needs.joy, fallback.joy, 0, 100),
    hygiene: bounded(needs.hygiene, fallback.hygiene, 0, 100),
    energy: bounded(needs.energy, fallback.energy, 0, 100),
    health: bounded(needs.health, fallback.health, 0, 100),
  }
}

const normalizeActivityBest = (value: unknown): Record<MiniGameId, number> => {
  const best = isRecord(value) ? value : {}
  return Object.fromEntries(MINI_GAMES.map((id) => [id, integer(best[id], 0, 0, 1_000_000)])) as Record<MiniGameId, number>
}

const normalizeScores = (value: unknown): PersonalityScores => {
  const scores = isRecord(value) ? value : {}
  return {
    gentle: bounded(scores.gentle, 1, 1, 999),
    playful: bounded(scores.playful, 1, 1, 999),
    curious: bounded(scores.curious, 1, 1, 999),
  }
}

const normalizeOwnedItems = (value: unknown): KeepsakeId[] => {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(isKeepsakeId))]
}

const normalizeIncident = (value: unknown, now: number): ActiveIncident | null => {
  if (!isRecord(value) || !isIncidentId(value.id)) return null
  const startedAt = finite(value.startedAt, Number.NaN)
  const lastPenaltyAt = finite(value.lastPenaltyAt, Number.NaN)
  if (!Number.isFinite(startedAt) || !Number.isFinite(lastPenaltyAt) || startedAt < 0 || startedAt > now) return null
  return {
    id: value.id,
    startedAt,
    lastPenaltyAt: Math.max(startedAt, Math.min(now, lastPenaltyAt)),
  }
}

const normalizeEquipment = (value: unknown, owned: readonly KeepsakeId[], category: 'wearable' | 'room') => {
  if (!isKeepsakeId(value) || !owned.includes(value)) return null
  return KEEPSAKE_BY_ID[value].category === category ? value : null
}

const normalizeMemorials = (value: unknown, now: number): MemorialEntry[] => {
  if (!Array.isArray(value)) return []
  const out: MemorialEntry[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const at = finite(item.at, Number.NaN)
    const id = typeof item.id === 'string' ? item.id.slice(0, 80) : null
    const petName = typeof item.petName === 'string' ? item.petName.slice(0, 30) : ''
    const character = typeof item.character === 'string' ? item.character.slice(0, 20) : 'star'
    if (!id || !petName || !Number.isFinite(at) || at < 0 || at > now) continue
    out.push({
      id,
      at,
      petName,
      character,
      days: integer(item.days, 0, 0, 100_000),
      bond: integer(item.bond, 0, 0, 100),
      growthPoints: integer(item.growthPoints, 0, 0, 100_000),
      storyIndex: integer(item.storyIndex, 0, 0, STORY_COUNT),
      reason: item.reason === 'rehomed' ? 'rehomed' : 'farewell',
    })
  }
  return out
}

export const normalizeSnapshot = (value: unknown, now = Date.now()): GameSnapshot => {
  const fresh = freshSnapshot(now)
  const source = isRecord(value) ? value : {}
  const needs = normalizeNeeds(source.needs, fresh.needs)
  const bond = bounded(source.bond, fresh.bond, 0, 100)
  const storyIndex = integer(source.storyIndex, 0, 0, STORY_COUNT)
  const ownedItemIds = normalizeOwnedItems(source.ownedItemIds)
  const activeIncident = normalizeIncident(source.activeIncident, now)
  const rawGrowth = finite(source.growthPoints, Number.NaN)
  const growthPoints = Number.isFinite(rawGrowth)
    ? Math.max(0, Math.min(100_000, rawGrowth))
    : Math.min(119, Math.floor(bond * 0.4) + storyIndex * 12)
  const rawDeadline = finite(source.nextIncidentAt, Number.NaN)
  const nextIncidentAt = activeIncident
    ? null
    : Number.isFinite(rawDeadline) && rawDeadline >= 0 && rawDeadline <= now + 24 * 60 * 60_000
      ? rawDeadline
      : now + INITIAL_INCIDENT_DELAY_MS
  const lastUpdated = validTimestamp(source.lastUpdated, now, now)
  const action = ACTIONS.includes(source.lastAction as ActionSignal) ? source.lastAction as ActionSignal : null
  const reply = typeof source.lastReply === 'string' && source.lastReply.length <= 500 ? source.lastReply : null
  // 0.3.2 旧存档没有 character/headphones：默认星跃、关闭耳机（无损迁移）
  const legacy = !isCharacterId(source.character)
  const character = legacy ? fresh.character : (source.character as GameSnapshot['character'])
  const headphones = typeof source.headphones === 'boolean' ? source.headphones : fresh.headphones
  // 孵化迁移：完全没有 egg/hatched 字段的旧存档（0.3.2 / 早期 0.3.3）视作已孵化，保留进度
  const hasEggFields = 'egg' in source || 'hatched' in source
  const legacyHatched = !hasEggFields
  const egg = legacyHatched || !isRecord(source.egg) || typeof (source.egg as { startedAt?: unknown }).startedAt !== 'number'
    ? null
    : {
        startedAt: validTimestamp((source.egg as { startedAt: unknown }).startedAt, now, now, now + EGG_DURATION_MS),
        durationMs: EGG_DURATION_MS,
      }
  const hatched = legacyHatched ? true : typeof source.hatched === 'boolean' ? source.hatched : egg === null
  const eggSoothedAt = typeof source.eggSoothedAt === 'number' && Number.isFinite(source.eggSoothedAt)
    ? validTimestamp(source.eggSoothedAt, now, now, now + EGG_DURATION_MS)
    : null
  const rawName = typeof source.petName === 'string' && source.petName.trim() ? source.petName.trim().slice(0, 30) : fresh.petName
  // 已知系统默认名（点点 / Mori / 任意其他角色默认名）一律迁移为当前角色默认名；自定义名保留
  const knownDefaults = new Set<string>(['点点', 'Mori', ...CHARACTERS.map((id) => DEFAULT_CHARACTER_NAMES[id])])
  knownDefaults.delete(DEFAULT_CHARACTER_NAMES[character])
  const petName = knownDefaults.has(rawName) ? DEFAULT_CHARACTER_NAMES[character] : rawName
  const mode = MODES.includes(source.mode as GameMode) ? source.mode as GameMode : fresh.mode
  const themeId = THEMES.includes(source.themeId as ThemeId) ? source.themeId as ThemeId : fresh.themeId
  const personalityFocus = isPersonalityId(source.personalityFocus) ? source.personalityFocus : fresh.personalityFocus

  return {
    petName,
    character,
    headphones,
    egg,
    hatched,
    eggSoothedAt,
    needs,
    bond,
    ageMinutes: bounded(source.ageMinutes, 0, 0, 10_000_000),
    mode,
    themeId,
    lastUpdated,
    lastAction: action,
    actionNonce: integer(source.actionNonce, 0, 0, Number.MAX_SAFE_INTEGER),
    storyIndex,
    storyOpen: typeof source.storyOpen === 'boolean' ? source.storyOpen : storyIndex === 0,
    lastReply: reply,
    sparks: integer(source.sparks, 0, 0, 1_000_000),
    playStreak: integer(source.playStreak, 0, 0, 1_000_000),
    lastActivityDate: validDate(source.lastActivityDate, now),
    activityBest: normalizeActivityBest(source.activityBest),
    personalityScores: normalizeScores(source.personalityScores),
    personalityFocus,
    growthPoints,
    growthCooldownUntil: validTimestamp(source.growthCooldownUntil, now, now, now + 5 * 60_000),
    lastGrowthActivityDate: validDate(source.lastGrowthActivityDate, now),
    activeIncident,
    nextIncidentAt,
    ownedItemIds,
    equippedWearable: normalizeEquipment(source.equippedWearable, ownedItemIds, 'wearable'),
    equippedRoomItem: normalizeEquipment(source.equippedRoomItem, ownedItemIds, 'room'),
    // 0.3.9：旧存档一律进入温柔陪伴；生命周期模式必须由用户主动选择（lifeStartedAt 只在切换时建立）
    lifeMode: source.lifeMode === 'cycle' ? 'cycle' : 'gentle',
    lifeStartedAt: source.lifeMode === 'cycle' && Number.isFinite(finite(source.lifeStartedAt, Number.NaN))
      ? validTimestamp(source.lifeStartedAt, now, now)
      : null,
    farewellAt: Number.isFinite(finite(source.farewellAt, Number.NaN))
      ? validTimestamp(source.farewellAt, now, now)
      : null,
    messages: normalizeMessages(source.messages, now),
    lastStage: typeof source.lastStage === 'string' ? source.lastStage.slice(0, 20) : null,
    healthBand: source.healthBand === 'low' ? 'low' : 'ok',
    quiet: normalizeQuiet(source.quiet),
    notify: normalizeNotify(source.notify, now),
    lastMessageDay: typeof source.lastMessageDay === 'string' ? source.lastMessageDay.slice(0, 20) : null,
    memorials: normalizeMemorials(source.memorials, now),
    lastNotifiedMessageId: typeof source.lastNotifiedMessageId === 'string' ? source.lastNotifiedMessageId.slice(0, 80) : null,
    lastInteractionAt: validTimestamp(source.lastInteractionAt, lastUpdated, now),
    messageLedger: Array.isArray(source.messageLedger)
      ? source.messageLedger.filter((item): item is string => typeof item === 'string' && item.length > 0).slice(0, 80)
      : [],
  }
}
