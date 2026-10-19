/* 前台 17×23 背屏预览：与真机背屏同一份帧生成器（studio-art/mori.ts）与
 * 同一套场景 / 外观选择规则（game/matrixScene.ts），用户不装手机也能看到
 * 蛋、裂纹、破壳与两个角色的动画。真实 NeoNative 优先；这里是预览，不假装硬件。 */
import { useEffect, useRef, useState } from 'react'

import { eggRemainingSeconds, eggPhase, selectAppearance, selectScene } from '../game/matrixScene'
import type { GameSnapshot } from '../game/types'
import { FPS, renderMori, type Scene } from '../../../studio-art/mori'

const W = 17
const H = 23

interface MatrixPreviewProps {
  snapshot: GameSnapshot
  /** 单格边长（CSS px） */
  cell?: number
  /** 蛋阶段轻触安抚 */
  onSoothe?: () => void
}

/** 照料动作窗口追踪器（与 MoriMatrix 的 nonce/actionAt 同语义，跨 tick 持久） */
interface ActionTracker {
  lastNonce: number
  actionAt: number
}

/** 帧率（与 export-art 的 FPS 一致；蛋阶段同表） */
function fpsOf(scene: Scene): number {
  return FPS[scene] ?? 1.5
}

/** 蛋阶段自然文案（不暴露内部 scene key） */
function eggLabel(phase: 'egg' | 'crack' | 'hatch' | 'hatched', remain: number): string {
  if (phase === 'egg') return `蛋 · 孵化中（约 ${remain} 秒）`
  if (phase === 'crack') return '蛋出现裂纹了，快破壳了'
  if (phase === 'hatch') return '即将破壳！'
  return ''
}

/** 场景自然文案（不暴露内部 scene key） */
const SCENE_LABEL: Record<Scene, string> = {
  idle: '悠闲待着', eat: '吃饭中', play: '玩耍中', sleep: '睡觉中', happy: '心满意足',
  pet: '亲昵依赖', hungry: '需要照顾', egg: '蛋', crack: '裂纹', hatch: '破壳',
}
function sceneLabel(scene: Scene): string {
  return SCENE_LABEL[scene] ?? '陪伴中'
}

export function MatrixPreview({ snapshot, cell = 14, onSoothe }: MatrixPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackerRef = useRef<ActionTracker>({ lastNonce: -1, actionAt: 0 })
  const [scene, setScene] = useState<Scene>('idle')

  // 场景选择（每 250ms；tracker 持久，nonce 变化时记录一次时间，6 秒窗口按截止判断）
  useEffect(() => {
    const pick = () => {
      const now = Date.now()
      setScene(selectScene(snapshot, now, trackerRef.current))
    }
    pick()
    const timer = window.setInterval(pick, 250)
    return () => window.clearInterval(timer)
  }, [snapshot])

  // 帧渲染：按场景 fps 用真实时间驱动 phase；外观完全跟随存档（与原生 artKey 一致）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const w = W * cell
    const h = H * cell
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    let raf = 0
    const draw = () => {
      const now = Date.now()
      const fps = fpsOf(scene)
      const phase = Math.floor((now / 1000) * fps) % 8
      // 外观维度与原生 MoriAppearance 同规则（最高分/平分），不只用 personalityFocus
      const { stage, personality, wearable } = selectAppearance(snapshot)
      const frame = renderMori(snapshot.character, scene, phase, stage, personality, wearable, snapshot.headphones)
      const styles = getComputedStyle(document.documentElement)
      const screen = styles.getPropertyValue('--screen').trim() || '10 11 14'
      const grid = styles.getPropertyValue('--screen-grid').trim() || '96 104 118'
      const accent = styles.getPropertyValue('--accent').trim() || '249 115 22'

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = `rgb(${screen})`
      ctx.fillRect(0, 0, w, h)
      const gap = Math.max(1, Math.floor(cell * 0.16))
      for (let i = 0; i < frame.length; i += 1) {
        const x = (i % W) * cell
        const y = Math.floor(i / W) * cell
        const v = frame[i]
        if (v > 0) {
          ctx.globalAlpha = Math.min(1, 0.25 + (v / 255) * 0.75)
          ctx.fillStyle = `rgb(${accent})`
          ctx.fillRect(x + gap, y + gap, cell - gap * 2, cell - gap * 2)
        } else {
          ctx.globalAlpha = 0.08
          ctx.fillStyle = `rgb(${grid})`
          ctx.fillRect(x + gap, y + gap, cell - gap * 2, cell - gap * 2)
        }
      }
      ctx.globalAlpha = 1
      raf = window.requestAnimationFrame(draw)
    }
    draw()
    return () => window.cancelAnimationFrame(raf)
  }, [scene, snapshot, cell])

  const phase = eggPhase(snapshot.egg, snapshot.hatched, Date.now())
  const egg = phase !== 'hatched'
  const remain = eggRemainingSeconds(snapshot, Date.now())
  const label = egg ? eggLabel(phase, remain) : ''

  return (
    <div className="matrix-preview" role="img" aria-label="背屏预览">
      <div className="matrix-preview-frame">
        <canvas
          ref={canvasRef}
          onClick={egg && onSoothe ? () => onSoothe() : undefined}
          className={egg && onSoothe ? 'matrix-preview-canvas soothe' : 'matrix-preview-canvas'}
        />
      </div>
      <span className="matrix-preview-tag">{egg ? label : `背屏陪伴 · ${snapshot.petName} · ${sceneLabel(scene)}`}</span>
      {egg && onSoothe && <span className="matrix-preview-hint">轻触蛋蛋安抚它</span>}
    </div>
  )
}
