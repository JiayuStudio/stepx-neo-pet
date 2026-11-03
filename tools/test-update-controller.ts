/* 0.3.9 检查更新状态机回归：真实组件逻辑（NeoUpdate 使用的控制器），
 * 覆盖 busy、超时后晚到结果、超时后重试、重复点击。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { createUpdateController, type UpdateView } from '../web/src/game/updateController.ts'
import { UPDATE_REQUEST_TIMEOUT_MS, UPDATE_UI_GRACE_MS } from '../web/src/game/updatePolicy.ts'

let checks = 0
const check = (value: boolean, message: string) => { assert.ok(value, message); checks += 1 }
const eq = (actual: unknown, expected: unknown, message: string) => { assert.deepEqual(actual, expected, message); checks += 1 }

/** 可控时钟 + 可编排的桥响应 */
function harness(ack: (requestId: string) => string) {
  const timers: { id: number; at: number; fn: () => void }[] = []
  let seq = 0
  let now = 0
  const starts: string[] = []
  let view: UpdateView = { phase: 'idle' }
  const controller = createUpdateController({
    currentVersion: () => '0.3.9',
    startRequest: (requestId) => { starts.push(requestId); return ack(requestId) },
    onChange: (next) => { view = next },
    setTimer: (fn, ms) => { const id = ++seq; timers.push({ id, at: now + ms, fn }); return id },
    clearTimer: (id) => { const index = timers.findIndex((timer) => timer.id === id); if (index >= 0) timers.splice(index, 1) },
    requestTimeoutMs: UPDATE_REQUEST_TIMEOUT_MS,
    uiGraceMs: UPDATE_UI_GRACE_MS,
  })
  const advance = (ms: number) => {
    now += ms
    for (const timer of [...timers]) {
      if (timer.at <= now) { timers.splice(timers.indexOf(timer), 1); timer.fn() }
    }
  }
  return { controller, get view() { return view }, starts, advance, pending: () => timers.length }
}

const newer = JSON.stringify({ state: 'newer', current: '0.3.9', latest: '1.0.0' })
const latest = JSON.stringify({ state: 'latest', current: '0.3.9', latest: '0.3.9', message: '已是最新版本' })

/* ---- 延迟结果正常采纳 ---- */
{
  const h = harness(() => JSON.stringify({ state: 'checking' }))
  h.controller.check()
  eq(h.view.phase, 'checking', 'enter checking')
  h.advance(5_000)
  check(h.controller.deliver('u1', newer), 'delayed result accepted')
  eq(h.view.phase, 'done', 'settles to done')
  eq((h.view.result as { state: string }).state, 'newer', 'result payload kept')
  eq(h.pending(), 0, 'timer cleared on result')
}

/* ---- 超时后晚到结果必须丢弃 ---- */
{
  const h = harness(() => JSON.stringify({ state: 'checking' }))
  h.controller.check()
  h.advance(UPDATE_REQUEST_TIMEOUT_MS + UPDATE_UI_GRACE_MS)
  eq(h.view.phase, 'done', 'timeout settles')
  check((h.view.result as { message: string }).message.includes('超时'), 'timeout message')
  check(!h.controller.deliver('u1', newer), 'late result after timeout is dropped')
  eq((h.view.result as { state: string }).state, 'error', 'view stays on timeout')
}

/* ---- busy：立即结束，不进入新的等待 ---- */
{
  const h = harness(() => JSON.stringify({ state: 'busy', message: '上一次检查还没结束，请稍后再试' }))
  h.controller.check()
  eq(h.view.phase, 'done', 'busy settles immediately')
  eq(h.pending(), 0, 'busy does not arm a timer')
  check((h.view.result as { message: string }).message.includes('还没结束'), 'busy message surfaced')
}

/* ---- 超时后重试会发起新请求 ---- */
{
  let mode: 'checking' | 'ok' = 'checking'
  const h = harness(() => mode === 'ok' ? JSON.stringify({ state: 'ok' }) : JSON.stringify({ state: 'checking' }))
  h.controller.check()
  h.advance(UPDATE_REQUEST_TIMEOUT_MS + UPDATE_UI_GRACE_MS)
  mode = 'ok'
  h.controller.check()
  eq(h.starts.length, 2, 'retry starts a second request with a new id')
  check(h.starts[0] !== h.starts[1], 'retry uses a new request id')
  check(h.controller.deliver('u2', latest), 'new request result accepted')
  check(!h.controller.deliver('u1', newer), 'old request result still rejected')
}

/* ---- 检查中重复点击不发起新请求 ---- */
{
  const h = harness(() => JSON.stringify({ state: 'checking' }))
  h.controller.check()
  h.controller.check()
  eq(h.starts.length, 1, 'duplicate click while checking does not start another request')
  check((h.view.notice ?? '').includes('还在进行'), 'duplicate click shows a notice')
}

/* ---- 时限关系：UI 必须晚于原生 / 浏览器请求结束 ---- */
{
  const java = readFileSync(new URL('../app/src/com/diandian/neopet/UpdateChecker.java', import.meta.url), 'utf8')
  const match = /TIMEOUT_MS\s*=\s*([\d_]+)/.exec(java)
  check(Boolean(match), 'native timeout constant found')
  eq(Number(String(match?.[1]).replace(/_/g, '')), UPDATE_REQUEST_TIMEOUT_MS, 'native and web share the same request timeout')
  check(UPDATE_UI_GRACE_MS > 0, 'UI grace keeps the UI timeout after the native one')
}

console.log(`${checks} update controller checks passed`)
