import type { ThemeDefinition, ThemeId } from '../game/types'

export const THEMES: readonly ThemeDefinition[] = [
  {
    id: 'sakura', number: '01', name: '樱花小屋', tagline: '花瓣记得每一个约定。',
    shell: '#f05f4f', shellDark: '#b7373c', accent: '#ffcf5b', ink: '#291c2b',
    screen: '#f9e7bd', sky: '#ffd6cb', ground: '#85b883', glow: '#fff0ae', particle: '#fff5e1',
  },
  {
    id: 'cyber', number: '02', name: '霓虹空间', tagline: '来自明天的小小信号。',
    shell: '#4737d1', shellDark: '#211563', accent: '#6dffcb', ink: '#17152e',
    screen: '#161c43', sky: '#37256f', ground: '#142f43', glow: '#ff61d8', particle: '#75fff1',
  },
  {
    id: 'moss', number: '03', name: '苔藓森林', tagline: '慢慢醒来的清晨，草木自由生长。',
    shell: '#6e8d5c', shellDark: '#344b36', accent: '#efc86a', ink: '#203027',
    screen: '#d9deb2', sky: '#b9d2a2', ground: '#607d4d', glow: '#e8f3a9', particle: '#fff3c4',
  },
  {
    id: 'moon', number: '04', name: '月光之屋', tagline: '梦在家的附近环绕。',
    shell: '#8c78b8', shellDark: '#4b416d', accent: '#f6dc92', ink: '#25223d',
    screen: '#dce2ec', sky: '#8a91c9', ground: '#59669e', glow: '#fff4c4', particle: '#ffffff',
  },
]

export const THEME_BY_ID = Object.fromEntries(THEMES.map((theme) => [theme.id, theme])) as Record<ThemeId, ThemeDefinition>