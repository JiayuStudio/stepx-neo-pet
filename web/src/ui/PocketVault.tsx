// Native file picker replaces browser downloads; original Mori transfer format and validator remain.
import { useState } from 'react'
import { useGameStore } from '../game/store'
export function PocketVault() {
  const importSave = useGameStore(s => s.importSave)
  const [pasted,setPasted] = useState('')
  const [message,setMessage] = useState('存档只保存在这台手机。卸载应用前请先导出备份。')
  const restore = () => {
    if (!window.confirm('用这份备份替换当前养成进度？')) return
    const result = importSave(pasted)
    if(result.ok){setPasted('');setMessage('备份已恢复。')}
    else setMessage(result.error)
  }
  return <section className="vault-section" aria-labelledby="vault-title">
    <div className="vault-heading"><div><p className="eyebrow">随身存档</p><h2 id="vault-title">保存我们的<br/><em>小世界。</em></h2></div><p>备份包含需求、亲密度、回忆、星屑、成长与收藏，可在换机时恢复。</p></div>
    <div className="vault-grid"><article className="vault-card"><h3>导出备份</h3><p>选择文件夹保存 JSON 存档。</p><div className="vault-actions"><button className="vault-primary" onClick={() => window.NeoNative.control('export')}>保存备份文件</button></div></article>
    <article className="vault-card"><h3>恢复进度</h3><p>恢复会替换当前存档，建议先备份。</p><div className="vault-actions"><button onClick={() => window.NeoNative.control('import')}>选择备份文件</button></div>
    <label className="vault-paste">或粘贴备份文本<textarea rows={3} value={pasted} onChange={e=>setPasted(e.target.value)} maxLength={200000}/></label><button className="vault-restore" disabled={!pasted.trim()} onClick={restore}>从文本恢复</button></article></div>
    <p className="vault-status" role="status">{message}</p>
  </section>
}
