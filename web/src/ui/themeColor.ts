/** 把 CSS 颜色（#rgb / #rrggbb / `r g b` 三元组）解析成 canvas 可用的 `r g b`。
 *  0.3.6：主题色现在是十六进制，而旧代码直接拼 `rgb(${value})` 会得到无效值，
 *  结果点阵退回写死的旧橙色。这里统一解析，并优先读取 `.app` 上的主题变量。 */
export function cssColorToRgb(value: string, fallback: string): string {
  const raw = value.trim()
  if (!raw) return fallback
  if (raw.startsWith('#')) {
    const hex = raw.slice(1)
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return fallback
    return `${parseInt(full.slice(0, 2), 16)} ${parseInt(full.slice(2, 4), 16)} ${parseInt(full.slice(4, 6), 16)}`
  }
  const parts = raw.split(/[\s,]+/).filter(Boolean)
  if (parts.length === 3 && parts.every((part) => /^\d+(\.\d+)?$/.test(part))) return parts.join(' ')
  return fallback
}

/** 读取当前主题变量（内联在 `.app` 上；documentElement 没有时就回退） */
export function themeColor(name: string, fallback: string): string {
  const host = (document.querySelector('.app') as HTMLElement | null) ?? document.documentElement
  return cssColorToRgb(getComputedStyle(host).getPropertyValue(name), fallback)
}
