import type { StoryEvent } from './types'

export const STORY_EVENTS: readonly StoryEvent[] = [
  {
    eyebrow: 'A SMALL BEGINNING',
    title: 'Something is tapping from inside the shell…',
    body: 'Two bright eyes appear. The little creature waits for the first sound of its new life.',
    choices: [
      { label: 'Hum a soft hello', reply: 'Mori sways to the tune and remembers it.', bond: 8, joy: 10, trait: 'gentle' },
      { label: 'Tap back twice', reply: 'Tap. Tap. A secret greeting is born.', bond: 6, joy: 14, trait: 'playful' },
    ],
  },
  {
    eyebrow: 'STORY 01 · THE LOST LIGHT',
    title: 'A tiny light falls from the sky.',
    body: 'Mori cups the flickering spark. It could warm the room—or guide another creature home.',
    choices: [
      { label: 'Hang it by the window', reply: 'The room glows like a remembered summer.', bond: 9, joy: 6, trait: 'gentle' },
      { label: 'Send it home', reply: 'Far away, another pocket world blinks thank you.', bond: 12, joy: 4, trait: 'curious' },
    ],
  },
  {
    eyebrow: 'STORY 02 · RAIN MUSIC',
    title: 'The rain has forgotten its rhythm.',
    body: 'Drops hover silently above the garden. Mori looks to you for the missing beat.',
    choices: [
      { label: 'Dance the rhythm', reply: 'The rain tumbles down in a laughing chorus.', bond: 10, joy: 12, trait: 'playful' },
      { label: 'Listen together', reply: 'In the quiet, the rain finds its own song.', bond: 14, joy: 7, trait: 'curious' },
    ],
  },
  {
    eyebrow: 'STORY 03 · THE PAPER GARDEN',
    title: 'A folded flower will not open.',
    body: 'Mori found it tucked under the room’s floorboards. The creases still remember another pair of hands.',
    choices: [
      { label: 'Fold a friend for it', reply: 'Two paper flowers lean together and finally bloom.', bond: 11, joy: 11, trait: 'playful' },
      { label: 'Trace every crease', reply: 'Mori learns the old pattern and keeps it safe.', bond: 15, joy: 5, trait: 'curious' },
      { label: 'Warm it patiently', reply: 'Held close, the paper softens and opens on its own.', bond: 13, joy: 8, trait: 'gentle' },
    ],
  },
  {
    eyebrow: 'STORY 04 · THE LONG SIGNAL',
    title: 'A voice from an older pocket world.',
    body: 'The device hums with a message recorded long before Mori hatched. It is asking whether anyone is still listening.',
    choices: [
      { label: 'Answer with your song', reply: 'Mori sends back the very first hum you shared.', bond: 16, joy: 10, trait: 'gentle' },
      { label: 'Map where it came from', reply: 'Mori sketches a route toward a world nobody has visited.', bond: 14, joy: 8, trait: 'curious' },
      { label: 'Reply in secret taps', reply: 'Tap. Tap. The old signal laughs and taps back.', bond: 12, joy: 15, trait: 'playful' },
    ],
  },
]

export const STORY_COUNT = STORY_EVENTS.length

export const getStoryBondRequirement = (storyIndex: number) => storyIndex * 10 + 4

export const isStoryUnlocked = (storyIndex: number, bond: number) => (
  storyIndex < STORY_COUNT && bond >= getStoryBondRequirement(storyIndex)
)
