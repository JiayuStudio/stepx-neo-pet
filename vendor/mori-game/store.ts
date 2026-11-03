import type { GameState } from './types'
export type { GameState, SaveExport, SaveImportResult } from './types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  CARE_GROWTH_COOLDOWN_MS,
  CARE_TRAIT,
  DEFAULT_CHARACTER_NAMES,
  INCIDENT_BY_ID,
  INCIDENT_REWARD_GROWTH,
  INCIDENT_REWARD_SPARKS,
  KEEPSAKE_BY_ID,
  applyTraitAward,
  canPurchaseKeepsake,
  isCharacterId,
  isEquippable,
  isKeepsakeId,
  scheduleIncidentAfterResolution,
  settleTimedState,
  utcDateKey,
} from './progression'
import { freshSnapshot, normalizeSnapshot } from './save'
import {
  canSendNotification,
  composeMessages,
  lifeStage,
  markNotificationSent,
  mergeMessages,
  pushMemorial,
  shouldFarewell,
  type NotifySettings,
  type QuietSettings,
} from './companion-life'
import { isStoryUnlocked, STORY_EVENTS } from './stories'
import { parseSaveTransfer, saveFileName, serializeSave } from './transfer'
import { clampNeed, type CareAction, type CharacterId, type GameMode, type GameSnapshot, type KeepsakeId, type MiniGameId, type PetNeeds, type ThemeId } from './types'

export { getStoryBondRequirement, isStoryUnlocked, STORY_COUNT, STORY_EVENTS } from './stories'

const ACTIVITY_SCORE_LIMIT: Record<MiniGameId, number> = {
  'star-catch': 100,
  'memory-flip': 20,
}





const normalizeActivityScore = (gameId: MiniGameId, score: number) => {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(ACTIVITY_SCORE_LIMIT[gameId], Math.floor(score)))
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

/** 0.3.9：每次状态推进后统一结算生命周期、消息与纪念。
 *  patch 只包含本次变化的字段，先与 previous 合并成完整状态再结算，
 *  避免缺失 farewellAt / messages / memorials 导致误判告别或清空历史。 */
const withLife = (previous: GameState, patch: Partial<GameState>, now: number): GameState => {
  const next = { ...previous, ...patch } as GameState
  const beforeStage = previous.lastStage ?? lifeStage(previous, previous.lastUpdated).stage
  const farewellDue = shouldFarewell(next, now)
  const farewellAt = farewellDue ? now : next.farewellAt
  const stageInfo = lifeStage({ ...next, farewellAt }, now)
  const healthBand: 'low' | 'ok' = next.needs.health < 30 ? 'low' : 'ok'

  const candidates = composeMessages({
    previous: {
      needs: previous.needs,
      lastUpdated: previous.lastUpdated,
      lastInteractionAt: previous.lastInteractionAt ?? previous.lastUpdated,
      healthBand: previous.healthBand ?? 'ok',
      lifeMode: previous.lifeMode ?? 'gentle',
      lifeStartedAt: previous.lifeStartedAt ?? null,
      ageMinutes: previous.ageMinutes,
      farewellAt: previous.farewellAt ?? null,
      hatched: previous.hatched,
    },
    next: { needs: next.needs, healthBand, farewellAt },
    now,
    stageChanged: beforeStage !== stageInfo.stage,
    stageName: stageInfo.name,
  })
  const merged = mergeMessages(next.messages ?? [], candidates, next.messageLedger ?? [])

  // 纪念只写一次：id 绑定生命周期起点，重复结算不会产生多条
  const memorials = farewellDue && next.farewellAt === null
    ? pushMemorial(next.memorials ?? [], {
        id: `farewell-${next.lifeStartedAt ?? now}`,
        at: now,
        petName: next.petName,
        character: next.character,
        days: stageInfo.days,
        bond: Math.round(next.bond),
        growthPoints: Math.round(next.growthPoints),
        storyIndex: next.storyIndex,
        reason: 'farewell',
      })
    : next.memorials

  return {
    ...next,
    farewellAt,
    messages: merged.messages,
    messageLedger: merged.ledger,
    memorials,
    lastStage: stageInfo.stage,
    healthBand,
  }
}

const applyLife = (state: GameState, now: number): GameState => {
  const settled = settleTimedState(state, now)
  return withLife(state, { ...settled }, settled.lastUpdated)
}

/** 重新领养 / 重置时保留纪念与设置，避免静默丢档；同一伙伴不会重复写入 */
const archiveCurrent = (state: GameState, now: number, reason: 'farewell' | 'rehomed') => {
  const existing = state.memorials ?? []
  // 已经为这次告别写过纪念：不再重复
  if (state.farewellAt !== null && existing.some((item) => item.id === `farewell-${state.lifeStartedAt}`)) return existing
  const identity = state.farewellAt !== null ? `farewell-${state.farewellAt}` : `rehomed-${now}`
  if (existing.some((item) => item.id === identity)) return existing
  return pushMemorial(existing, {
    id: identity,
    at: now,
    petName: state.petName,
    character: state.character,
    days: lifeStage(state, now).days,
    bond: Math.round(state.bond),
    growthPoints: Math.round(state.growthPoints),
    storyIndex: state.storyIndex,
    reason,
  })
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...freshSnapshot(),
      tick: () => set((state) => applyLife(state, Date.now())),
      care: (action) => set((state) => {
        if (state.farewellAt !== null) return { ...state, lastReply: '它正在安静休息。想继续陪伴的话，可以重新领养一位小伙伴。' }
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
        return withLife(state, {
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
          lastInteractionAt: now,
        }, now)
      }),
      completeActivity: (gameId, score) => set((state) => {
        if (state.farewellAt !== null) return state
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

        return withLife(state, {
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
          lastInteractionAt: settled.lastUpdated,
        }, settled.lastUpdated)
      }),
      chooseStory: (choiceIndex) => set((state) => {
        if (state.farewellAt !== null) return state
        const event = STORY_EVENTS[state.storyIndex]
        const choice = event?.choices[choiceIndex]
        if (!choice) return state
        const settled = settleTimedState(state, Date.now())
        return withLife(state, {
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
          lastInteractionAt: settled.lastUpdated,
        }, settled.lastUpdated)
      }),
      purchaseKeepsake: (itemId) => set((state) => {
        if (state.farewellAt !== null) return state
        if (!isKeepsakeId(itemId) || !canPurchaseKeepsake(state.sparks, state.ownedItemIds, itemId)) return state
        const item = KEEPSAKE_BY_ID[itemId]
        return {
          sparks: state.sparks - item.cost,
          ownedItemIds: [...state.ownedItemIds, itemId],
          lastAction: 'workshop',
          actionNonce: state.actionNonce + 1,
          lastInteractionAt: Date.now(),
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
      // 0.3.3 角色切换：仍在用默认名时跟随角色默认名（星跃/方跃），手动命名过则保留
      setCharacter: (character) => set((state) => {
        if (!isCharacterId(character) || character === state.character) return state
        const petName = state.petName === DEFAULT_CHARACTER_NAMES[state.character] ? DEFAULT_CHARACTER_NAMES[character] : state.petName
        return { ...settleTimedState(state, Date.now()), character, petName, lastAction: 'workshop', actionNonce: state.actionNonce + 1, lastReply: null }
      }),
      // 蛋阶段轻触安抚：只记录时间戳与反馈，不加速孵化、不影响成长
      sootheEgg: () => set((state) => {
        if (state.hatched || !state.egg) return state
        return { ...state, eggSoothedAt: Date.now(), actionNonce: state.actionNonce + 1, lastAction: null, lastReply: '蛋轻轻晃了晃，好像在回应你。' }
      }),
      setHeadphones: (on) => set((state) => (
        state.headphones === on === true ? state : { ...state, headphones: on === true, lastAction: 'workshop', actionNonce: state.actionNonce + 1, lastReply: null }
      )),
      setLifeMode: (mode) => set((state) => {
        if (state.lifeMode === mode) return state
        if (state.farewellAt !== null) return { ...state, lastReply: '它已经安静告别了，模式切换不会让它回来。可以在纪念里回看，或重新领养。' }
        const now = Date.now()
        if (mode !== 'cycle') {
          return { ...state, lifeMode: 'gentle', lifeStartedAt: null, lastReply: '已回到温柔陪伴：它会一直陪着你，不会告别。' }
        }
        // 进入生命周期模式一律从当前时刻重新起算，旧档年龄不会立刻判为告别
        return { ...state, lifeMode: 'cycle', lifeStartedAt: now, farewellAt: null, lastReply: '生命周期模式已开启：从今天开始记录相处的日子。' }
      }),
      setQuiet: (patch) => set((state) => ({ quiet: { ...state.quiet, ...patch } })),
      setNotify: (patch) => set((state) => ({ notify: { ...state.notify, ...patch } })),
      recordNotification: (sentAt) => set((state) => ({
        notify: markNotificationSent(state.notify, sentAt),
      })),
      takeNotification: (now, systemQuiet) => {
        const state = get()
        const latest = state.messages.length ? state.messages[0] : null
        if (!latest) return { ok: false, reason: '没有新消息' }
        if (latest.id === state.lastNotifiedMessageId) return { ok: false, reason: '这条消息已经处理过' }
        // 只发新产生的消息：勿扰期间积压的旧消息不补发
        if (now - latest.at > 90_000) {
          set({ lastNotifiedMessageId: latest.id })
          return { ok: false, reason: '消息已过期，不补发' }
        }
        const decision = canSendNotification(state.notify, state.quiet, now, systemQuiet)
        if (!decision.ok) {
          // 勿扰 / 达上限时不排队，之后也不补发
          set({ lastNotifiedMessageId: latest.id, notify: decision.settings })
          return { ok: false, reason: decision.reason }
        }
        set({ notify: decision.settings, lastNotifiedMessageId: latest.id })
        return { ok: true, reason: '可以发送', id: latest.id, title: '拓麻歌子', body: latest.text, vibrate: state.notify.vibrate }
      },
      notificationPreview: (now, systemQuiet) => canSendNotification(get().notify, get().quiet, now, systemQuiet),
      clearMessages: () => set({ messages: [] }),
      adoptAgain: () => set((state) => {
        const now = Date.now()
        const fresh = freshSnapshot(now)
        return {
          ...fresh,
          // 保留纪念与陪伴设置：重新领养不静默丢档
          memorials: archiveCurrent(state, now, state.farewellAt === null ? 'rehomed' : 'farewell'),
          quiet: state.quiet,
          notify: state.notify,
          lastReply: '新的小生命来到了口袋里。以前的相处记录都留在纪念里。',
        }
      }),
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
      reset: () => set((state) => {
        const now = Date.now()
        return {
          ...freshSnapshot(now),
          // 重新领养前先把当前伙伴写入纪念，纪念与设置不会被静默删除
          memorials: archiveCurrent(state, now, 'rehomed'),
          quiet: state.quiet,
          notify: state.notify,
        }
      }),
    }),
    {
      name: 'pocket-worlds-save-v1',
      version: 3,
      migrate: (persistedState) => normalizeSnapshot(persistedState),
      merge: (persistedState, currentState) => ({ ...currentState, ...normalizeSnapshot(persistedState) }),
    },
  ),
)
