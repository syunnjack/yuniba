import { executeSystem } from './systemEngine.js'

const parseCsvLine = (line) => {
  const values = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      values.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }
  values.push(value.trim())
  return values
}

const recordToText = (record) => Object.entries(record).map(([key, value]) => `${key}: ${value}`).join('\n')

export const parseBatchFile = ({ name, text }) => {
  const extension = name.split('.').pop()?.toLowerCase()
  if (extension === 'json') {
    const parsed = JSON.parse(text)
    const values = Array.isArray(parsed) ? parsed : [parsed]
    return values.map((value) => typeof value === 'object' && value !== null ? recordToText(value) : String(value)).filter(Boolean)
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (extension === 'csv' && lines.length > 1) {
    const headers = parseCsvLine(lines[0])
    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line)
      return recordToText(Object.fromEntries(headers.map((header, index) => [header || `列${index + 1}`, values[index] || ''])))
    })
  }
  return lines
}

export const executeBatchSystem = ({ system, records, objective, sourceName = '一括入力' }) => {
  const results = records.map((input, index) => executeSystem({
    system,
    input,
    objective: `${objective}（${index + 1}/${records.length}）`,
  }))
  return {
    id: `${system.id}-batch-${Date.now()}`,
    systemId: system.id,
    engine: `${results[0]?.engine || 'ローカル処理'}・一括実行`,
    createdAt: new Date().toISOString(),
    objective,
    input: `${sourceName}: ${records.length}件`,
    output: `# ${system.title} 一括処理結果\n\n- 入力元: ${sourceName}\n- 処理件数: ${records.length}\n- 外部送信: なし\n\n${results.map((result, index) => `---\n\n## 処理 ${index + 1}\n\n${result.output}`).join('\n\n')}`,
    externalRequired: results.some((result) => result.externalRequired),
    batchCount: records.length,
  }
}
