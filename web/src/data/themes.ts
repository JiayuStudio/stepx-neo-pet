import type { ThemeDefinition, ThemeId } from '../game/types'

/* 0.3.6 马克笔描边风格纸色板：暖白纸张 + 深墨描边 + 四色马克笔。
 * 四套主题只在这套色板内轮换强调色，保证整体是同一个"研究所手账"体系：
 *   墨色 #242321 / 纸色 #f7f2e5 / 蓝 #79cce7 / 粉 #f3a2b1 / 黄 #f7d65e / 绿 #b6d59c */
const INK = '#242321'
const SCREEN = '#1b1c19'

export const THEMES: readonly ThemeDefinition[] = [
  {
    id: 'sakura', number: '01', name: '樱花小屋', tagline: '花瓣记得每一个约定。',
    shell: '#79cce7', shellDark: '#4b9cb8', accent: '#f7d65e', ink: INK,
    screen: SCREEN, sky: '#f3a2b1', ground: '#b6d59c', glow: '#f7d65e', particle: '#f3a2b1',
  },
  {
    id: 'cyber', number: '02', name: '霓虹空间', tagline: '来自明天的小小信号。',
    shell: '#f3a2b1', shellDark: '#c9788a', accent: '#79cce7', ink: INK,
    screen: SCREEN, sky: '#79cce7', ground: '#b6d59c', glow: '#79cce7', particle: '#f7d65e',
  },
  {
    id: 'moss', number: '03', name: '苔藓森林', tagline: '慢慢醒来的清晨，草木自由生长。',
    shell: '#b6d59c', shellDark: '#7fa267', accent: '#f7d65e', ink: INK,
    screen: SCREEN, sky: '#b6d59c', ground: '#8fae76', glow: '#f7d65e', particle: '#f3a2b1',
  },
  {
    id: 'moon', number: '04', name: '月光之屋', tagline: '梦在家的附近环绕。',
    shell: '#f7d65e', shellDark: '#c9a93f', accent: '#79cce7', ink: INK,
    screen: SCREEN, sky: '#f3a2b1', ground: '#b6d59c', glow: '#79cce7', particle: '#f3a2b1',
  },
]

export const THEME_BY_ID = Object.fromEntries(THEMES.map((theme) => [theme.id, theme])) as Record<ThemeId, ThemeDefinition>
