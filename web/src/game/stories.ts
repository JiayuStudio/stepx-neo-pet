import type { StoryEvent } from './types'

export const STORY_EVENTS: readonly StoryEvent[] = [
  {
    eyebrow: '小小的开始',
    title: '外壳里面，传来了轻轻的敲击声……',
    body: '两只明亮的眼睛出现了。小生命正等待新生活里的第一声问候。',
    choices: [
      { label: '轻轻哼一声你好', reply: '点点跟着旋律摇晃，把它记在了心里。', bond: 8, joy: 10, trait: 'gentle' },
      { label: '轻敲两下回应', reply: '嗒，嗒。你们有了秘密的问候。', bond: 6, joy: 14, trait: 'playful' },
    ],
  },
  {
    eyebrow: '回忆 01 · 遗落的光',
    title: '一小点光，从天空落下来。',
    body: '点点捧着微弱的光。它可以温暖房间，也可以照亮别人回家的路。',
    choices: [
      { label: '把它挂在窗边', reply: '房间亮起来，像记忆里的夏天。', bond: 9, joy: 6, trait: 'gentle' },
      { label: '送它回家', reply: '远处的另一个小世界，闪烁着向你道谢。', bond: 12, joy: 4, trait: 'curious' },
    ],
  },
  {
    eyebrow: '回忆 02 · 雨的旋律',
    title: '雨滴忘记了自己的节奏。',
    body: '雨滴静静悬在花园上方，点点望着你，寻找丢失的节拍。',
    choices: [
      { label: '跳出节奏', reply: '雨滴笑着落下，唱成一首歌。', bond: 10, joy: 12, trait: 'playful' },
      { label: '一起静静听', reply: '安静中，雨找回了自己的旋律。', bond: 14, joy: 7, trait: 'curious' },
    ],
  },
  {
    eyebrow: '回忆 03 · 折纸花园',
    title: '一朵折纸花，怎么也不肯展开。',
    body: '点点在地板下找到它，折痕还记着另一双手的温度。',
    choices: [
      { label: '给它折一个朋友', reply: '两朵纸花靠在一起，终于绽开了。', bond: 11, joy: 11, trait: 'playful' },
      { label: '沿着折痕慢慢看', reply: '点点学会了旧图样，好好收藏起来。', bond: 15, joy: 5, trait: 'curious' },
      { label: '耐心暖一暖它', reply: '靠近心口，纸慢慢变软，自己展开了。', bond: 13, joy: 8, trait: 'gentle' },
    ],
  },
  {
    eyebrow: '回忆 04 · 遥远的信号',
    title: '旧日的小世界，传来一个声音。',
    body: '设备响起很久以前录下的消息：还有人在听吗？',
    choices: [
      { label: '用你们的歌回应', reply: '点点送回了你们相遇时的第一段旋律。', bond: 16, joy: 10, trait: 'gentle' },
      { label: '找出声音来自哪里', reply: '点点画出路线，通向无人去过的小世界。', bond: 14, joy: 8, trait: 'curious' },
      { label: '用秘密敲击回应', reply: '嗒，嗒。旧信号笑着，轻轻敲了回来。', bond: 12, joy: 15, trait: 'playful' },
    ],
  },
]

export const STORY_COUNT = STORY_EVENTS.length

export const getStoryBondRequirement = (storyIndex: number) => storyIndex * 10 + 4

export const isStoryUnlocked = (storyIndex: number, bond: number) => (
  storyIndex < STORY_COUNT && bond >= getStoryBondRequirement(storyIndex)
)
