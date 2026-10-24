/* 17×23 点阵宠物角色定义（0.3.6 共享真源，Web 预览 / 导出脚本 / 原生帧包同一份）。
 *
 * 每个角色 15 行 × 17 列，放在画布 top 偏移处（见 PETS[].top）。
 * 字符语义（渲染时按角色 tone 映射为 0..255 灰度）：
 *   .  透明
 *   B  身体主色（中灰，最外圈常配 D 做清楚边缘）
 *   L  亮部身形（比身体亮一档，制造层次）
 *   D  暗边 / 阴影
 *   W  眼白（固定 255）
 *   x  瞳 / 暗五官（固定 0 附近）
 *   m  嘴（暗，1~3 像素）
 *   A  配件（耳 / 角 / 尾 / 翼 / 爪，用 accent 亮度）
 *   s  次色（脸 / 肚，比身体略暗）
 *
 * deadRows 是横躺版本（手绘，不做矩阵旋转，避免五官被插值糊掉）。
 * 前后台共用这套数据：改形象只改这里的字符串。
 */

export type CharacterId = 'star' | 'block' | 'sprout' | 'bunny' | 'fox' | 'otter' | 'owl' | 'drake'

export interface PetTone {
  body: number
  light: number
  dark: number
  rim: number
  accent: number
  secondary: number
}

export interface PetDef {
  id: CharacterId
  name: string
  tagline: string
  /** 画布行偏移（0..8） */
  top: number
  /** 眼睛起始行（0-based，相对 rows） */
  eyeRow: number
  /** 头部行范围 [from, to]（含） */
  head: [number, number]
  /** 腿起始行（含） */
  legRow: number
  rows: string[]
  deadRows: string[]
  tone: PetTone
}

export const PETS: readonly PetDef[] = [
  {
    id: 'star', name: '星跃', tagline: '圆润软团子', top: 4, eyeRow: 5, head: [0, 8], legRow: 13,
    tone: { body: 158, light: 196, dark: 96, rim: 24, accent: 230, secondary: 134 },
    rows: [
      '.......LLL.......',
      '......LLLLL......',
      '.....LLLLLLL.....',
      '....LLLLLLLLL....',
      '....LLLLLLLLL....',
      '....DxWWxWWxD....',
      '....DxWWxWWxD....',
      '....DxWWxWWxD....',
      '....LLLLmLLLL....',
      '...LLLLLLLLLLL...',
      '..LLLLLLLLLLLLL..',
      '...LLLLLLLLLLL...',
      '....LLLLLLLLL....',
      '.....LLL.LLL.....',
      '.....LLL.LLL.....',
    ],
    deadRows: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '......LLL........',
      '....LLLLLLLLL....',
      '....LxLLLLxLL....',
      '....LLLLLLLLL....',
      '....LLLLLLLLL....',
      '.....LLLLLLL.....',
      '....DDDDDDDDD....',
      '.................',
    ],
  },
  {
    id: 'block', name: '方跃', tagline: '不对称阶梯方块', top: 5, eyeRow: 4, head: [0, 5], legRow: 12,
    tone: { body: 220, light: 244, dark: 150, rim: 40, accent: 200, secondary: 186 },
    rows: [
      '.......BBBB......',
      '.....BBBBBB......',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '....BBxxBxxBB....',
      '....BBxxBxxBB....',
      '...BBBBBmBBBBB...',
      '..BBBBBBBBBBBBB..',
      '...BBBBBBBBBBB...',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '....BBBB.BBBB....',
      '....BBB...BBB....',
      '....BBB...BBB....',
    ],
    deadRows: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '....BBBBBBBBB....',
      '....BBxxBBxxB....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '...DDDDDDDDDDD...',
      '.................',
    ],
  },
  {
    id: 'sprout', name: '芽灵', tagline: '叶冠小芽', top: 4, eyeRow: 5, head: [2, 8], legRow: 13,
    tone: { body: 176, light: 212, dark: 110, rim: 30, accent: 236, secondary: 150 },
    rows: [
      '......A...A......',
      '.....AA...AA.....',
      '......BBBBB......',
      '.....BBBBBBB.....',
      '....BBBBBBBBB....',
      '....BWWBWWBBB....',
      '....BWxBxWBBB....',
      '....BWWBWWBBB....',
      '....BBBBmBBBB....',
      '...BBBBBBBBBBB...',
      '..BBBBBBBBBBBBB..',
      '...BBBBBBBBBBB...',
      '....BBBBBBBBB....',
      '.....BBB.BBB.....',
      '.....BBB.BBB.....',
    ],
    deadRows: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.....A.....A.....',
      '....BBBBBBBBB....',
      '....BxBBBBxBB....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '.....BBBBBBB.....',
      '....DDDDDDDDD....',
      '.................',
    ],
  },
  {
    id: 'bunny', name: '绒兔', tagline: '长耳软兔', top: 4, eyeRow: 6, head: [4, 9], legRow: 13,
    tone: { body: 206, light: 238, dark: 130, rim: 34, accent: 246, secondary: 176 },
    rows: [
      '......A...A......',
      '......A...A......',
      '......A...A......',
      '......A...A......',
      '.....BBBBBBB.....',
      '....BBBBBBBBB....',
      '....BWWBWWBBB....',
      '....BWxBxWBBB....',
      '....BWWBWWBBB....',
      '....BBBBmBBBB....',
      '...BBBBBBBBBBB...',
      '..BBBBBBBBBBBBB..',
      '....BBBBBBBBB....',
      '.....BBB.BBB.....',
      '.....BBB.BBB.....',
    ],
    deadRows: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '...A.......A.....',
      '..AABBBBBBBAA....',
      '....BxBBBBxBB....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '.....BBBBBBB.....',
      '....DDDDDDDDD....',
      '.................',
    ],
  },
  {
    id: 'fox', name: '焰狐', tagline: '尖耳大尾', top: 4, eyeRow: 5, head: [0, 8], legRow: 13,
    tone: { body: 168, light: 210, dark: 104, rim: 26, accent: 248, secondary: 140 },
    rows: [
      '....A.......A....',
      '....AA.....AA....',
      '.....AAA.AAA.....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '....BWxBxWBBB....',
      '....BWWBWWBBB....',
      '....BBBBmBBBB....',
      '...BBBBBBBBBBB...',
      '..BBBBBBBBBBBBB..',
      '..BBBBBBBBBBBBBA.',
      '...BBBBBBBBBAA...',
      '....BBBBBBBBB....',
      '.....BBB.BBB.....',
      '.....BBB.BBB.....',
    ],
    deadRows: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '....BBBBBBBBB....',
      '...AABBBBBBBBA...',
      '....BxBBBBxBB....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '.....BBBBBBB.....',
      '....DDDDDDDDD....',
      '.................',
    ],
  },
  {
    id: 'otter', name: '泡獭', tagline: '扁尾小獭', top: 4, eyeRow: 2, head: [0, 5], legRow: 13,
    tone: { body: 188, light: 224, dark: 118, rim: 28, accent: 210, secondary: 158 },
    rows: [
      '......BBBBB......',
      '....BBBBBBBBB....',
      '....BWxBxWBBB....',
      '....BWWBWWBBB....',
      '....BBBBmBBBB....',
      '...BBBBBBBBBBB...',
      '..BBBBBBBBBBBBB..',
      '..BBBBBBBBBBBBBA.',
      '..BBBBBBBBBBBAA..',
      '...BBBBBBBBBBB...',
      '...BBBBBBBBBBB...',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '....BBB...BBB....',
      '....BBB...BBB....',
    ],
    deadRows: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.....BBBBBBBB....',
      '....BBBBBBBBBA...',
      '....BxBBBBxBB....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '.....BBBBBBB.....',
      '....DDDDDDDDD....',
      '.................',
    ],
  },
  {
    id: 'owl', name: '眠鸮', tagline: '展翼大眼', top: 4, eyeRow: 3, head: [0, 5], legRow: 13,
    tone: { body: 150, light: 196, dark: 96, rim: 22, accent: 232, secondary: 128 },
    rows: [
      '......BBBBB......',
      '....BBBBBBBBB....',
      '...BBBBBBBBBBB...',
      '...BWWWBWWWBB....',
      '...BWxWBWxWBB....',
      '...BWWWBWWWBB....',
      '..ABBBBBBBBBBA...',
      '.AABBBBBBBBBAA...',
      '.AABBBBmBBBBAA...',
      '.AABBBBBBBBBAA...',
      '..ABBBBBBBBBA....',
      '...BBBBBBBBB.....',
      '....BBBBBBBBB....',
      '.....AA...AA.....',
      '.....AA...AA.....',
    ],
    deadRows: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '..A...........A..',
      '..AABBBBBBBBAA...',
      '...BWWBBBBWWB....',
      '....BxBBBBxBB....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '.....BBBBBBB.....',
      '....DDDDDDDDD....',
      '.................',
    ],
  },
  {
    id: 'drake', name: '角龙', tagline: '小角短尾', top: 4, eyeRow: 3, head: [0, 5], legRow: 13,
    tone: { body: 184, light: 220, dark: 112, rim: 30, accent: 240, secondary: 152 },
    rows: [
      '.....A.....A.....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '....BWxBxWBBB....',
      '....BWWBWWBBB....',
      '....BBBBmBBBB....',
      '...BBBBBBBBBBB...',
      '..BBBBBBBBBBBBB..',
      '..BBBBBBBBBBBBBA.',
      '..BBBBBBBBBBBAA..',
      '...BBBBBBBBBBB...',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '....BBB...BBB....',
      '....BBB...BBB....',
    ],
    deadRows: [
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '.................',
      '....A.......A....',
      '....BBBBBBBBB....',
      '....BxBBBBxBB....',
      '....BBBBBBBBB....',
      '....BBBBBBBBB....',
      '.....BBBBBBB.....',
      '....DDDDDDDDD....',
      '.................',
    ],
  },
]

export const PET_BY_ID: Record<CharacterId, PetDef> = Object.fromEntries(
  PETS.map((pet) => [pet.id, pet]),
) as Record<CharacterId, PetDef>

export const CHARACTER_IDS = PETS.map((pet) => pet.id)
export const CHARACTER_NAMES: Record<CharacterId, string> = Object.fromEntries(
  PETS.map((pet) => [pet.id, pet.name]),
) as Record<CharacterId, string>
