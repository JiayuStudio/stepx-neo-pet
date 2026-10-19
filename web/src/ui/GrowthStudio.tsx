import {
  INCIDENT_BY_ID,
  KEEPSAKES,
  PERSONALITIES,
  getDominantPersonality,
  getGrowthProgress,
} from '../game/progression'
import { useGameStore } from '../game/store'
import type { KeepsakeId, PersonalityId } from '../game/types'

const TRAIT_COPY: Record<PersonalityId, string> = {
  gentle: '温柔陪伴与细心照料',
  playful: '游戏、运动和惊喜',
  curious: '探索和用心的小习惯',
}



export const GrowthStudio = () => {
  const game = useGameStore()
  const personalityId = getDominantPersonality(game.personalityScores, game.personalityFocus)
  const personality = PERSONALITIES.find(({ id }) => id === personalityId) ?? PERSONALITIES[0]
  const growth = getGrowthProgress(game.growthPoints)
  const incident = game.activeIncident ? INCIDENT_BY_ID[game.activeIncident.id] : null
  const traitMaximum = Math.max(10, ...Object.values(game.personalityScores))
  const growthReady = Date.now() >= game.growthCooldownUntil
  const imprintTitle = growthReady ? '可以留下成长印记' : '成长印记蓄积中'
  const imprintDescription = growthReady
    ? '下一次照料会留下成长印记。'
    : '等待新印记时，照料仍然有效。'
  let nextStageName: string | null = null
  if (growth.stage.id === 'seedling') nextStageName = '绽放期'
  if (growth.stage.id === 'bloom') nextStageName = '星光期'
  const stageProgressLabel = nextStageName
    ? `${growth.stage.name} → ${nextStageName}`
    : `${growth.stage.name} · 已完成`
  const remainingGrowthLabel = nextStageName ? `还需 ${growth.remaining} 成长` : '成长已圆满'

  const itemState = (itemId: KeepsakeId) => {
    const owned = game.ownedItemIds.includes(itemId)
    const equipped = game.equippedWearable === itemId || game.equippedRoomItem === itemId
    return { owned, equipped }
  }

  return (
    <section className="growth-section" aria-labelledby="growth-title">
      <div className="growth-heading">
        <div>
          <p className="eyebrow">成长与性格</p>
          <h2 id="growth-title">成长手帐。</h2>
        </div>
        <p>每种性格都有自己的可爱之处。日常照料会慢慢影响它的性格。</p>
      </div>

      <div className="growth-dashboard">
        <article className="identity-card">
          <div className="identity-mark" aria-hidden="true">{personality.glyph}</div>
          <div>
            <p className="eyebrow">当前形态</p>
            <h3>{growth.stage.name} · {personality.name}</h3>
            <p>{personality.description}</p>
          </div>
          <div className={`imprint-status ${growthReady ? 'ready' : ''}`}>
            <b>{imprintTitle}</b>
            <span>{imprintDescription}</span>
          </div>
          <div className="growth-meter-block">
            <div className="meter-label">
              <span>{stageProgressLabel}</span>
              <strong>{remainingGrowthLabel}</strong>
            </div>
            <div className="growth-track" role="meter" aria-label={`${growth.stage.name} growth progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(growth.percent)}>
              <span style={{ width: `${growth.percent}%` }} />
            </div>
          </div>
          <div className="trait-list" aria-label="Mori's personality traits">
            {PERSONALITIES.map((trait) => {
              const value = game.personalityScores[trait.id]
              return (
                <div className="trait-row" key={trait.id}>
                  <span aria-hidden="true">{trait.glyph}</span>
                  <div><b>{trait.name}</b><small>{TRAIT_COPY[trait.id]}</small></div>
                  <div className="trait-track" role="meter" aria-label={`${trait.name} trait ${Math.round(value)}`} aria-valuemin={1} aria-valuemax={traitMaximum} aria-valuenow={Math.round(value)}>
                    <span style={{ width: `${value / traitMaximum * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="migration-note">亲密度、回忆和星屑都会保存在手机里。成长来自你们相处的每一天。</p>
        </article>

        <div className="studio-side">
          {incident && (
            <article className={`incident-card incident-${game.mode}`} role="status" aria-live="polite">
              <span className="incident-glyph" aria-hidden="true">{incident.glyph}</span>
              <div>
                <p className="eyebrow">小事件 · 需要你</p>
                <h3>{incident.title}</h3>
                <p>{incident.story}</p>
                <strong>试试{({feed:'喂食',play:'陪玩',wash:'洗澡',rest:'休息',cuddle:'拥抱',explore:'探索'})[incident.action]}。</strong>
                <small>{game.mode === 'cozy' ? '轻松模式：事件会等你，不会损伤健康。' : '经典模式：未处理的事件会慢慢影响健康。'}</small>
              </div>
              <a href="#care-panel">去照料 ↑</a>
            </article>
          )}

          <article className="workshop-card">
            <div className="workshop-heading">
              <div><p className="eyebrow">星屑工坊</p><h3>兑换小小收藏。</h3></div>
              <strong>✦ {game.sparks}</strong>
            </div>
            <p className="workshop-note">主题可以自由切换。小游戏赢得的星屑可用来兑换饰品和房间摆件。</p>
            <div className="keepsake-grid">
              {KEEPSAKES.map((item) => {
                const { owned, equipped } = itemState(item.id)
                const shortfall = Math.max(0, item.cost - game.sparks)
                return (
                  <article className={`keepsake-card ${equipped ? 'equipped' : ''}`} key={item.id}>
                    <span className="keepsake-glyph" aria-hidden="true">{item.glyph}</span>
                    <div className="keepsake-copy">
                      <small>{item.category === 'wearable' ? '饰品' : '摆件'} · {item.cost} 星屑</small>
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                    </div>
                    {!owned ? (
                      <div className="keepsake-action">
                        <button disabled={shortfall > 0} onClick={() => game.purchaseKeepsake(item.id)}>兑换 · {item.cost}</button>
                        {shortfall > 0 && <span>还需 {shortfall} 星屑</span>}
                      </div>
                    ) : (
                      <button
                        className="equip-button"
                        aria-pressed={equipped}
                        aria-label={`${item.name} is ${equipped ? 'equipped; remove it' : 'owned; equip it'}`}
                        onClick={() => game.toggleKeepsake(item.id)}
                      >
                        {equipped ? '已装备 · 卸下' : '已拥有 · 装备'}
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
