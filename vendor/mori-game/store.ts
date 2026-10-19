import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  CARE_GROWTH_COOLDOWN_MS,
  CARE_TRAIT,
  INCIDENT_BY_ID,
  INCIDENT_REWARD_GROWTH,
  INCIDENT_REWARD_SPARKS,
  KEEPSAKE_BY_ID,
  applyTraitAward,
  canPurchaseKeepsake,
  isEquippable,
  isKeepsakeId,
  scheduleIncidentAfterResolution,
  settleTimedState,
  utcDateKey,
} from './progression'
import { freshSnapshot, normalizeSnapshot } from './save'
import { isStoryUnlocked, STORY_EVENTS } from './stories'
import { parseSaveTransfer, saveFileName, serializeSave } from './transfer'
import { clampNeed, type CareAction, type GameMode, type GameSnapshot, type KeepsakeId, type MiniGameId, type PetNeeds, type ThemeId } from './types'

export { getStoryBondRequirement, isStoryUnlocked, STORY_COUNT, STORY_EVENTS } from './stories'

const ACTIVITY_SCORE_LIMIT: Record<MiniGameId, number> = {
  'star-catch': 100,
  'memory-flip': 20,
}

export interface SaveExport {
  contents: string
  fileName: string
}

export type SaveImportResult = { ok: true } | { ok: false; error: string }

const normalizeActivityScore = (gameId: MiniGameId, score: number) => {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(ACTIVITY_SCORE_LIMIT[gameId], Math.floor(score)))
}

interface GameState extends GameSnapshot {
  tick: () => void
  care: (action: CareAction) => void
  completeActivity: (gameId: MiniGameId, score: number) => void
  chooseStory: (choiceIndex: number) => void
  purchaseKeepsake: (itemId: KeepsakeId) => void
  toggleKeepsake: (itemId: KeepsakeId) => void
  openStory: () => void
  closeStory: () => void
  setTheme: (themeId: ThemeId) => void
  setMode: (mode: GameMode) => void
  exportSave: () => SaveExport
  importSave: (contents: string) => SaveImportResult
  reset: () => void
}

const CARE_EFFECTS: Record<CareAction, Partial<PetNeeds>> = {
  feed: { hunger: 26, health: 3, hygiene: -4 },
  play: { joy: 28, energy: -10, hunger: -4 },
  wash: { hygiene: 34, joy: 4 },
  rest: { energy: 30, health: 4, hunger: -6 },
  cuddle: { joy: 16, health: 3, energy: 2 },
  explore: { joy: 22, energy: -13, hunger: -9, hygiene: -3 },
}

const applyCareEffects = (current: PetNeeds, action: CareAction) => {
  const needs = { ...current }
  const effects = CARE_EFFECTS[action]
  for (const key of Object.keys(effects) as (keyof PetNeeds)[]) {
    needs[key] = clampNeed(needs[key] + (effects[key] ?? 0))
  }
  return needs
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...freshSnapshot(),
      tick: () => set((state) => settleTimedState(state, Date.now())),
      care: (action) => set((state) => {
        const sampledNow = Date.now()
        const settled = settleTimedState(state, sampledNow)
        const now = settled.lastUpdated
        const growthReady = now >= state.growthCooldownUntil
        const trait = CARE_TRAIT[action]
        let growthPoints = state.growthPoints + (growthReady ? 4 : 0)
        const personalityScores = growthReady ? applyTraitAward(state.personalityScores, trait, 3) : state.personalityScores
        const personalityFocus = growthReady ? trait : state.personalityFocus
        let sparks = state.sparks
        let activeIncident = settled.activeIncident
        let nextIncidentAt = settled.nextIncidentAt
        let lastReply = growthReady ? `${trait[0].toUpperCase()}${trait.slice(1)} imprint · +4 growth.` : null

        if (activeIncident && INCIDENT_BY_ID[activeIncident.id].action === action) {
          const resolvedId = activeIncident.id
          sparks += INCIDENT_REWARD_SPARKS
          growthPoints += INCIDENT_REWARD_GROWTH
          activeIncident = null
          nextIncidentAt = scheduleIncidentAfterResolution(now, state.actionNonce, state.storyIndex, resolvedId, state.ownedItemIds.length)
          lastReply = `${INCIDENT_BY_ID[resolvedId].title} cleared with ${action}. +${INCIDENT_REWARD_SPARKS} Sparks · +${INCIDENT_REWARD_GROWTH} growth.`
        }

        const bondGain = action === 'cuddle' ? 4 : action === 'play' || action === 'explore' ? 3 : 1.5
        const nextBond = clampNeed(state.bond + bondGain)
        const storyReady = isStoryUnlocked(state.storyIndex, nextBond)
        return {
          ...settled,
          needs: applyCareEffects(settled.needs, action),
          bond: nextBond,
          sparks,
          growthPoints,
          growthCooldownUntil: growthReady ? now + CARE_GROWTH_COOLDOWN_MS : state.growthCooldownUntil,
          personalityScores,
          personalityFocus,
          activeIncident,
          nextIncidentAt,
          lastAction: action,
          actionNonce: state.actionNonce + 1,
          storyOpen: state.storyOpen || storyReady,
          lastReply,
        }
      }),
      completeActivity: (gameId, score) => set((state) => {
        const settled = settleTimedState(state, Date.now())
        const safeScore = normalizeActivityScore(gameId, score)
        const today = utcDateKey(settled.lastUpdated)
        const previousActivity = state.lastActivityDate
          ? Date.parse(`${state.lastActivityDate}T00:00:00Z`)
          : null
        const daysSinceLastActivity = previousActivity === null
          ? null
          : Math.round((Date.parse(`${today}T00:00:00Z`) - previousActivity) / 86_400_000)

        let playStreak = 1
        if (daysSinceLastActivity === 0) playStreak = state.playStreak
        if (daysSinceLastActivity === 1) playStreak = state.playStreak + 1

        const reward = Math.max(3, Math.floor(safeScore / 2))
        const canEarnDailyGrowth = state.lastGrowthActivityDate !== today
        const growthAward = canEarnDailyGrowth ? 6 : 0
        const trait = gameId === 'star-catch' ? 'playful' : 'curious'
        const personalityScores = canEarnDailyGrowth
          ? applyTraitAward(state.personalityScores, trait, 3)
          : state.personalityScores
        const personalityFocus = canEarnDailyGrowth ? trait : state.personalityFocus
        const lastGrowthActivityDate = canEarnDailyGrowth ? today : state.lastGrowthActivityDate
        const growthMessage = canEarnDailyGrowth ? ' and a +6 growth echo' : ''

        return {
          ...settled,
          sparks: state.sparks + reward,
          playStreak,
          lastActivityDate: today,
          lastGrowthActivityDate,
          growthPoints: state.growthPoints + growthAward,
          personalityScores,
          personalityFocus,
          activityBest: { ...state.activityBest, [gameId]: Math.max(state.activityBest[gameId], safeScore) },
          needs: {
            ...settled.needs,
            joy: clampNeed(settled.needs.joy + Math.min(28, 8 + safeScore)),
            energy: clampNeed(settled.needs.energy - 6),
            hunger: clampNeed(settled.needs.hunger - 2),
          },
          bond: clampNeed(state.bond + 2 + safeScore / 10),
          lastAction: 'activity' as const,
          actionNonce: state.actionNonce + 1,
          lastReply: `${state.petName} found ${reward} Sparks${growthMessage} in the Tamagochi Arcade!`,
        }
      }),
      chooseStory: (choiceIndex) => set((state) => {
        const event = STORY_EVENTS[state.storyIndex]
        const choice = event?.choices[choiceIndex]
        if (!choice) return state
        const settled = settleTimedState(state, Date.now())
        return {
          ...settled,
          bond: clampNeed(state.bond + choice.bond),
          needs: { ...settled.needs, joy: clampNeed(settled.needs.joy + choice.joy) },
          personalityScores: applyTraitAward(state.personalityScores, choice.trait, 5),
          personalityFocus: choice.trait,
          growthPoints: state.growthPoints + 12,
          storyIndex: state.storyIndex + 1,
          storyOpen: false,
          lastAction: 'story',
          actionNonce: state.actionNonce + 1,
          lastReply: `${choice.reply} · +12 growth.`,
        }
      }),
      purchaseKeepsake: (itemId) => set((state) => {
        if (!isKeepsakeId(itemId) || !canPurchaseKeepsake(state.sparks, state.ownedItemIds, itemId)) return state
        const item = KEEPSAKE_BY_ID[itemId]
        return {
          sparks: state.sparks - item.cost,
          ownedItemIds: [...state.ownedItemIds, itemId],
          lastAction: 'workshop',
          actionNonce: state.actionNonce + 1,
          lastReply: `${item.name} joined Mori’s keepsake collection.`,
        }
      }),
      toggleKeepsake: (itemId) => set((state) => {
        if (!isKeepsakeId(itemId)) return state
        const item = KEEPSAKE_BY_ID[itemId]
        if (!isEquippable(state.ownedItemIds, itemId, item.category)) return state
        const key = item.category === 'wearable' ? 'equippedWearable' : 'equippedRoomItem'
        const equipped = state[key] === itemId ? null : itemId
        return {
          [key]: equipped,
          lastAction: 'workshop',
          actionNonce: state.actionNonce + 1,
          lastReply: equipped ? `${item.name} is now part of Mori’s world.` : `${item.name} returned to the keepsake drawer.`,
        }
      }),
      openStory: () => set((state) => ({ storyOpen: isStoryUnlocked(state.storyIndex, state.bond) })),
      closeStory: () => set({ storyOpen: false }),
      setTheme: (themeId) => set({ themeId, lastReply: null }),
      setMode: (mode) => set((state) => ({ ...settleTimedState(state, Date.now()), mode })),
      exportSave: () => {
        const now = Date.now()
        const snapshot = normalizeSnapshot(get(), now)
        return {
          contents: serializeSave(snapshot, now),
          fileName: saveFileName(snapshot.petName, now),
        }
      },
      importSave: (contents) => {
        const parsed = parseSaveTransfer(contents, Date.now())
        if (!parsed.ok) return parsed
        set({
          ...parsed.snapshot,
          storyOpen: false,
          lastAction: null,
          lastReply: `${parsed.snapshot.petName} woke up from a restored backup.`,
        })
        return { ok: true }
      },
      reset: () => set(freshSnapshot()),
    }),
    {
      name: 'pocket-worlds-save-v1',
      version: 3,
      migrate: (persistedState) => normalizeSnapshot(persistedState),
      merge: (persistedState, currentState) => ({ ...currentState, ...normalizeSnapshot(persistedState) }),
    },
  ),
)
