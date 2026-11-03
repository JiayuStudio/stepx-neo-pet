/* 0.3.9 生命周期 / 勿扰 / 通知频控 / 消息账本的纯函数回归。
 * 全部使用可控时间，不需要等待真实多日。 */
import assert from 'node:assert/strict'

import {
  DEFAULT_NOTIFY,
  DEFAULT_QUIET,
  canSendNotification,
  inScheduledQuiet,
  lifeStage,
  markNotificationSent,
  mergeMessages,
  quietStateAt,
  shouldFarewell,
  type PetMessage,
} from '../vendor/mori-game/companion-life.ts'

let checks = 0
const check = (value: boolean, message: string) => { assert.ok(value, message); checks += 1 }
const eq = (actual: unknown, expected: unknown, message: string) => { assert.deepEqual(actual, expected, message); checks += 1 }

/* ---- 跨午夜窗口归属开始日 ---- */
const quiet = { ...DEFAULT_QUIET, schedule: true, startMinute: 22 * 60, endMinute: 8 * 60, weekdaysOnly: true }
// 2026-11-06 周五, 2026-11-07 周六, 2026-11-08 周日, 2026-11-09 周一
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).getTime()
check(inScheduledQuiet(quiet, at(6, 22)), 'Friday 22:00 opens the window')
check(inScheduledQuiet(quiet, at(7, 0)), 'Saturday 00:00 belongs to Friday')
check(inScheduledQuiet(quiet, at(7, 7, 59)), 'Saturday 07:59 still quiet (started Friday)')
check(!inScheduledQuiet(quiet, at(7, 8)), 'Saturday 08:00 window ends')
check(!inScheduledQuiet(quiet, at(8, 22)), 'Sunday 22:00 does not open')
check(!inScheduledQuiet(quiet, at(9, 0)), 'Monday 00:00 belongs to Sunday, does not open')
check(inScheduledQuiet(quiet, at(9, 22)), 'Monday 22:00 opens again')
check(!inScheduledQuiet(quiet, at(9, 12)), 'Weekday daytime is not quiet')
// 非工作日限制时：周末任意时间都可生效
const everyDay = { ...quiet, weekdaysOnly: false }
check(inScheduledQuiet(everyDay, at(8, 22)), 'Sunday 22:00 quiet when weekdaysOnly=false')
// 起止相同 = 全天勿扰
const allDay = { ...DEFAULT_QUIET, schedule: true, startMinute: 600, endMinute: 600, weekdaysOnly: false }
check(inScheduledQuiet(allDay, at(9, 12)), 'equal start/end means all-day quiet')
check(quietStateAt(allDay, at(9, 12)).reason.includes('全天勿扰'), 'all-day reason is explicit')
// 普通日间窗口
const dayWindow = { ...DEFAULT_QUIET, schedule: true, startMinute: 12 * 60, endMinute: 14 * 60, weekdaysOnly: false }
check(inScheduledQuiet(dayWindow, at(9, 13)), 'same-day window inside')
check(!inScheduledQuiet(dayWindow, at(9, 14)), 'same-day window is half-open')

/* ---- 通知频控 ---- */
const noon = at(9, 12)
let notify = { ...DEFAULT_NOTIFY, enabled: true, frequency: 'low' as const, windowStartedAt: 0, sentCount: 0, lastSentAt: null }
const first = canSendNotification(notify, { ...DEFAULT_QUIET, schedule: false }, noon, false)
check(first.ok, 'first low-frequency notification allowed')
notify = markNotificationSent(first.settings, noon)
eq(notify.sentCount, 1, 'sent count increments')
const tooSoon = canSendNotification(notify, { ...DEFAULT_QUIET, schedule: false }, noon + 3 * 3_600_000, false)
check(!tooSoon.ok, 'low frequency enforces 6h gap')
const later = canSendNotification(notify, { ...DEFAULT_QUIET, schedule: false }, noon + 6 * 3_600_000, false)
check(later.ok, 'allowed after 6h')
notify = markNotificationSent(later.settings, noon + 6 * 3_600_000)
eq(notify.sentCount, 2, 'second send recorded')
const cappedState = { ...notify, sentCount: 2, lastSentAt: noon - 7 * 3_600_000 }
const capped = canSendNotification(cappedState, { ...DEFAULT_QUIET, schedule: false }, noon, false)
check(!capped.ok && capped.reason.includes('上限'), 'low frequency capped at 2/day')
// 次日重置
const nextDay = canSendNotification(notify, { ...DEFAULT_QUIET, schedule: false }, at(10, 12), false)
check(nextDay.ok && nextDay.settings.sentCount === 0, 'counter resets on a new local day')
// 普通频率 4 次 / 3 小时
let normal = { ...DEFAULT_NOTIFY, enabled: true, frequency: 'normal' as const, windowStartedAt: 0, sentCount: 0, lastSentAt: null }
for (let index = 0; index < 4; index += 1) {
  const decision = canSendNotification(normal, { ...DEFAULT_QUIET, schedule: false }, noon + index * 3 * 3_600_000, false)
  check(decision.ok, `normal send ${index + 1} allowed`)
  normal = markNotificationSent(decision.settings, noon + index * 3 * 3_600_000)
}
const normalCapped = canSendNotification({ ...normal, sentCount: 4, lastSentAt: noon - 4 * 3_600_000 }, { ...DEFAULT_QUIET, schedule: false }, noon, false)
check(!normalCapped.ok && normalCapped.reason.includes('上限'), 'normal capped at 4/day')
// 系统勿扰与手动勿扰
check(!canSendNotification({ ...DEFAULT_NOTIFY, enabled: true }, { ...DEFAULT_QUIET, schedule: false }, noon, true).ok, 'system DND blocks')
check(!canSendNotification({ ...DEFAULT_NOTIFY, enabled: true }, { ...DEFAULT_QUIET, manual: true }, noon, false).ok, 'manual quiet blocks')

/* ---- 消息账本 ---- */
const msg = (id: string, at2: number): PetMessage => ({ id, kind: 'morning', at: at2, text: 'hello', action: 'happy' })
const firstMerge = mergeMessages([], [msg('morning:day1', 1000)], [])
eq(firstMerge.messages.length, 1, 'first event recorded')
const secondMerge = mergeMessages(firstMerge.messages, [msg('morning:day1', 5000)], firstMerge.ledger)
eq(secondMerge.messages[0].at, 1000, 'duplicate id keeps the original timestamp')
eq(secondMerge.messages.length, 1, 'duplicate id not added twice')
// 清空列表后不重放
const cleared = mergeMessages([], [msg('morning:day1', 9000)], secondMerge.ledger)
eq(cleared.messages.length, 0, 'clearing the list does not replay consumed events')
eq(cleared.ledger.length, 1, 'ledger survives clearing')
// 新事件仍然记录
const freshEvent = mergeMessages(cleared.messages, [msg('night:day1', 9000)], cleared.ledger)
eq(freshEvent.messages.length, 1, 'new events still recorded after clear')

/* ---- 生命周期 ---- */
const base = { lifeMode: 'gentle' as const, lifeStartedAt: null, ageMinutes: 0, lastUpdated: noon, farewellAt: null, hatched: true }
eq(lifeStage(base, noon).stage, 'child', 'gentle starts as child')
eq(lifeStage({ ...base, ageMinutes: 3 * 24 * 60 }, noon).stage, 'adult', 'day 3 becomes adult')
eq(lifeStage({ ...base, ageMinutes: 21 * 24 * 60 }, noon).stage, 'elder', 'day 21 becomes elder')
// 温柔模式永不告别
check(!shouldFarewell({ ...base, ageMinutes: 999 * 24 * 60 }, noon), 'gentle mode never says farewell')
const cycle = { ...base, lifeMode: 'cycle' as const, lifeStartedAt: noon }
check(!shouldFarewell(cycle, noon + 59 * 86_400_000), 'cycle mode not farewell before 60 days')
check(shouldFarewell(cycle, noon + 60 * 86_400_000), 'cycle mode farewell at 60 days')
eq(lifeStage(cycle, noon + 56 * 86_400_000).stage, 'twilight', 'cycle enters twilight at 55 days')
// 旧存档年龄不会立刻触发：进入 cycle 时 lifeStartedAt=now
check(!shouldFarewell({ ...base, ageMinutes: 9999 * 24 * 60, lifeMode: 'cycle', lifeStartedAt: noon }, noon + 86_400_000), 'old ageMinutes cannot trigger farewell after switching')

console.log(`${checks} lifecycle/quiet/notify checks passed`)
