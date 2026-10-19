import { useState } from 'react'

const STEPS = [
  {
    number: '01', icon: '◉‿◉', eyebrow: '认识你的口袋伙伴',
    title: '这是点点，先打个招呼吧。',
    body: '点点会回应照料，记住故事里的选择，陪你一起成长。',
    tip: '轻点画面里的点点，就能陪它玩耍。',
  },
  {
    number: '02', icon: '♥', eyebrow: '读懂状态',
    title: '五个状态，读懂它的心情。',
    body: '饱食、心情、清洁、精力和健康会随时间变化，也影响点点的表情与动作。',
    tip: '日常陪伴推荐轻松模式。经典模式需要更勤快地照料。',
  },
  {
    number: '03', icon: '● ✦ ≈ ☾', eyebrow: '照料与陪伴',
    title: '每一次照料，都让今天不同。',
    body: '喂食、陪玩、洗澡、休息、拥抱或探索。跟随点点的状态做选择。',
    tip: '亲密度提升会解锁回忆，你的选择会影响性格和成长。',
  },
  {
    number: '04', icon: '★', eyebrow: '留下日常的小仪式',
    title: '玩游戏，收集星屑，明天再见。',
    body: '小游戏提升心情和亲密度。赢得星屑后，可以装饰点点和房间。',
    tip: '点击音符可播放音乐。返回桌面后音乐会停止。',
  },
] as const

interface TutorialProps {
  open: boolean
  onFinish: () => void
}

export function FirstRunTutorial({ open, onFinish }: TutorialProps) {
  const [step, setStep] = useState(0)
  if (!open) return null
  const card = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="tutorial-overlay" role="presentation">
      <section className="tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
        <div className="tutorial-visual" aria-hidden="true">
          <span className="tutorial-number">{card.number}</span>
          <i>{card.icon}</i>
          <div className="tutorial-device"><b>◉‿◉</b></div>
        </div>
        <div className="tutorial-copy">
          <button className="tutorial-skip" onClick={onFinish}>跳过教程</button>
          <p className="eyebrow">{card.eyebrow}</p>
          <h2 id="tutorial-title">{card.title}</h2>
          <p>{card.body}</p>
          <div className="tutorial-tip"><span>提示</span>{card.tip}</div>
          <div className="tutorial-footer">
            <div className="tutorial-dots" aria-label={`Tutorial step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((item, index) => <i key={item.number} className={index === step ? 'active' : ''} />)}
            </div>
            <div className="tutorial-nav">
              {step > 0 && <button onClick={() => setStep((value) => value - 1)}>BACK</button>}
              <button className="primary" onClick={() => isLast ? onFinish() : setStep((value) => value + 1)}>
                {isLast ? '进入小世界' : '下一步'} <b>→</b>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}