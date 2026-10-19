import { useEffect, useState } from 'react'
export function NeoCompanion() {
  const [companion, setCompanion] = useState(() => JSON.parse(window.NeoNative.companion()))
  useEffect(() => {
    const timer = window.setInterval(() => setCompanion(JSON.parse(window.NeoNative.companion())), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return <section className="neo-companion" aria-label="背屏陪伴">
    <div><strong>拓麻歌子 · 背屏陪伴</strong><small>{companion.status}</small></div>
    <button className="neo-toggle" onClick={() => window.NeoNative.control(companion.running ? 'stop' : 'start')}>{companion.running ? '停止陪伴' : '开启背屏'}</button>
    <button onClick={() => window.NeoNative.control('settings')}>后台设置</button>
    <details><summary>使用说明 · 0.3.3</summary><p>正面与背面共享养成进度。开启背屏后，返回桌面或锁屏仍可陪伴。背屏朝下、省电或过热时会暂停显示；强行停止或重启后请重新开启。新领养从蛋开始：呼吸轻晃、出现裂纹、破壳变成星跃 / 方跃，耳机开关也会同步到背屏形象。</p><p>背屏是宠物的像素形象：星跃是圆尖朝上的胖圆星形精灵（白色竖眼），方跃是宽扁的像素方块（阶梯头顶、方眼），性格印记和饰品都会跟随正面宠物。轻松模式适合日常陪伴，经典模式有更快的状态衰减。可在「照料」页随时切换星跃 / 方跃与耳机。</p><button onClick={() => window.NeoNative.control('licenses')}>开源许可</button></details>
  </section>
}
