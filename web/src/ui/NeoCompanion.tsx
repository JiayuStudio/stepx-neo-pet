import { useEffect, useRef, useState } from 'react'

import { RELEASES_PAGE_URL, type UpdateResult } from '../game/updatePolicy'
import { WEB_APP_VERSION } from '../game/version'

interface CompanionInfo {
  running: boolean
  status: string
  version: string
  preview?: boolean
}

interface UpdateView {
  phase: 'idle' | 'checking' | 'done'
  result?: UpdateResult
}

const CHECK_TIMEOUT_MS = 12_000

function useCompanionInfo() {
  const [companion, setCompanion] = useState<CompanionInfo>(() => JSON.parse(window.NeoNative.companion()))
  useEffect(() => {
    const timer = window.setInterval(() => setCompanion(JSON.parse(window.NeoNative.companion())), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return companion
}

export function NeoCompanion() {
  const companion = useCompanionInfo()
  return (
    <section className="neo-companion" aria-label="背屏陪伴">
      <div><strong>拓麻歌子 · 背屏陪伴</strong><small>{companion.status}</small></div>
      <button className="neo-toggle" onClick={() => window.NeoNative.control(companion.running ? 'stop' : 'start')}>{companion.running ? '停止陪伴' : '开启背屏'}</button>
      <button onClick={() => window.NeoNative.control('settings')}>后台设置</button>
      <details><summary>使用说明 · {WEB_APP_VERSION}</summary><p>正面与背面共享养成进度。开启背屏后，返回桌面或锁屏仍可陪伴。背屏朝下、省电或过热时会暂停显示；强行停止或重启后请重新开启。新领养从蛋开始：呼吸轻晃、出现裂纹、破壳变成你选择的小伙伴，耳机开关也会同步到背屏形象。</p><p>背屏是宠物的像素形象：星跃是圆润软团子（短圆顶角、饱满肚子、贴身短手、白色竖眼、小嘴），方跃是宽扁的像素方块（不对称阶梯头顶、方眼），性格印记和饰品都会跟随正面宠物。轻松模式适合日常陪伴，经典模式有更快的状态衰减。可在「照料」页随时切换 8 位小伙伴（星跃、方跃、芽灵、绒兔、焰狐、泡獭、眠鸮、角龙）与耳机。</p><p>页面底部的“检查更新”只读取公开 GitHub 正式版本，不会自动下载或安装；打开发布页由系统浏览器完成。</p><button onClick={() => window.NeoNative.control('licenses')}>开源许可</button></details>
    </section>
  )
}


/** 独立的页面底部检查更新区。
 *  检查只读公开 GitHub 正式 Release；原生走 NeoNative 桥异步校验，
 *  网页预览用同一套策略直连公开 API，并明确标注"网页预览版"。
 *  结果按请求序号投放：界面退出、或被更新的请求顶替的迟到结果都会丢弃。 */
export function NeoUpdate() {
  const companion = useCompanionInfo()
  const [update, setUpdate] = useState<UpdateView>({ phase: 'idle' })
  const [notice, setNotice] = useState('')
  const mounted = useRef(true)
  const timeoutRef = useRef(0)
  const seqRef = useRef(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(timeoutRef.current)
      delete window.__neoUpdateResult
    }
  }, [])


  // 预览版：用可比较的真实版本号（WEB_APP_VERSION），预览标注单独显示；
  // 原生版：用应用包真实 versionName（桥返回），检查更新与显示同源。
  const currentVersion = companion.preview === true ? WEB_APP_VERSION : (companion.version || WEB_APP_VERSION)
  const checking = update.phase === 'checking'

  const check = () => {
    if (checking) {
      // busy 重试：明确提示，不静默吞掉
      setNotice('检查进行中，请稍后再试')
      return
    }
    const requestId = `u${(seqRef.current += 1)}`
    const mySeq = seqRef.current
    setNotice('')
    setUpdate({ phase: 'checking' })
    // 该次检查的回调按 requestId 安装：桥在发起时捕获它，
    // 超时 / 被新请求顶替 / 界面退出时旧结果都被丢弃，不会进新请求。
    window.__neoUpdateResult = (id: string, json: string) => {
      // 双重校验：桥传回的 id 是本次请求，且没有更新的请求顶替（seqRef 仍指向本次）
      if (!mounted.current || id !== requestId || seqRef.current !== mySeq) return
      window.clearTimeout(timeoutRef.current)
      let result: UpdateResult
      try {
        result = JSON.parse(json) as UpdateResult
      } catch {
        result = { state: 'error', current: currentVersion, message: '检查结果无法解析，请重试' }
      }
      setUpdate({ phase: 'done', result })
    }
    let ack: { state?: string; message?: string }
    try {
      ack = JSON.parse(window.NeoNative.checkUpdate(requestId))
    } catch {
      ack = { state: 'error', message: '检查入口不可用，请重试' }
    }
    if (ack.state === 'error') {
      window.clearTimeout(timeoutRef.current)
      setUpdate({ phase: 'done', result: { state: 'error', current: currentVersion, message: ack.message } })
      return
    }
    // UI 超时兜底：12 秒没有结果就提示重试（后台请求由 AbortController / 原生 deadline 中止）
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => {
      if (!mounted.current) return
      // 该请求已失效（超时）：后续到达的旧结果按 requestId 丢弃
      setUpdate({ phase: 'done', result: { state: 'error', current: currentVersion, message: '检查超时，请重试' } })
    }, CHECK_TIMEOUT_MS)
  }

  const open = (url: string) => window.NeoNative.openExternal(url)
  const result = update.result

  return (
    <section className="neo-update-panel" aria-labelledby="app-update-title">
      <h2 id="app-update-title">检查更新</h2>
      <div className="neo-update" aria-label="检查更新">
        <div className="neo-update-meta">
          <small>当前版本 {currentVersion}{companion.preview === true ? ' · 网页预览版' : ' · 已安装原生版'}</small>
          <small>更新源：GitHub 正式 Release（JiayuStudio/stepx-neo-pet）</small>
        </div>
        <button onClick={check} disabled={checking}>{checking ? '检查中…' : '检查更新'}</button>
        {notice && <small className="neo-update-notice">{notice}</small>}
        {update.phase === 'done' && result?.state === 'latest' && <small>{result.message ?? '已是最新版本'}</small>}
        {update.phase === 'done' && result?.state === 'newer' && (
          <div className="neo-update-newer">
            <small>发现新版本 {result.latest}</small>
            <button onClick={() => result.htmlUrl && open(result.htmlUrl)}>打开发布页</button>
            <button onClick={() => result.apkUrl && open(result.apkUrl)}>下载 APK</button>
            <small>覆盖安装可保留养成存档；若提示签名不一致，请不要卸载，先用「存档」导出备份。</small>
          </div>
        )}
        {update.phase === 'done' && result?.state === 'error' && (
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
