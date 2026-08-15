const engineRules = [
  { id: 'document', label: '文書・帳票生成', match: ['提出書類・申請', 'リーガル・契約', '上場・IR・ISO', '議事録・文字起こし'] },
  { id: 'finance', label: '経理・財務処理', match: ['経理・バックオフィス', '資金繰り・融資・補助金'] },
  { id: 'content', label: 'コンテンツ制作', match: ['SEO・ブログ', 'SNS運用', 'クリエイティブ制作', '広告運用', 'MEO・店舗集客'] },
  { id: 'crm', label: '顧客・営業管理', match: ['営業・CRM', 'CS・サポート', '採用・HR', '人事・労務', '評価・育成'] },
  { id: 'data', label: 'データ収集・整形', match: ['書類OCR・データ化', 'スクレイピング・調査'] },
  { id: 'operations', label: '業務・在庫管理', match: ['工程・在庫・発注管理'] },
]

export const getEngine = (system) => engineRules.find((rule) => rule.match.some((purpose) => system.purposes.includes(purpose))) || {
  id: 'automation', label: '汎用業務自動化', match: [],
}

export const needsExternalConnection = (system) => system.tools.some((tool) => !['Claude Code', 'Obsidian', 'MCP連携'].includes(tool))

const cleanLines = (value) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
const timestamp = () => new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())

const generators = {
  document: ({ system, input, objective }) => `# ${system.title}\n\n## 文書情報\n- 作成日時: ${timestamp()}\n- 対象: ${objective}\n- 業界: ${system.industry}\n\n## 要約\n${input}\n\n## 確認事項\n- [ ] 固有名詞・日付・金額の確認\n- [ ] 個人情報・機密情報のマスキング\n- [ ] 承認者による最終確認\n\n## 推奨構成\n1. 背景と目的\n2. 対象範囲\n3. 実施内容\n4. 結果・判断事項\n5. 次のアクション`,
  finance: ({ system, input, objective }) => `# ${system.title} 処理レポート\n\n処理日時: ${timestamp()}\n目的: ${objective}\n\n## 入力データ\n${input}\n\n## 処理結果\n${cleanLines(input).map((line, index) => `- 明細${index + 1}: ${line}`).join('\n')}\n\n## チェック\n- 合計・税区分・対象期間を確認してください。\n- 会計サービスへの登録は承認後に実行してください。`,
  content: ({ system, input, objective }) => `# ${objective}\n\n生成システム: ${system.title}\n\n## 制作方針\n${system.solution}\n\n## 元情報\n${input}\n\n## 下書き\n${input}\n\nこの内容について「なぜ今必要か」「導入すると何が変わるか」を具体例とともに説明します。読者が次に取る行動を一つに絞り、分かりやすく案内します。\n\n## 投稿チェック\n- [ ] 事実確認\n- [ ] 権利・引用元確認\n- [ ] 個人情報削除\n- [ ] 媒体ごとの文字数調整`,
  crm: ({ system, input, objective }) => `# ${system.title} アクションプラン\n\n## 対象・目的\n${objective}\n\n## 受領情報\n${input}\n\n## 推奨アクション\n1. 情報を顧客・案件・対応履歴に分類\n2. 緊急度と重要度を判定\n3. 担当者と期限を設定\n4. フォロー内容を記録\n\n## フォロー文案\nお問い合わせありがとうございます。内容を確認し、担当者よりご案内いたします。次回連絡時には、目的・期限・ご希望条件を確認します。`,
  data: ({ system, input, objective }) => `# ${system.title} データ処理結果\n\n目的: ${objective}\n処理日時: ${timestamp()}\n\n## 正規化データ\n${cleanLines(input).map((line, index) => `${index + 1},${JSON.stringify(line)}`).join('\n')}\n\n## 品質確認\n- 入力行数: ${cleanLines(input).length}\n- 空行: 除外済み\n- 要確認: 表記揺れ、重複、欠損値\n\n外部データ取得やOCR本処理は、接続設定後に同じ形式へ統合します。`,
  operations: ({ system, input, objective }) => `# ${system.title} オペレーション指示\n\n## 達成目標\n${objective}\n\n## 現在情報\n${input}\n\n## 実行キュー\n${cleanLines(input).map((line, index) => `- [ ] ${index + 1}. ${line}`).join('\n')}\n\n## 完了条件\n- 担当者・期限が設定されている\n- 例外時の連絡先が明確である\n- 実績が記録されている`,
  automation: ({ system, input, objective }) => `# ${system.title} 実行計画\n\n## 目的\n${objective}\n\n## 入力\n${input}\n\n## 自動処理フロー\n1. 入力内容の形式と機密区分を確認\n2. ${system.solution}\n3. 結果を検証して承認待ちにする\n4. 承認後に出力を確定\n\n## 期待効果\n${system.effect}`,
}

export const executeSystem = ({ system, input, objective }) => {
  const engine = getEngine(system)
  const output = generators[engine.id]({ system, input, objective })
  return {
    id: `${system.id}-${Date.now()}`,
    systemId: system.id,
    engine: engine.label,
    createdAt: new Date().toISOString(),
    objective,
    input,
    output,
    externalRequired: needsExternalConnection(system),
  }
}
