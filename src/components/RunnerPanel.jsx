import { useState } from 'react'
import { Check, Clipboard, Download, LockKeyhole, Play, RotateCcw } from 'lucide-react'
import { executeSystem, getEngine, needsExternalConnection } from '../lib/systemEngine.js'
import './RunnerPanel.css'

function RunnerPanel({ system, history, onRun }) {
  const [objective, setObjective] = useState(system.title)
  const [input, setInput] = useState('')
  const [result, setResult] = useState(history[0] || null)
  const [copied, setCopied] = useState(false)
  const engine = getEngine(system)
  const external = needsExternalConnection(system)

  const runSystem = () => {
    if (!input.trim() || !objective.trim()) return
    const next = executeSystem({ system, input: input.trim(), objective: objective.trim() })
    setResult(next)
    onRun(next)
  }

  const copyResult = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.output)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const downloadResult = () => {
    if (!result) return
    const url = URL.createObjectURL(new Blob([result.output], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${system.slug}-${Date.now()}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="runner">
    <div className="runner-heading">
      <div><p>LOCAL EXECUTION ENGINE</p><h3>{engine.label}</h3></div>
      <span className="private-badge"><LockKeyhole size={13} /> ローカル処理</span>
    </div>
    {external && <div className="connection-notice">外部サービスへの送信は行いません。現在はローカル成果物を生成し、承認後の接続作業として残します。</div>}
    <label>実行目的<input value={objective} onChange={(event) => setObjective(event.target.value)} /></label>
    <label>処理する情報<textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="機密情報は必要最小限にし、処理対象を入力してください。複数件は改行で区切れます。" rows="6" /></label>
    <button className="run-button" onClick={runSystem} disabled={!input.trim() || !objective.trim()}><Play size={17} /> このシステムを実行</button>
    {result && <div className="result-box">
      <div className="result-toolbar"><span><Check size={15} /> 生成完了</span><div><button onClick={copyResult}>{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? 'コピー済み' : 'コピー'}</button><button onClick={downloadResult}><Download size={15} /> 保存</button></div></div>
      <pre>{result.output}</pre>
    </div>}
    {history.length > 0 && <details className="run-history"><summary><RotateCcw size={14} /> 実行履歴 {history.length}件</summary>{history.slice(0, 5).map((item) => <button key={item.id} onClick={() => setResult(item)}>{new Date(item.createdAt).toLocaleString('ja-JP')} · {item.engine}</button>)}</details>}
  </section>
}

export default RunnerPanel
