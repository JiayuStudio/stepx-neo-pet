/* 0.3.9 检查更新的组件状态机（可注入时钟，便于回归）
 *
 * 解决的问题：
 *  - UI 超时（原 12 秒）比原生请求（20 秒）短，超时后原生仍在跑；
 *  - 重试时原生 CHECKING=true 返回 checking，UI 以为开始了新请求并再等 12 秒，
 *    最终误报"超时"，而真正请求的结果又被旧回调丢弃。
 *
 * 现在的规则：
 *  - 单一总时限 UPDATE_REQUEST_TIMEOUT_MS，UI 再加宽限；
 *  - 原生返回 busy 时立即给出明确提示，不假装开始了新请求；
 *  - 超时即让本次请求失效，晚到的结果按 requestId 丢弃。
 */
import {
  UPDATE_REQUEST_TIMEOUT_MS,
  UPDATE_UI_GRACE_MS,
  type UpdateResult,
} from './updatePolicy.ts'

export type UpdatePhase = 'idle' | 'checking' | 'done'

export interface UpdateView {
  phase: UpdatePhase
  result?: UpdateResult
  notice?: string
}

export interface UpdateControllerDeps {
  currentVersion: () => string
  /** 调用原生/浏览器桥，返回 ack JSON 字符串 */
  startRequest: (requestId: string) => string
  onChange: (view: UpdateView) => void
  setTimer: (callback: () => void, ms: number) => number
  clearTimer: (handle: number) => void
  /** 覆盖总时限（测试用） */
  requestTimeoutMs?: number
  /** 覆盖 UI 宽限（测试用） */
  uiGraceMs?: number
}

export interface UpdateController {
  check: () => void
  /** 桥异步投递结果；返回是否被采纳 */
  deliver: (requestId: string, json: string) => boolean
  dispose: () => void
  view: () => UpdateView
}

export function createUpdateController(deps: UpdateControllerDeps): UpdateController {
  const timeoutMs = deps.requestTimeoutMs ?? UPDATE_REQUEST_TIMEOUT_MS
  const graceMs = deps.uiGraceMs ?? UPDATE_UI_GRACE_MS
  let seq = 0
  let activeId: string | null = null
  let timer: number | null = null
  let view: UpdateView = { phase: 'idle' }

  const publish = (patch: Partial<UpdateView>) => {
    view = { ...view, ...patch }
    deps.onChange(view)
  }
  const clearTimer = () => {
    if (timer !== null) {
      deps.clearTimer(timer)
      timer = null
    }
  }
  const fail = (message: string) => ({
    state: 'error' as const,
    current: deps.currentVersion(),
    message,
  })

  const check = () => {
    if (view.phase === 'checking') {
      // busy：不发起第二个请求，也不进入新的等待
      publish({ notice: '上一次检查还在进行，请稍候再试' })
      return
    }
    const requestId = `u${(seq += 1)}`
    activeId = requestId
    publish({ phase: 'checking', notice: '', result: undefined })

    let ack: { state?: string; message?: string }
    try {
      ack = JSON.parse(deps.startRequest(requestId)) as { state?: string; message?: string }
    } catch {
      ack = { state: 'error', message: '检查入口不可用，请重试' }
    }
    if (ack.state === 'busy') {
      // 原生明确告知仍在检查：立即结束本次尝试，避免再等一个完整超时
      activeId = null
      clearTimer()
      publish({ phase: 'done', result: fail(ack.message || '上一次检查还没结束，请稍后再试') })
      return
    }
    if (ack.state === 'error') {
      activeId = null
      clearTimer()
      publish({ phase: 'done', result: fail(ack.message || '检查入口不可用，请重试') })
      return
    }
    clearTimer()
    timer = deps.setTimer(() => {
      if (activeId !== requestId) return
      activeId = null
      timer = null
      publish({ phase: 'done', result: fail('检查超时，请重试') })
    }, timeoutMs + graceMs)
  }

  const deliver = (requestId: string, json: string) => {
    // 超时后 / 被顶替的晚到结果一律丢弃
    if (activeId !== requestId) return false
    clearTimer()
    activeId = null
    let result: UpdateResult
    try {
      result = JSON.parse(json) as UpdateResult
    } catch {
      result = fail('检查结果无法解析，请重试')
    }
    publish({ phase: 'done', result })
    return true
  }

  const dispose = () => {
    clearTimer()
    activeId = null
  }

  return { check, deliver, dispose, view: () => view }
}
