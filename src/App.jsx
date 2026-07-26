import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Check, ChevronDown, Copy, Heart, Search, Sparkles, X } from 'lucide-react'
import systems from './data/systems.json'
import RunnerPanel from './components/RunnerPanel.jsx'
import './App.css'

const ALL = 'すべて'
const storageKey = 'yuniba.workspace'

const loadWorkspace = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey)) || {}
    return { favorites: saved.favorites || [], statuses: saved.statuses || {}, histories: saved.histories || {} }
  } catch {
    return { favorites: [], statuses: {}, histories: {} }
  }
}

function App() {
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState(ALL)
  const [purpose, setPurpose] = useState(ALL)
  const [tool, setTool] = useState(ALL)
  const [selected, setSelected] = useState(null)
  const [workspace, setWorkspace] = useState(loadWorkspace)
  const [copied, setCopied] = useState(false)

  useEffect(() => localStorage.setItem(storageKey, JSON.stringify(workspace)), [workspace])

  const facets = useMemo(() => ({
    industries: [...new Set(systems.map((item) => item.industry))],
    purposes: [...new Set(systems.flatMap((item) => item.purposes))],
    tools: [...new Set(systems.flatMap((item) => item.tools))],
  }), [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ja')
    return systems.filter((item) => {
      const searchable = [item.title, item.challenge, item.solution, item.effect, item.category, ...item.purposes, ...item.tools].join(' ').toLocaleLowerCase('ja')
      return (!needle || searchable.includes(needle))
        && (industry === ALL || item.industry === industry)
        && (purpose === ALL || item.purposes.includes(purpose))
        && (tool === ALL || item.tools.includes(tool))
    })
  }, [query, industry, purpose, tool])

  const toggleFavorite = (id) => setWorkspace((current) => ({
    ...current,
    favorites: current.favorites.includes(id) ? current.favorites.filter((value) => value !== id) : [...current.favorites, id],
  }))

  const updateStatus = (id, status) => setWorkspace((current) => ({
    ...current,
    statuses: { ...current.statuses, [id]: status },
  }))

  const saveRun = (run) => setWorkspace((current) => ({
    ...current,
    statuses: { ...current.statuses, [run.systemId]: 'doing' },
    histories: {
      ...current.histories,
      [run.systemId]: [run, ...(current.histories[run.systemId] || [])].slice(0, 20),
    },
  }))

  const clearFilters = () => {
    setQuery('')
    setIndustry(ALL)
    setPurpose(ALL)
    setTool(ALL)
  }

  const copyBlueprint = async (item) => {
    const blueprint = `# ${item.title}\n\n## 解決する課題\n${item.challenge}\n\n## 実装方針\n${item.solution}\n\n## 期待する成果\n${item.effect}\n\n## 使用ツール\n${item.tools.join(' / ')}\n\nこの要件をMVPとして実装してください。入力・処理・出力・エラー時の復旧方法を明示し、テストも追加してください。`
    await navigator.clipboard.writeText(blueprint)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const completed = Object.values(workspace.statuses).filter((status) => status === 'done').length
  const active = Object.values(workspace.statuses).filter((status) => status === 'doing').length

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="YUNIBA ホーム"><span>Y</span> YUNIBA</a>
        <nav><a href="#library">ライブラリ</a><a href="#how">使い方</a></nav>
        <div className="progress-pill"><span>{completed}</span> 完了 <i /> <span>{active}</span> 進行中</div>
      </header>

      <main id="top">
        <section className="hero">
          <p className="eyebrow"><Sparkles size={14} /> 220 AI SYSTEMS, ONE WORKSPACE</p>
          <h1>仕事を変える仕組みは、<br /><em>もう揃っている。</em></h1>
          <p className="hero-copy">業界のリアルな課題から生まれた220のAI業務システム。探して、設計図をコピーして、今日から動かす。</p>
          <a className="primary-button" href="#library">システムを探す <ArrowRight size={17} /></a>
          <div className="hero-stats"><div><strong>220</strong><span>システム</span></div><div><strong>{facets.industries.length}</strong><span>業界</span></div><div><strong>{facets.tools.length}</strong><span>連携ツール</span></div></div>
        </section>

        <section className="library" id="library">
          <div className="section-heading"><div><p className="eyebrow">SYSTEM LIBRARY</p><h2>あなたの仕事に、次の一手を。</h2></div><p>{filtered.length}<small> / 220 systems</small></p></div>
          <div className="search-panel">
            <label className="search-box"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="課題・業務・ツールから検索" /></label>
            <div className="filters">
              <Filter label="業界" value={industry} values={facets.industries} onChange={setIndustry} />
              <Filter label="目的" value={purpose} values={facets.purposes} onChange={setPurpose} />
              <Filter label="ツール" value={tool} values={facets.tools} onChange={setTool} />
              {(query || industry !== ALL || purpose !== ALL || tool !== ALL) && <button className="clear-button" onClick={clearFilters}><X size={15} /> 解除</button>}
            </div>
          </div>

          <div className="card-grid">
            {filtered.map((item) => {
              const status = workspace.statuses[item.id]
              return <article className="system-card" key={item.id} onClick={() => setSelected(item)}>
                <div className="card-top"><span className="number">#{String(item.id).padStart(3, '0')}</span><button className={`icon-button ${workspace.favorites.includes(item.id) ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id) }} aria-label="お気に入り"><Heart size={18} /></button></div>
                <p className="industry">{item.industry} · {item.category}</p>
                <h3>{item.title}</h3>
                <p className="effect">{item.effect}</p>
                <div className="tags">{item.purposes.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="card-footer"><span className={`status ${status || ''}`}>{status === 'done' ? '実装済み' : status === 'doing' ? '進行中' : '未着手'}</span><span className="detail-link">設計を見る <ArrowRight size={15} /></span></div>
              </article>
            })}
          </div>
          {!filtered.length && <div className="empty"><Search size={34} /><h3>該当するシステムがありません</h3><button onClick={clearFilters}>条件をリセット</button></div>}
        </section>

        <section className="how" id="how"><p className="eyebrow">HOW IT WORKS</p><h2>3ステップで、アイデアを仕組みに。</h2><div><How number="01" title="見つける" text="業界・目的・ツールから、今の課題に近いシステムを検索。" /><How number="02" title="設計図をコピー" text="課題、実装方針、期待効果をまとめたAI向け設計図を取得。" /><How number="03" title="実装を進める" text="進捗を記録しながら、ひとつずつ自分の業務へ導入。" /></div></section>
      </main>

      <footer><a className="brand" href="#top"><span>Y</span> YUNIBA</a><p>220の知恵を、動く仕組みへ。</p></footer>

      {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><aside className="detail-panel" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={() => setSelected(null)} aria-label="閉じる"><X /></button>
        <p className="number">SYSTEM #{String(selected.id).padStart(3, '0')}</p><p className="industry">{selected.industry} · {selected.category}</p><h2>{selected.title}</h2>
        <Detail label="現場の課題" text={selected.challenge} /><Detail label="AIでこう自動化" text={selected.solution} accent /><Detail label="期待できる効果" text={selected.effect} />
        <div className="tool-list"><b>連携ツール</b>{selected.tools.map((item) => <span key={item}>{item}</span>)}</div>
        <RunnerPanel system={selected} history={workspace.histories[selected.id] || []} onRun={saveRun} />
        <div className="panel-actions"><button className="copy-button" onClick={() => copyBlueprint(selected)}>{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'コピーしました' : 'AI実装用の設計図をコピー'}</button><select value={workspace.statuses[selected.id] || ''} onChange={(event) => updateStatus(selected.id, event.target.value)}><option value="">未着手</option><option value="doing">進行中</option><option value="done">実装済み</option></select></div>
      </aside></div>}
    </div>
  )
}

function Filter({ label, value, values, onChange }) {
  return <label className="filter"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option>{ALL}</option>{values.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label>
}

function How({ number, title, text }) { return <article><span>{number}</span><BookOpen size={24} /><h3>{title}</h3><p>{text}</p></article> }
function Detail({ label, text, accent = false }) { return <section className={`detail-block ${accent ? 'accent' : ''}`}><h3>{label}</h3><p>{text}</p></section> }

export default App
