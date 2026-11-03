import { useEffect, useRef, useState } from 'react'

import { RELEASES_PAGE_URL, type UpdateResult } from '../game/updatePolicy'
import { createUpdateController, type UpdateView } from '../game/updateController'
import { WEB_APP_VERSION } from '../game/version'

export interface CompanionInfo {
  running: boolean
  status: string
  /** 0.3.9 背屏状态的具体原因（倒扣 / 系统关闭 / 省电 / 过热 / 传感器不可用） */
  reason?: string
  notificationsPermitted?: boolean
  systemQuiet?: boolean
  version: string
  preview?: boolean
}

function useCompanionInfo(): CompanionInfo {
  const [companion, setCompanion] = useState<CompanionInfo>(() => JSON.parse(window.NeoNative.companion()))
  useEffect(() => {
    const timer = window.setInterval(() => setCompanion(JSON.parse(window.NeoNative.companion())), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return companion
}

export function NeoCompanion() {
  const companion = useCompanionInfo()
  const detail = companion.reason && companion.reason !== companion.status ? companion.reason : ''
  return (
    <section className="neo-companion" aria-label="背屏陪伴">
      <div>
        <strong>拓麻歌子 · 背屏陪伴</strong>
        <small>{companion.status}</small>
        {detail && <small className="neo-companion-reason">原因：{detail}</small>}
      </div>
      <button className="neo-toggle" onClick={() => window.NeoNative.control(companion.running ? 'stop' : 'start')}>{companion.running ? '停止陪伴' : '开启背屏'}</button>
      <button onClick={() => window.NeoNative.control('settings')}>后台设置</button>
      <details><summary>使用说明 · {WEB_APP_VERSION}</summary><p>正面与背面共享养成进度。开启背屏后，返回桌面或锁屏仍可陪伴。背屏朝下、系统关闭背屏、省电或过热时会暂停刷新，这里会显示具体原因；强行停止或重启后请重新开启。新领养从蛋开始：呼吸轻晃、出现裂纹、破壳变成你选择的小伙伴，耳机开关也会同步到背屏形象。</p><p>背屏是宠物的像素形象：星跃是圆润软团子（短圆顶角、饱满肚子、贴身短手、白色竖眼、小嘴），方跃是宽扁的像素方块（不对称阶梯头顶、方眼），性格印记和饰品都会跟随正面宠物。轻松模式适合日常陪伴，经典模式有更快的状态衰减。可在「照料」页随时切换 8 位小伙伴（星跃、方跃、芽灵、绒兔、焰狐、泡獭、眠鸮、角龙）与耳机。</p><p>页面底部的“检查更新”只读取公开 GitHub 正式版本，不会自动下载或安装；打开发布页由系统浏览器完成。</p><button onClick={() => window.NeoNative.control('licenses')}>开源许可</button></details>
    </section>
  )
}

/** 独立的页面底部检查更新区。
 *  状态机在 updateController：统一总时限、busy 立即提示、超时后丢弃晚到结果。 */
export function NeoUpdate() {
  const companion = useCompanionInfo()
  const [view, setView] = useState<UpdateView>({ phase: 'idle' })
  const controllerRef = useRef<ReturnType<typeof createUpdateController> | null>(null)

  const currentVersion = companion.preview === true ? WEB_APP_VERSION : (companion.version || WEB_APP_VERSION)
  const checking = view.phase === 'checking'

  useEffect(() => {
    const controller = createUpdateController({
      currentVersion: () => currentVersion,
      startRequest: (requestId) => window.NeoNative.checkUpdate(requestId),
      onChange: (next) => setView(next),
      setTimer: (callback, ms) => window.setTimeout(callback, ms),
      clearTimer: (handle) => window.clearTimeout(handle),
    })
    controllerRef.current = controller
    // 桥在发起时捕获该次回调；这里只按 requestId 转交，过期结果由控制器丢弃
    window.__neoUpdateResult = (requestId, json) => { controller.deliver(requestId, json) }
    return () => {
      controller.dispose()
      controllerRef.current = null
      delete window.__neoUpdateResult
    }
    // currentVersion 随安装包版本变化时重建控制器即可
  }, [currentVersion])

  const check = () => controllerRef.current?.check()
  const open = (url: string) => window.NeoNative.openExternal(url)
  const result = view.result

  return (
    <section className="neo-update-panel" aria-labelledby="app-update-title">
      <h2 id="app-update-title">检查更新</h2>
      <div className="neo-update" aria-label="检查更新">
        <div className="neo-update-meta">
          <small>当前版本 {currentVersion}{companion.preview === true ? ' · 网页预览版' : ' · 已安装原生版'}</small>
          <small>更新源：GitHub 正式 Release（JiayuStudio/stepx-neo-pet）</small>
        </div>
        <button onClick={check} disabled={checking}>{checking ? '检查中…' : '检查更新'}</button>
        {view.notice && <small className="neo-update-notice">{view.notice}</small>}
        {view.phase === 'done' && result?.state === 'latest' && <small>{result.message ?? '已是最新版本'}</small>}
        {view.phase === 'done' && result?.state === 'newer' && (
          <div className="neo-update-newer">
            <small>发现新版本 {result.latest}</small>
            <button onClick={() => result.htmlUrl && open(result.htmlUrl)}>打开发布页</button>
            <button onClick={() => result.apkUrl && open(result.apkUrl)}>下载 APK</button>
            <small>覆盖安装可保留养成存档；若提示签名不一致，请不要卸载，先用「存档」导出备份。</small>
          </div>
        )}
        {view.phase === 'done' && result?.state === 'error' && (
          <div className="neo-update-error">
            <small>{result.message}</small>
            <button onClick={check}>重试</button>
          </div>
        )}
        <button className="neo-update-fallback" onClick={() => open(RELEASES_PAGE_URL)}>版本发布页</button>
      </div>
    </section>
  )
}

export type { UpdateResult }
