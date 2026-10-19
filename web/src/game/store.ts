// React is a view of the native headless Mori engine; it owns no second save or clock.
import { useSyncExternalStore } from 'react'
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
const names = ['care','completeActivity','chooseStory','purchaseKeepsake','toggleKeepsake','openStory','closeStory','setTheme','setMode','setCharacter','setHeadphones','sootheEgg','exportSave','importSave','reset'] as const

/*
 * 最小外部 store（替代 zustand，语义与引擎内部 shim 一致）：
 * 平台禁入清单含 zustand，而这里只是 NeoNative 快照的视图层，
 * 用 useSyncExternalStore 实现同等的 create/getState/setState + 选择器订阅即可。
 */
type SetSnapshot = (snapshot: GameState) => void
function createStore(initializer: (set: SetSnapshot) => GameState) {
  let state: GameState
  const listeners = new Set<() => void>()
  const set: SetSnapshot = (snapshot) => {
    state = { ...state, ...snapshot }
    listeners.forEach((listener) => listener())
  }
  state = initializer(set)
  function useStore(): GameState
  function useStore<T>(selector: (snapshot: GameState) => T): T
  function useStore<T>(selector?: (snapshot: GameState) => T): GameState | T {
    const snapshot = useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      () => state,
      () => state,
    )
    return selector ? selector(snapshot) : snapshot
  }
  return Object.assign(useStore, {
    getState: () => state,
    setState: (snapshot: GameState) => set(snapshot),
  })
}

export const useGameStore = createStore((set) => {
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
