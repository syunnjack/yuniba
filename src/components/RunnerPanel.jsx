import { useState } from 'react'
import { Check, Clipboard, Download, FileUp, LockKeyhole, Play, RotateCcw, Trash2 } from 'lucide-react'
import { executeSystem, getEngine, needsExternalConnection } from '../lib/systemEngine.js'
import { executeBatchSystem, parseBatchFile } from '../lib/batchEngine.js'
import './RunnerPanel.css'

function RunnerPanel({ system, history, onRun }) {
  const [objective, setObjective] = useState(system.title)
  const [input, setInput] = useState('')
  const [result, setResult] = useState(history[0] || null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [batch, setBatch] = useState(null)
  const engine = getEngine(system)
  const external = needsExternalConnection(system)

  const runSystem = () => {
    if (!objective.trim()) {
      setError('実行目的を入力してください。')
      return
    }
    if (!input.trim()) {
      setError('「処理する情報」を入力してから実行してください。')
      return
    }
    setError('')
    const next = batch
      ? executeBatchSystem({ system, records: batch.records, objective: objective.trim(), sourceName: batch.name })
      : executeSystem({ system, input: input.trim(), objective: objective.trim() })
    setResult(next)
    onRun(next)
  }

  const loadFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const records = parseBatchFile({ name: file.name, text: await file.text() })
      if (!records.length) throw new Error('データがありません')
      setBatch({ name: file.name, records })
      setInput(records[0])
      setError('')
    } catch {
      setBatch(null)
      setError('CSV、JSON、TXT形式の内容を確認してください。')
    }
    event.target.value = ''
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
    <label>実行目的<input value={objective} onChange={(event) => { setObjective(event.target.value); setError('') }} /></label>
    <div className="input-heading"><span>処理する情報 <b>必須</b></span><label className="file-button"><FileUp size={14} /> CSV・JSON・TXTを読込<input type="file" accept=".csv,.json,.txt,text/csv,application/json,text/plain" onChange={loadFile} /></label></div>
    {batch && <div className="batch-notice"><span>{batch.name} · {batch.records.length}件をローカル一括処理</span><button onClick={() => { setBatch(null); setInput('') }} aria-label="ファイル入力を解除"><Trash2 size={14} /></button></div>}
    <label className="input-field"><textarea value={input} onChange={(event) => { setInput(event.target.value); setBatch(null); setError('') }} placeholder="例：新サービスの特徴、対象顧客、期限など。複数件は改行で区切れます。" rows="6" /></label>
    {error && <p className="runner-error" role="alert">{error}</p>}
    <button className="run-button" onClick={runSystem}><Play size={17} /> {batch ? `${batch.records.length}件を一括実行` : 'このシステムを実行'}</button>
    {result && <div className="result-box">
      <div className="result-toolbar"><span><Check size={15} /> 生成完了</span><div><button onClick={copyResult}>{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? 'コピー済み' : 'コピー'}</button><button onClick={downloadResult}><Download size={15} /> 保存</button></div></div>
      <pre>{result.output}</pre>
    </div>}
    {history.length > 0 && <details className="run-history"><summary><RotateCcw size={14} /> 実行履歴 {history.length}件</summary>{history.slice(0, 5).map((item) => <button key={item.id} onClick={() => setResult(item)}>{new Date(item.createdAt).toLocaleString('ja-JP')} · {item.engine}</button>)}</details>}
  </section>
}

export default RunnerPanel
