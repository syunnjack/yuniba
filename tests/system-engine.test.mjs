import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { executeSystem, getEngine } from '../src/lib/systemEngine.js'

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

test('外部連携の必要性を実行結果へ記録する', () => {
  const externalSystem = systems.find((system) => system.tools.includes('Salesforce'))
  assert.ok(externalSystem)
  const result = executeSystem({ system: externalSystem, objective: 'CRMテスト', input: '顧客A' })
  assert.equal(result.externalRequired, true)
})
