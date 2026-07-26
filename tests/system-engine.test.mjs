import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { executeSystem, getEngine } from '../src/lib/systemEngine.js'
import { executeBatchSystem, parseBatchFile } from '../src/lib/batchEngine.js'

const systems = JSON.parse(await readFile(new URL('../src/data/systems.json', import.meta.url), 'utf8'))

test('220件すべてが実行エンジンに接続されている', () => {
  assert.equal(systems.length, 220)
  for (const system of systems) {
    const engine = getEngine(system)
    const result = executeSystem({ system, objective: 'テスト実行', input: '入力データ1\n入力データ2' })
    assert.ok(engine.id)
    assert.equal(result.systemId, system.id)
    assert.ok(result.output.includes(system.title))
    assert.ok(result.output.length > 100)
  }
})

test('入力データを成果物へ反映する', () => {
  const result = executeSystem({ system: systems[0], objective: '機密テスト', input: 'YUNIBA_TEST_VALUE' })
  assert.match(result.output, /YUNIBA_TEST_VALUE/)
  assert.match(result.output, /機密テスト/)
})

test('入力を省略せず成果物へ残す', () => {
  const values = ['顧客A', '期限: 8月末', '担当: 営業部']
  const result = executeSystem({ system: systems[10], objective: '入力保持テスト', input: values.join('\n') })
  for (const value of values) assert.ok(result.output.includes(value))
})

test('外部連携の必要性を実行結果へ記録する', () => {
  const externalSystem = systems.find((system) => system.tools.includes('Salesforce'))
  assert.ok(externalSystem)
  const result = executeSystem({ system: externalSystem, objective: 'CRMテスト', input: '顧客A' })
  assert.equal(result.externalRequired, true)
})

test('CSVを複数レコードとして安全に解析する', () => {
  const records = parseBatchFile({ name: 'customers.csv', text: '氏名,会社,備考\n山田,ABC,"重要, 要確認"\n佐藤,XYZ,通常' })
  assert.equal(records.length, 2)
  assert.match(records[0], /重要, 要確認/)
  assert.match(records[1], /会社: XYZ/)
})

test('JSON配列を一括実行して一つの成果物へまとめる', () => {
  const records = parseBatchFile({ name: 'items.json', text: '[{"商品":"A"},{"商品":"B"}]' })
  const result = executeBatchSystem({ system: systems[0], records, objective: '一括テスト', sourceName: 'items.json' })
  assert.equal(result.batchCount, 2)
  assert.match(result.output, /商品: A/)
  assert.match(result.output, /商品: B/)
  assert.match(result.output, /外部送信: なし/)
})
