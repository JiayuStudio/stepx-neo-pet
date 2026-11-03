/* 0.3.9 陪伴生命周期 / 勿扰 / 本地消息 / 通知频控
 *
 * 全部是纯函数，便于用可控时间做回归（不等待真实多日）：
 *  - 生命周期阶段：按真实相处天数计算；默认「温柔陪伴」永不告别
 *  - 生命周期模式：需用户明确选择，从选择的时刻重新起算年龄
 *  - 勿扰：一键静默 + 定时窗口（支持跨午夜、仅工作日）
 *  - 通知：低频 / 普通两档，按本地自然日计数并限制最小间隔
 *  - 消息：只由本地状态推导，不联网、不读通讯录 / 日历 / 健康数据
 */
import type { GameSnapshot, PetNeeds } from './types'

export const DAY_MS = 86_400_000
export const HOUR_MS = 3_600_000

/* ------------------------------------------------------------------ *
 * 生命周期
 * ------------------------------------------------------------------ */
export type LifeMode = 'gentle' | 'cycle'
export type LifeStage = 'child' | 'adult' | 'elder' | 'twilight' | 'farewell'

export const LIFE_CHILD_DAYS = 3
export const LIFE_ADULT_DAYS = 21
export const LIFE_TWILIGHT_DAYS = 55
export const LIFE_FAREWELL_DAYS = 60

export interface LifeStageInfo {
  stage: LifeStage
  /** 相处天数（从生命周期起点或领养起算） */
  days: number
  name: string
  note: string
}

const STAGE_COPY: Record<LifeStage, { name: string; note: string }> = {
  child: { name: '幼年', note: '还在熟悉这个世界，多陪它说说话就很好。' },
  adult: { name: '成年', note: '最自在的年纪，喜欢和你一起做点小事。' },
  elder: { name: '老年', note: '步子慢下来了，安静待着也很舒服。' },
  twilight: { name: '暮年', note: '它开始喜欢晒太阳和旧回忆，按自己的节奏就好。' },
  farewell: { name: '告别后', note: '它把相处的日子留在了纪念里。' },
}

/** 相处天数：生命周期模式从选择时刻起算，其它模式按领养以来的真实时间 */
export const lifeDays = (snapshot: Pick<GameSnapshot, 'lifeMode' | 'lifeStartedAt' | 'ageMinutes' | 'lastUpdated'>, now: number): number => {
  if (snapshot.lifeMode === 'cycle' && snapshot.lifeStartedAt !== null) {
    return Math.max(0, Math.floor((Math.max(now, snapshot.lifeStartedAt) - snapshot.lifeStartedAt) / DAY_MS))
  }
  return Math.max(0, Math.floor((snapshot.ageMinutes * 60_000) / DAY_MS))
}

/** 温情模式的阶段：幼年 → 成年 → 老年；不会告别 */
export const lifeStage = (snapshot: Pick<GameSnapshot, 'lifeMode' | 'lifeStartedAt' | 'ageMinutes' | 'lastUpdated' | 'farewellAt'>, now: number): LifeStageInfo => {
  if (snapshot.farewellAt !== null) {
    const days = lifeDays(snapshot, snapshot.farewellAt)
    return { stage: 'farewell', days, ...STAGE_COPY.farewell }
  }
  const days = lifeDays(snapshot, now)
  const cycle = snapshot.lifeMode === 'cycle'
  if (days >= LIFE_ADULT_DAYS) {
    const stage: LifeStage = cycle && days >= LIFE_TWILIGHT_DAYS ? 'twilight' : 'elder'
    return { stage, days, ...STAGE_COPY[stage] }
  }
  if (days >= LIFE_CHILD_DAYS) return { stage: 'adult', days, ...STAGE_COPY.adult }
  return { stage: 'child', days, ...STAGE_COPY.child }
}

/** 是否到了自然告别的时刻（仅生命周期模式，且必须已过完整告别门槛） */
export const shouldFarewell = (
  snapshot: Pick<GameSnapshot, 'lifeMode' | 'lifeStartedAt' | 'farewellAt' | 'hatched'>,
  now: number,
): boolean => (
  snapshot.hatched
  && snapshot.lifeMode === 'cycle'
  && snapshot.farewellAt === null
  && snapshot.lifeStartedAt !== null
  && now - snapshot.lifeStartedAt >= LIFE_FAREWELL_DAYS * DAY_MS
)

/** 切换生命周期模式时的年龄起点：进入 cycle 一律从此刻重新起算，不用旧档年龄判死 */
export const lifeStartForMode = (mode: LifeMode, now: number): number | null => (mode === 'cycle' ? now : null)

export const lifeStageCopy = (stage: LifeStage) => STAGE_COPY[stage]

/** 永久纪念：告别或重新领养时写入，不会被新伙伴覆盖 */
export interface MemorialEntry {
  id: string
  at: number
  petName: string
  character: string
  days: number
  bond: number
  growthPoints: number
  storyIndex: number
  /** 告别 / 重新领养 */
  reason: 'farewell' | 'rehomed'
}


export const pushMemorial = (existing: readonly MemorialEntry[], entry: MemorialEntry): MemorialEntry[] => (
  [entry, ...existing.filter((item) => item.id !== entry.id)]
)

/* ------------------------------------------------------------------ *
 * 勿扰
 * ------------------------------------------------------------------ */
export interface QuietSettings {
  /** 一键勿扰（用户手动） */
  manual: boolean
  /** 定时勿扰开关 */
  schedule: boolean
  /** 起点分钟数（0..1439） */
  startMinute: number
  endMinute: number
  /** 仅工作日（周一至周五）生效 */
  weekdaysOnly: boolean
}

export const DEFAULT_QUIET: QuietSettings = {
  manual: false,
  schedule: true,
  startMinute: 22 * 60,
  endMinute: 8 * 60,
  weekdaysOnly: false,
}

export const clampMinute = (value: unknown, fallback: number): number => {
  const number = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback
  return Math.max(0, Math.min(1439, number))
}

export const formatMinute = (minute: number) => {
  const hour = Math.floor(minute / 60) % 24
  const rest = minute % 60
  return `${String(hour).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export interface QuietState {
  quiet: boolean
  reason: string
}

const localParts = (timestamp: number) => {
  const date = new Date(timestamp)
  return {
    minute: date.getHours() * 60 + date.getMinutes(),
    weekday: date.getDay(),
    dayKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
  }
}

/** 定时窗口：跨午夜用两段区间表示 */
const isWeekday = (weekday: number) => weekday >= 1 && weekday <= 5

/** 定时勿扰窗口。
 *  - 起止相同视为「全天勿扰」（开启即整段静默），避免含糊的保存结果；
 *  - 跨午夜窗口归属**开始日**：周五 22:00–周六 08:00 算工作日，
 *    周日 22:00 不生效、周一 00:00 也不生效（归周日）。 */
export const inScheduledQuiet = (quiet: QuietSettings, timestamp: number): boolean => {
  if (!quiet.schedule) return false
  const { minute, weekday } = localParts(timestamp)
  if (quiet.startMinute === quiet.endMinute) {
    return !quiet.weekdaysOnly || isWeekday(weekday)
  }
  if (quiet.startMinute < quiet.endMinute) {
    if (quiet.weekdaysOnly && !isWeekday(weekday)) return false
    return minute >= quiet.startMinute && minute < quiet.endMinute
  }
  if (minute >= quiet.startMinute) return !quiet.weekdaysOnly || isWeekday(weekday)
  if (minute < quiet.endMinute) {
    // 这段属于前一天开启的窗口：工作日判定看开始日
    const startWeekday = (weekday + 6) % 7
    return !quiet.weekdaysOnly || isWeekday(startWeekday)
  }
  return false
}

export const quietStateAt = (quiet: QuietSettings, timestamp: number): QuietState => {
  if (quiet.manual) return { quiet: true, reason: '已开启一键勿扰' }
  if (inScheduledQuiet(quiet, timestamp)) {
    return {
      quiet: true,
      reason: quiet.startMinute === quiet.endMinute
        ? `全天勿扰${quiet.weekdaysOnly ? '（仅工作日）' : ''}`
        : `定时勿扰 ${formatMinute(quiet.startMinute)}–${formatMinute(quiet.endMinute)}${quiet.weekdaysOnly ? '（仅工作日）' : ''}`,
    }
  }
  if (quiet.schedule) {
    return {
      quiet: false,
      reason: quiet.startMinute === quiet.endMinute
        ? `全天勿扰未生效${quiet.weekdaysOnly ? '（仅工作日）' : ''}`
        : `定时勿扰未生效 · ${formatMinute(quiet.startMinute)}–${formatMinute(quiet.endMinute)}${quiet.weekdaysOnly ? '（仅工作日）' : ''}`,
    }
  }
  return { quiet: false, reason: '未开启勿扰' }
}

/** 勿扰只让通知安静，不停止背屏陪伴 */
export const quietKeepsCompanion = true

/* ------------------------------------------------------------------ *
 * 通知频控
 * ------------------------------------------------------------------ */
export type NotifyFrequency = 'low' | 'normal'

export interface NotifySettings {
  enabled: boolean
  /** 轻震动（可选，仍受系统勿扰约束） */
  vibrate: boolean
  frequency: NotifyFrequency
  /** 本地自然日内已发送条数 */
  sentCount: number
  /** 计数所属本地自然日的 0 点时间戳 */
  windowStartedAt: number
  lastSentAt: number | null
}

export const DEFAULT_NOTIFY: NotifySettings = {
  enabled: false,
  vibrate: false,
  frequency: 'low',
  sentCount: 0,
  windowStartedAt: 0,
  lastSentAt: null,
}

export const NOTIFY_LIMITS: Record<NotifyFrequency, { max: number; gapMs: number; label: string }> = {
  low: { max: 2, gapMs: 6 * HOUR_MS, label: '低频：每天最多 2 条，间隔至少 6 小时' },
  normal: { max: 4, gapMs: 3 * HOUR_MS, label: '普通：每天最多 4 条，间隔至少 3 小时' },
}

export const startOfLocalDay = (timestamp: number): number => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** 把计数窗口推进到「今天」；跨重启 / 跨天都能自愈 */
export const rollNotifyWindow = (notify: NotifySettings, now: number): NotifySettings => {
  const today = startOfLocalDay(now)
  if (notify.windowStartedAt >= today && notify.windowStartedAt <= now) return notify
  return { ...notify, sentCount: 0, windowStartedAt: today }
}

export interface NotifyDecision {
  ok: boolean
  reason: string
  /** 已按今天校准过的设置（调用方应写回） */
  settings: NotifySettings
}

/** 判断现在是否允许主动发一条通知。用户主动操作不经过这里，因此不占限额。 */
export const canSendNotification = (
  notify: NotifySettings,
  quiet: QuietSettings,
  now: number,
  systemQuiet: boolean,
): NotifyDecision => {
  const settings = rollNotifyWindow(notify, now)
  if (!settings.enabled) return { ok: false, reason: '未开启主动通知', settings }
  if (systemQuiet) return { ok: false, reason: '系统勿扰中，消息留在应用内', settings }
  const quietNow = quietStateAt(quiet, now)
  if (quietNow.quiet) return { ok: false, reason: `${quietNow.reason}，消息留在应用内`, settings }
  const limit = NOTIFY_LIMITS[settings.frequency]
  if (settings.sentCount >= limit.max) return { ok: false, reason: `今天已发送 ${settings.sentCount} 条，达到上限`, settings }
  if (settings.lastSentAt !== null && now - settings.lastSentAt < limit.gapMs) {
    return { ok: false, reason: '距离上一条通知还不到最小间隔', settings }
  }
  return { ok: true, reason: '可以发送', settings }
}

export const markNotificationSent = (settings: NotifySettings, now: number): NotifySettings => ({
  ...rollNotifyWindow(settings, now),
  sentCount: rollNotifyWindow(settings, now).sentCount + 1,
  lastSentAt: now,
})

/* ------------------------------------------------------------------ *
 * 本地消息
 * ------------------------------------------------------------------ */
export type PetMessageKind = 'morning' | 'night' | 'miss' | 'care' | 'recover' | 'growth' | 'farewell' | 'idle'
export type MessageScene = 'idle' | 'eat' | 'sleep' | 'pet' | 'happy' | 'hungry' | 'unhappy' | 'sick' | 'dead' | 'walk'

export interface PetMessage {
  id: string
  kind: PetMessageKind
  at: number
  text: string
  action: MessageScene
}

export const MESSAGE_SCENE: Record<PetMessageKind, MessageScene> = {
  morning: 'happy',
  night: 'sleep',
  miss: 'pet',
  care: 'unhappy',
  recover: 'happy',
  growth: 'happy',
  farewell: 'dead',
  idle: 'idle',
}

const messageDayKey = (timestamp: number) => localParts(timestamp).dayKey

/** 消息账本上限：足够覆盖近期事件，同时避免存档膨胀 */
export const MESSAGE_LEDGER_LIMIT = 80

/**
 * 事件只记录一次：同 id 的新事件不会覆盖旧时间戳，也不会在清空消息列表后重放。
 * ledger 是持久化的「已产生事件 id」，messages 只是展示用的近期记录。
 */
export const mergeMessages = (
  existing: readonly PetMessage[],
  incoming: readonly PetMessage[],
  ledger: readonly string[],
): { messages: PetMessage[]; ledger: string[]; added: PetMessage[] } => {
  const seen = new Set(ledger)
  const added: PetMessage[] = []
  for (const item of incoming) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    added.push(item)
  }
  const messages = [...added, ...existing]
    .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index)
    .sort((a, b) => b.at - a.at)
    .slice(0, 20)
  const nextLedger = [...added.map((item) => item.id), ...ledger].slice(0, MESSAGE_LEDGER_LIMIT)
  return { messages, ledger: nextLedger, added }
}

interface MessageContext {
  previous: Pick<GameSnapshot, 'needs' | 'lastUpdated' | 'lastInteractionAt' | 'healthBand' | 'lifeMode' | 'lifeStartedAt' | 'ageMinutes' | 'farewellAt' | 'hatched'>
  next: Pick<GameSnapshot, 'needs' | 'healthBand' | 'farewellAt'>
  now: number
  stageChanged: boolean
  stageName: string
}

/** 由状态推导消息：同一天同一类只产生一条 */
export const composeMessages = (context: MessageContext): PetMessage[] => {
  const { previous, next, now, stageChanged, stageName } = context
  const day = messageDayKey(now)
  const hour = new Date(now).getHours()
  const out: PetMessage[] = []
  const add = (kind: PetMessageKind, text: string, action: MessageScene = MESSAGE_SCENE[kind]) => out.push({ id: `${kind}:${day}`, kind, at: now, text, action })

  if (next.farewellAt !== null) {
    if (previous.farewellAt === null) add('farewell', '它安静地睡着了。相处的日子都留在纪念里。')
    return out
  }
  if (!previous.hatched) return out

  if (hour >= 6 && hour < 11) add('morning', '早安呀，今天也一起慢慢过。')
  if (hour >= 21) add('night', '夜深了，我把灯调暗一点，陪你到困为止。')

  // 想念看的是「上次互动」，不是每秒推进的 lastUpdated
  const away = Math.max(0, now - previous.lastInteractionAt)
  if (away >= 6 * HOUR_MS) add('miss', '有一阵子没见到你了，我一直在这里等你。')

  const needs = next.needs
  if (needs.health < 30) add('care', '今天有点不舒服，安静陪一会儿就好。', 'sick')
  else if (needs.hunger < 24) add('care', '肚子在轻轻叫，想吃点东西。', 'hungry')
  else if (needs.hygiene < 20) add('care', '身上有点黏糊糊的，想洗个泡泡澡。')
  else if (needs.energy < 20) add('care', '眼皮有点沉，想靠着你打个盹。', 'sleep')

  if (previous.healthBand === 'low' && next.healthBand === 'ok') add('recover', '感觉好多了，谢谢你一直照顾我。')
  if (stageChanged) add('growth', `今天是新的阶段：${stageName}。我们一起继续走吧。`)


  const priority: PetMessageKind[] = ['farewell','recover','growth','care','miss','morning','night','idle']
  return out.sort((a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind))
}

/** 当前是否处于「需要照料」的明显状态（用于状态显示，不产生内疚文案） */
export const needsAttention = (needs: PetNeeds) => (
  needs.health < 30 || needs.hunger < 24 || needs.hygiene < 20 || needs.energy < 20 || needs.joy < 24
)

/** 成长期望节奏说明（设置页展示） */
export const LIFE_RHYTHM = `幼年 0–${LIFE_CHILD_DAYS} 天 · 成年 ${LIFE_CHILD_DAYS}–${LIFE_ADULT_DAYS} 天 · 老年 ${LIFE_ADULT_DAYS} 天起`
export const CYCLE_RHYTHM = `生命周期模式：${LIFE_TWILIGHT_DAYS} 天起进入暮年，${LIFE_FAREWELL_DAYS} 天自然告别`
