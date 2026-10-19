import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useGameStore } from '../game/store'
import type { MiniGameId } from '../game/types'

const ROUND_DURATION_MS = 12_000
const PADS = [
  { glyph: '●', label: '圆形' },
  { glyph: '▲', label: '三角' },
  { glyph: '■', label: '方块' },
  { glyph: '✦', label: '星星' },
] as const

function StarCatch({ onClose }: { onClose: () => void }) {
  const complete = useGameStore((state) => state.completeActivity)
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(12)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const scoreRef = useRef(0)

  useEffect(() => {
    if (phase !== 'playing') return
    const deadline = Date.now() + ROUND_DURATION_MS
    let timer: number

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1_000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        complete('star-catch', scoreRef.current)
        setPhase('done')
        return
      }
      timer = window.setTimeout(updateTimer, 200)
    }

    updateTimer()
    return () => window.clearTimeout(timer)
  }, [complete, phase])

  const start = () => {
    scoreRef.current = 0
    setScore(0)
    setTimeLeft(12)
    setPhase('playing')
  }
  const catchStar = () => {
    setScore((value) => {
      const nextScore = value + 1
      scoreRef.current = nextScore
      return nextScore
    })
    setPosition({ x: 10 + Math.random() * 80, y: 14 + Math.random() * 72 })
  }

  return (
    <GameShell title="接星星" subtitle="尽可能接住闪亮的回忆。" onClose={onClose}>
      <div className="game-hud"><span>时间 <b>{timeLeft}</b></span><span>得分 <b>{score}</b></span></div>
      <div className="star-field">
        {phase === 'ready' && <GamePrompt icon="★" title="伸出手，接住星星。" body="在 12 秒内点击星星，获得星屑。" action="开始挑战" onAction={start} />}
        {phase === 'playing' && <button className="catch-star" style={{ '--star-x': `${position.x}%`, '--star-y': `${position.y}%` } as CSSProperties} onClick={catchStar} aria-label="接住星星">★</button>}
        {phase === 'done' && <GamePrompt icon="✦" title={`接住了 ${score} 颗星星！`} body={`它获得 ${Math.max(3, Math.floor(score / 2))} 星屑。`} action="再玩一次" onAction={start} />}
      </div>
    </GameShell>
  )
}

function MemoryFlip({ onClose }: { onClose: () => void }) {
  const complete = useGameStore((state) => state.completeActivity)
  const [phase, setPhase] = useState<'ready' | 'preview' | 'input' | 'done'>('ready')
  const [sequence, setSequence] = useState<number[]>([])
  const [picks, setPicks] = useState<number[]>([])
  const [won, setWon] = useState(false)

  useEffect(() => {
    if (phase !== 'preview') return
    const timer = window.setTimeout(() => setPhase('input'), 2_700)
    return () => window.clearTimeout(timer)
  }, [phase])

  const start = () => {
    setSequence(Array.from({ length: 5 }, () => Math.floor(Math.random() * PADS.length)))
    setPicks([])
    setWon(false)
    setPhase('preview')
  }

  const pick = (value: number) => {
    if (phase !== 'input') return
    const nextPicks = [...picks, value]
    setPicks(nextPicks)
    if (sequence[picks.length] !== value) {
      complete('memory-flip', picks.length * 3)
      setWon(false)
      setPhase('done')
    } else if (nextPicks.length === sequence.length) {
      complete('memory-flip', 20)
      setWon(true)
      setPhase('done')
    }
  }

  const resultPrompt = won
    ? {
        icon: '♥',
        title: '信号全部正确！',
        body: '记得真清楚，获得 10 星屑。',
      }
    : {
        icon: '◇',
        title: `记住了 ${Math.max(0,picks.length-1)} 个符号`,
        body: '信号消失了，它仍很喜欢和你一起尝试。',
      }

  return (
    <GameShell title="记忆信号" subtitle="记住它发来的五个符号。" onClose={onClose}>
      <div className="memory-board">
        {phase === 'ready' && <GamePrompt icon="◆" title="看清楚，记下来，再重复。" body="符号只会显示短短一瞬。" action="显示信号" onAction={start} />}
        {phase === 'preview' && (
          <div className="signal-preview" aria-label={`信号：${sequence.map((value) => PADS[value].label).join(', ')}`}>
            {sequence.map((value, index) => <span key={index} aria-hidden="true">{PADS[value].glyph}</span>)}
          </div>
        )}
        {phase === 'input' && (
          <div className="signal-input">
            <p aria-label={picks.length ? `你的信号：${picks.map((value) => PADS[value].label).join(', ')}` : '等待输入信号'}>
              {picks.map((value) => PADS[value].glyph).join('  ') || '你的信号……'}
            </p>
            <div>
              {PADS.map((pad, index) => (
                <button key={pad.label} aria-label={`选择${pad.label}`} onClick={() => pick(index)}>
                  {pad.glyph}
                </button>
              ))}
            </div>
          </div>
        )}
        {phase === 'done' && (
          <GamePrompt
            icon={resultPrompt.icon}
            title={resultPrompt.title}
            body={resultPrompt.body}
            action="再试一次"
            onAction={start}
          />
        )}
      </div>
    </GameShell>
  )
}

function GamePrompt({ icon, title, body, action, onAction }: { icon: string; title: string; body: string; action: string; onAction: () => void }) {
  return (
    <div className="game-prompt">
      <i aria-hidden="true">{icon}</i><h3>{title}</h3><p>{body}</p><button onClick={onAction}>{action} →</button>
    </div>
  )
}

function GameShell({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    closeButtonRef.current?.focus()
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div className="game-overlay" role="presentation">
      <section className="game-dialog" role="dialog" aria-modal="true" aria-labelledby="game-title">
        <header><div><p className="eyebrow">拓麻歌子游乐场</p><h2 id="game-title">{title}</h2><span>{subtitle}</span></div><button ref={closeButtonRef} onClick={onClose} aria-label="关闭游戏">×</button></header>
        {children}
      </section>
    </div>
  )
}

export function ActivityArcade() {
  const [activeGame, setActiveGame] = useState<MiniGameId | null>(null)
  const sparks = useGameStore((state) => state.sparks)
  const streak = useGameStore((state) => state.playStreak)
  const best = useGameStore((state) => state.activityBest)

  return (
    <section className="activity-section" aria-labelledby="activity-title">
      <div className="activity-heading">
        <div><p className="eyebrow">拓麻歌子游乐场 · 每日开放</p><h2 id="activity-title">小小的游戏，<br /><em>每天的快乐。</em></h2></div>
        <div className="reward-counter"><span>✦ {sparks} 星屑</span><span>↻ {streak} 天连续</span></div>
      </div>
      <div className="activity-grid">
        <button className="activity-card star-card" onClick={() => setActiveGame('star-catch')}>
          <span className="activity-art">★<i>✦</i><b>·</b></span>
          <span><small>反应 · 12 秒</small><strong>接星星</strong><em>最高分 {best['star-catch']}</em></span><b>去玩 →</b>
        </button>
        <button className="activity-card memory-card" onClick={() => setActiveGame('memory-flip')}>
          <span className="activity-art">◆<i>●</i><b>▲</b></span>
          <span><small>记忆 · 1 分钟</small><strong>记忆信号</strong><em>最高分 {best['memory-flip']}</em></span><b>去玩 →</b>
        </button>
      </div>
      {activeGame === 'star-catch' && <StarCatch onClose={() => setActiveGame(null)} />}
      {activeGame === 'memory-flip' && <MemoryFlip onClose={() => setActiveGame(null)} />}
    </section>
  )
}