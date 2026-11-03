import { useEffect, useState } from 'react'

import {
  CYCLE_RHYTHM,
  LIFE_RHYTHM,
  formatMinute,
  lifeStage,
  quietStateAt,
} from '../../../vendor/mori-game/companion-life'
import type { GameSnapshot } from '../game/types'
import { PRIVACY_SECTIONS, PRIVACY_TITLE } from './privacy'

interface Props {
  game: GameSnapshot & {
    setLifeMode: (mode: 'gentle' | 'cycle') => void
    setQuiet: (patch: Record<string, unknown>) => void
    setNotify: (patch: Record<string, unknown>) => void
    clearMessages: () => void
    adoptAgain: () => void
  }
}

const toMinute = (value: string, fallback: number) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return fallback
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return fallback
  return hour * 60 + minute
}

/** 0.3.9 陪伴设置：生命周期、勿扰、通知、消息中心与隐私说明 */
export function CompanionSettings({ game }: Props) {
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [bridge, setBridge] = useState<{ notificationsPermitted?: boolean; systemQuiet?: boolean }>({})
  useEffect(() => {
    const read = () => {
      try {
        const info = JSON.parse(window.NeoNative.companion()) as { notificationsPermitted?: boolean; systemQuiet?: boolean }
        setBridge({ notificationsPermitted: info.notificationsPermitted === true, systemQuiet: info.systemQuiet === true })
      } catch {
        setBridge({})
      }
    }
    read()
    const timer = window.setInterval(read, 3000)
    return () => window.clearInterval(timer)
  }, [])
  const notificationsPermitted = bridge.notificationsPermitted === true
  const systemQuiet = bridge.systemQuiet === true
  const preview = window.NeoNative.browserPreview === true
  const now = Date.now()
  const stage = lifeStage(game, now)
  const quiet = quietStateAt(game.quiet, now)
  const farewell = game.farewellAt !== null

  const switchMode = (mode: 'gentle' | 'cycle') => {
    if (farewell) return
    if (mode === 'cycle' && !window.confirm('生命周期模式会让它经历幼年、成年、老年，并在满 60 天后自然告别。告别后不能再互动，只能回看纪念。\n\n年龄会从今天重新起算，旧存档的年龄不会立刻触发告别。要开启吗？')) return
    game.setLifeMode(mode)
  }

  const adopt = () => {
    if (!window.confirm('重新领养会开始一位新的小伙伴；当前伙伴的相处记录会写入纪念保留，不会被静默删除。确定继续吗？')) return
    game.adoptAgain()
  }

  const toggleNotify = () => {
    if (!game.notify.enabled) {
      // 开启前先说清楚用途，并请求系统通知权限（浏览器预览没有该权限）
      window.NeoNative.control('notificationPermission')
    }
    game.setNotify({ enabled: !game.notify.enabled })
  }

  return (
    <section className="companion-settings" aria-labelledby="companion-settings-title">
      <h2 id="companion-settings-title">陪伴设置</h2>

      <article className="settings-card" aria-labelledby="life-title">
        <h3 id="life-title">生命周期 · {stage.name}</h3>
        <p className="settings-note">
          已经一起过了 {stage.days} 天。{stage.note}
        </p>
        <p className="settings-note small">节奏：{LIFE_RHYTHM}。默认的温柔陪伴不会告别。</p>
        <div className="settings-row">
          <button type="button" className={game.lifeMode === 'gentle' ? 'active' : ''} onClick={() => switchMode('gentle')} disabled={farewell} aria-pressed={game.lifeMode === 'gentle'}>
            温柔陪伴
          </button>
          <button type="button" className={game.lifeMode === 'cycle' ? 'active' : ''} onClick={() => switchMode('cycle')} disabled={farewell} aria-pressed={game.lifeMode === 'cycle'}>
            生命周期模式
          </button>
        </div>
        <p className="settings-note small">{game.lifeMode === 'cycle' ? CYCLE_RHYTHM : '温柔陪伴：不会因为离线、工作或勿扰而离开。'}</p>
        {farewell && (
          <p className="settings-note">
            它已经安静地告别了。相处的记录都在下面，可以随时回看。
          </p>
        )}
        <div className="settings-row">
          <button type="button" onClick={adopt}>{farewell ? '重新领养一位小伙伴' : '重新领养（会先确认）'}</button>
        </div>
      </article>

      {game.memorials.length > 0 && (
        <article className="settings-card" aria-labelledby="memorial-title">
          <h3 id="memorial-title">纪念</h3>
          <ul className="memorial-list">
            {game.memorials.map((item) => (
              <li key={item.id}>
                <b>{item.petName}</b>
                <span>一起 {item.days} 天 · 亲密 {item.bond} · 成长 {item.growthPoints}</span>
                <small>{new Date(item.at).toLocaleDateString()} · {item.reason === 'farewell' ? '自然告别' : '重新领养'}</small>
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className="settings-card" aria-labelledby="quiet-title">
        <h3 id="quiet-title">勿扰</h3>
        <p className="settings-note">
          当前：{quiet.quiet ? `静默中（${quiet.reason}）` : quiet.reason}
          {systemQuiet ? ' · 系统勿扰中，通知会被系统抑制' : ''}
        </p>
        <label className="settings-toggle">
          <input type="checkbox" checked={game.quiet.manual} onChange={(event) => game.setQuiet({ manual: event.target.checked })} />
          一键勿扰（勿扰时背屏仍安静陪伴）
        </label>
        <label className="settings-toggle">
          <input type="checkbox" checked={game.quiet.schedule} onChange={(event) => game.setQuiet({ schedule: event.target.checked })} />
          定时勿扰
        </label>
        <div className="settings-row settings-times">
          <label>
            开始
            <input
              type="time"
              value={formatMinute(game.quiet.startMinute)}
              onChange={(event) => game.setQuiet({ startMinute: toMinute(event.target.value, game.quiet.startMinute) })}
            />
          </label>
          <label>
            结束
            <input
              type="time"
              value={formatMinute(game.quiet.endMinute)}
              onChange={(event) => game.setQuiet({ endMinute: toMinute(event.target.value, game.quiet.endMinute) })}
            />
          </label>
        </div>
        <label className="settings-toggle">
          <input type="checkbox" checked={game.quiet.weekdaysOnly} onChange={(event) => game.setQuiet({ weekdaysOnly: event.target.checked })} />
          仅工作日生效（跨午夜按开始日计算）
        </label>
        <p className="settings-note small">起止时间相同表示全天勿扰。勿扰期间产生的消息不会补发。</p>
      </article>

      <article className="settings-card" aria-labelledby="notify-title">
        <h3 id="notify-title">主动通知</h3>
        {preview && <p className="settings-note">网页预览仅演示消息与设置；手机通知、震动和锁屏背屏需安装 GitHub 原生 APK。</p> }
        <p className="settings-note small">
          默认关闭。开启后用系统通知提醒消息；通知无声，轻震动可单独选择。应用不接入推送服务器。
        </p>
        <label className="settings-toggle">
          <input type="checkbox" checked={game.notify.enabled} onChange={toggleNotify} />
          开启主动通知
        </label>
        {game.notify.enabled && !notificationsPermitted && !preview && (
          <p className="settings-note small">
            系统通知权限未开启：消息仍会留在应用内。可到「系统设置 → 通知 → 拓麻歌子」允许通知。
            <button type="button" className="link-button" onClick={() => window.NeoNative.control('notificationSettings')}>打开设置</button>
          </p>
        )}
        <div className="settings-row"><button type="button" onClick={() => window.NeoNative.control("notificationTest")}>测试提醒</button></div>
        <label className="settings-toggle">
          <input type="checkbox" checked={game.notify.vibrate} disabled={!game.notify.enabled} onChange={(event) => game.setNotify({ vibrate: event.target.checked })} />
          轻震动（系统勿扰时仍会被抑制）
        </label>
        <div className="settings-row">
          <button type="button" className={game.notify.frequency === 'low' ? 'active' : ''} onClick={() => game.setNotify({ frequency: 'low' })}>低频</button>
          <button type="button" className={game.notify.frequency === 'normal' ? 'active' : ''} onClick={() => game.setNotify({ frequency: 'normal' })}>普通</button>
        </div>
        <p className="settings-note small">
          低频：每天最多 2 条、间隔至少 6 小时；普通：每天最多 4 条、间隔至少 3 小时。你主动照料不会占用额度。
        </p>
      </article>

      <article className="settings-card" aria-labelledby="messages-title">
        <h3 id="messages-title">消息中心</h3>
        {game.messages.length === 0 ? (
          <p className="settings-note small">还没有消息。轻轻打个招呼，或让它安静待一会儿。</p>
        ) : (
          <ul className="message-list">
            {game.messages.slice(0, 8).map((message) => (
              <li key={message.id}>
                <span>{message.text}</span>
                <small>{new Date(message.at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
        {game.messages.length > 0 && (
          <div className="settings-row">
            <button type="button" onClick={() => game.clearMessages()}>清空列表（不会重放已读消息）</button>
          </div>
        )}
      </article>

      <article className="settings-card">
        <button type="button" onClick={() => setPrivacyOpen(true)}>隐私说明</button>
      </article>

      {privacyOpen && (
        <div className="settings-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPrivacyOpen(false) }}>
          <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
            <button type="button" className="dialog-close" onClick={() => setPrivacyOpen(false)} aria-label="关闭隐私说明">×</button>
            <h2 id="privacy-title">{PRIVACY_TITLE}</h2>
            {PRIVACY_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
              </div>
            ))}
            <p className="settings-note small">你可以随时关闭主动提醒，或在存档区导出自己的相处记录。</p>
          </section>
        </div>
      )}
    </section>
  )
}
