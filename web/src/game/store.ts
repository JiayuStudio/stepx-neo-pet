// React is a view of the native headless Mori engine; it owns no second save or clock.
import { create } from 'zustand'
import type { GameState } from './mori-store'
export { getStoryBondRequirement, isStoryUnlocked, STORY_COUNT, STORY_EVENTS } from './stories'
export type { SaveExport, SaveImportResult } from './mori-store'

declare global {
  interface Window {
    NeoNative: {
      snapshot(): string
      dispatch(action: string, args: string): string
      companion(): string
      control(action: string): void
    }
  }
}
const names = ['care','completeActivity','chooseStory','purchaseKeepsake','toggleKeepsake','openStory','closeStory','setTheme','setMode','exportSave','importSave','reset'] as const
export const useGameStore = create<GameState>((set) => {
  const actions: Record<string, (...args: unknown[]) => unknown> = {}
  for (const name of names) actions[name] = (...args) => {
    const response = JSON.parse(window.NeoNative.dispatch(name, JSON.stringify(args)))
    if (response.error) throw new Error(response.error)
    set(response.snapshot)
    return response.result
  }
  actions.tick = () => set(JSON.parse(window.NeoNative.snapshot()))
  return { ...JSON.parse(window.NeoNative.snapshot()), ...actions } as GameState
})
window.setInterval(() => {
  if (document.visibilityState === 'visible') useGameStore.getState().tick()
}, 1000)
window.addEventListener('neo-resume', () => useGameStore.getState().tick())
