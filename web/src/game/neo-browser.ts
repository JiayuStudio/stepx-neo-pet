/* =============================================================================
 * 浏览器预览适配器（仅在没有真实 NeoNative 时安装；APK 内绝不覆盖）
 *
 * 复用**同一份 Mori 引擎**（web/src/engine/mori-engine.js，由
 * diandian-native-0.3.2/tools/build-engine.mjs 从 vendor/mori-game 生成，
 * 与 Android 侧 Rhino 运行的是同一份规则代码；`npm run sync:engine` 同步）。
 *
 * 已修复的三个用户可见问题：
 * ① 损坏存档不再让入口黑屏：JSON 解析失败时保留原值到 `.corrupt` 键供恢复，
 *    并以新用户启动，companion 状态里明确提示；
 * ② 旧 Studio 存档（{values:{satiety,mood,energy,intimacy},ts}）按引擎 legacy
 *    契约映射为扁平 {satiety,mood,energy,intimacy,updatedAt} 再传入；
 * ③ 存档页「保存备份文件 / 选择备份文件」在浏览器里真正可用：下载 JSON /
 *    选择文件恢复（200KB 上限 + 覆盖确认），与原生 SAF 行为对齐。
 *
 * 背屏陪伴在浏览器里**不可用**：companion() 永远 running=false 并说明需要
 * 原生 APK，control() 不虚报硬件已启动。
 * ========================================================================== */

import engineSource from '../engine/mori-engine-source'

/** 与 store.ts 中 Window.NeoNative 声明一致的最小形状（这里不重复全局声明） */
interface NeoNativeLike {
  snapshot(): string
  dispatch(action: string, args: string): string
  companion(): string
  control(action: string): void
}

/** 浏览器预览适配器装的是**模拟**桥：真实原生壳没有这个标记。
 *  布局据此区分"原生已处理 insets"与"浏览器预览"，不能只看接口是否存在。 */
interface BrowserPreviewBridge extends NeoNativeLike {
  browserPreview: true
}

/** 浏览器预览存档（与真机存档分开，互不覆盖） */
const BROWSER_SAVE_KEY = 'diandian.mori.browser-save.v1'
/** 损坏存档的保留键（供用户从存档页用备份文件恢复前留存证据） */
const BROWSER_CORRUPT_KEY = 'diandian.mori.browser-save.v1.corrupt'
/** 旧 Studio 宠物存档键（src/shared/lib/storage.ts 的 'app.' 前缀 + 'pet.save.v1'） */
const LEGACY_SAVE_KEY = 'app.pet.save.v1'
/** 与原生 onActivityResult 一致的上限 */
const IMPORT_SIZE_LIMIT = 200_000

const BROWSER_COMPANION_NOTE = '浏览器预览：背屏陪伴需安装「拓麻歌子原生版」APK（Neo 真机）'

interface MoriEngine {
  initGame(saved: string | null, legacy: string | null): string
  snapshotGame(): string
  dispatchGame(action: string, args: string): string
}

/** 引擎是 ES5 脚本（顶层 function 声明）：包进 Function 作用域后再取出，避免污染全局 */
function loadEngine(source: string): MoriEngine {
  const factory = new Function(
    `${source}\n;return { initGame: initGame, snapshotGame: snapshotGame, dispatchGame: dispatchGame };`,
  ) as () => MoriEngine
  return factory()
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 隐私模式 / 配额满：预览不持久化，不影响当次运行
  }
}

function isValidJson(text: string): boolean {
  try {
    const value = JSON.parse(text)
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  } catch {
    return false
  }
}

/**
 * 旧 Studio 存档 → 引擎 legacy 契约的扁平结构。
 * 旧结构：{ values: { satiety, mood, energy, intimacy }, ts, ... }
 * 引擎要：{ satiety, mood, energy, intimacy, updatedAt }
 */
export function mapLegacyStudioSave(raw: string | null): string | null {
  if (!raw || !isValidJson(raw)) return null
  try {
    const old = JSON.parse(raw) as {
      values?: { satiety?: number; mood?: number; energy?: number; intimacy?: number }
      ts?: number
    }
    const values = old.values
    if (!values) return null
    const pick = (value: unknown, fallback: number) =>
      typeof value === 'number' && Number.isFinite(value) ? value : fallback
    return JSON.stringify({
      satiety: pick(values.satiety, 80),
      mood: pick(values.mood, 80),
      energy: pick(values.energy, 80),
      intimacy: pick(values.intimacy, 5),
      updatedAt: typeof old.ts === 'number' && Number.isFinite(old.ts) ? old.ts : Date.now(),
    })
  } catch {
    return null
  }
}

/** svh/lvh/dvh 老内核兜底（与 Studio postcss viewport-unit-polyfill 配对；APK 内同样无害） */
function installViewportUnitsPolyfill(): void {
  const root = document.documentElement
  const apply = () => {
    const unit = window.innerHeight / 100
    root.style.setProperty('--1svh', `${unit}px`)
    root.style.setProperty('--1lvh', `${unit}px`)
    root.style.setProperty('--1dvh', `${unit}px`)
  }
  if (typeof CSS !== 'undefined' && CSS.supports('height', '1dvh')) return // 原生支持：无需兜底
  apply()
  window.addEventListener('resize', apply)
}

/** 安装浏览器适配器；返回是否真正安装（已存在真实 NeoNative 时为 false） */
export function installBrowserNeoNative(): boolean {
  if (typeof window === 'undefined') return false
  if (window.NeoNative) return false // 真机壳已注入：绝不覆盖

  const engine = loadEngine(engineSource)

  // ① 损坏存档：保留原值 + 明确提示，不黑屏
  const rawSave = readStorage(BROWSER_SAVE_KEY)
  let note = BROWSER_COMPANION_NOTE
  let savedForInit: string | null = null
  if (rawSave !== null) {
    if (isValidJson(rawSave)) {
      savedForInit = rawSave
    } else {
      writeStorage(readStorage(BROWSER_CORRUPT_KEY) === null ? BROWSER_CORRUPT_KEY : BROWSER_CORRUPT_KEY + '.' + Date.now(), rawSave)

      note = '检测到预览存档损坏，已保留损坏原值并以新进度启动；可在「存档」页用备份文件恢复'
    }
  }

  const legacy = mapLegacyStudioSave(readStorage(LEGACY_SAVE_KEY))
  try {
    engine.initGame(savedForInit, legacy)
  } catch {
    if (rawSave !== null) writeStorage(BROWSER_CORRUPT_KEY + '.' + Date.now(), rawSave)
    engine.initGame(null, null)
    note = '预览存档无法读取，原值已保留；可在存档页恢复备份'
  }

  const persist = () => writeStorage(BROWSER_SAVE_KEY, engine.snapshotGame())
  persist()

  const native: BrowserPreviewBridge = {
    // 预览模拟桥的显式标记：安全区等布局据此排除"假原生"（companion() 的 preview:true 同义）
    browserPreview: true,
    snapshot: () => engine.snapshotGame(),
    dispatch: (action, args) => {
      try {
        const response = engine.dispatchGame(action, args)
        persist()
        return response
      } catch {
        // 引擎对非法操作会 throw；按 store.ts 的 error 契约返回，不抛出堆栈
        return JSON.stringify({ error: '操作失败，请重试' })
      }
    },
    companion: () => JSON.stringify({ running: false, preview: true, status: note, version: '0.3.4-preview' }),
    control: (action) => {
      if (action === 'export') {
        // ③ 与原生 SAF 导出对齐：下载 JSON 备份
        try {
          const result = JSON.parse(engine.dispatchGame('exportSave', '[]')).result as {
            contents: string
            fileName: string
          }
          const blob = new Blob([result.contents], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = result.fileName || 'diandian-save.json'
          link.click()
          window.setTimeout(() => URL.revokeObjectURL(url), 1000)
          note = '备份文件已开始下载'
        } catch {
          note = '导出备份失败，请重试'
        }
      } else if (action === 'import') {
        // ③ 与原生 SAF 导入对齐：选文件 → 200KB 上限 → 覆盖确认 → 恢复
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'application/json,.json'
        input.onchange = () => {
          const file = input.files?.[0]
          if (!file) return
          if (file.size > IMPORT_SIZE_LIMIT) {
            note = '备份文件过大（上限 200KB）'
            return
          }
          const reader = new FileReader()
          reader.onload = () => {
            const contents = String(reader.result ?? '')
            if (!window.confirm('恢复会替换当前养成进度。继续吗？')) return
            try {
              const response = JSON.parse(engine.dispatchGame('importSave', JSON.stringify([contents])))
              const result = response.result as { ok: boolean; error?: string }
              if (result.ok) { persist(); window.dispatchEvent(new Event('neo-resume')) }
              note = result.ok ? '备份已恢复' : result.error || '恢复失败，原进度保留'
            } catch {
              note = '恢复失败，原进度保留'
            }
          }
          reader.onerror = () => { note = '读取备份失败，原进度保留' }
          reader.readAsText(file)
        }
        input.click()
      } else if (action === 'start') {
        note = '预览模式无法启动背屏：请安装「拓麻歌子原生版」APK 后在 Neo 真机开启'
      } else if (action === 'settings') {
        note = '后台设置为系统项：请在 Neo 真机的原生版内操作'
      } else if (action === 'licenses') {
        note = '开源许可见工程 diandian-native-0.3.2/NOTICE.md'
      } else {
        note = BROWSER_COMPANION_NOTE
      }
    },
  }

  ;(window as unknown as { NeoNative: NeoNativeLike }).NeoNative = native

  installViewportUnitsPolyfill()

  // 前台可见时定期落盘（衰减后的状态也保存，刷新后按时间戳继续结算）
  window.setInterval(() => {
    if (document.visibilityState === 'visible') persist()
  }, 5000)

  return true
}

installBrowserNeoNative()
