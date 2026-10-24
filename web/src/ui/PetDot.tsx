/* 角色点阵缩略图：与背屏预览 / 原生帧包同一份 renderMori，
 * 让 8 种外观在选择卡上都能直接辨识（不依赖 3D 模型）。 */
import { useEffect, useRef } from 'react'

import { renderMori, type Character, type Scene } from '../../../studio-art/mori'
import { themeColor } from './themeColor'

const W = 17
const H = 23

interface PetDotProps {
  character: Character
  scene?: Scene
  /** 单格边长（CSS px） */
  cell?: number
  /** 是否播放帧动画 */
  animated?: boolean
}

export function PetDot({ character, scene = 'idle', cell = 3, animated = true }: PetDotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
      const frame = renderMori(character, scene, animated ? Math.floor((Date.now() / 1000) * 3) : 0, 'seedling', 'gentle', 'none', false)
      const screen = themeColor('--screen', '27 28 25')
      const accent = themeColor('--accent', '247 214 94')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = `rgb(${screen})`
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < frame.length; i += 1) {
        const v = frame[i]
        if (v <= 0) continue
        const x = (i % W) * cell
        const y = Math.floor(i / W) * cell
        ctx.globalAlpha = Math.min(1, 0.3 + (v / 255) * 0.7)
        ctx.fillStyle = `rgb(${accent})`
        ctx.fillRect(x, y, cell, cell)
      }
      ctx.globalAlpha = 1
      if (animated) raf = window.requestAnimationFrame(draw)
    }
    draw()
    return () => window.cancelAnimationFrame(raf)
  }, [character, scene, cell, animated])

  return <canvas ref={canvasRef} className="pet-dot" role="img" aria-label={`${character} 点阵形象`} />
}
