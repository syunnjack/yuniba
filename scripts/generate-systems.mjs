import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourcePath = process.argv[2]
if (!sourcePath) {
  console.error('Usage: npm run generate -- <pasted-text.txt>')
  process.exit(1)
}

const lines = (await readFile(resolve(sourcePath), 'utf8'))
  .split(/\r?\n/)
  .map((line) => line.trim())

const nextText = (from) => {
  for (let index = from; index < lines.length; index += 1) {
    if (lines[index]) return { value: lines[index], index }
  }
  return null
}

const readBlock = (labelIndex, stopLabels) => {
  const values = []
  for (let index = labelIndex + 1; index < lines.length; index += 1) {
    if (stopLabels.includes(lines[index])) break
    if (lines[index]) values.push(lines[index])
  }
  return values.join(' ')
}

const systems = []
let industry = 'その他'

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index]
  const section = line.match(/^🏭\s*(.+?)（\d+件）$/)
  if (section) {
    industry = section[1]
    const marker = nextText(index + 1)
    const title = marker && nextText(marker.index + 1)
    const followingMarker = title && lines.findIndex((value, position) => position > title.index && value.startsWith('🏭 '))
    const faqBody = followingMarker > 0 ? lines.slice(title.index + 1, followingMarker).filter(Boolean) : []
    if (marker?.value === `🏭 ${industry}` && title && !faqBody.includes('課題') && faqBody.length) {
      const authorIndex = faqBody.findIndex((value, position) => position > 0 && faqBody[position + 1]?.includes('（#ユニコスクール'))
      const answerLines = authorIndex > 0 ? faqBody.slice(0, authorIndex) : faqBody
      systems.push({
        id: systems.length + 1,
        slug: `system-${String(systems.length + 1).padStart(3, '0')}`,
        industry,
        category: industry,
        title: `${industry}向け 安心案内・FAQ応答システム`,
        challenge: title.value,
        solution: answerLines.join(' '),
        effect: '受講前の不安をその場で解消し、安心して内容を検討できる案内体制を整える。',
        purposes: ['CS・サポート', '議事録・文字起こし'],
        tools: ['Claude Code'],
        author: authorIndex > 0 ? faqBody[authorIndex] : 'ユニコスクール',
      })
    }
    continue
  }

  if (!line.startsWith('🏭 ')) continue
  const titleLine = nextText(index + 1)
  const challengeLabel = titleLine && nextText(titleLine.index + 1)
  if (!titleLine || challengeLabel?.value !== '課題') continue

  const aiLabel = lines.indexOf('AI活用', challengeLabel.index + 1)
  const effectLabel = lines.indexOf('効果', aiLabel + 1)
  if (aiLabel < 0 || effectLabel < 0 || aiLabel - challengeLabel.index > 8 || effectLabel - aiLabel > 8) continue

  let end = effectLabel + 1
  while (end < lines.length) {
    const candidateTitle = lines[end]?.startsWith('🏭 ') && nextText(end + 1)
    const candidateLabel = candidateTitle && nextText(candidateTitle.index + 1)
    if (candidateLabel?.value === '課題' || /^🏭\s*.+?（\d+件）$/.test(lines[end])) break
    end += 1
  }

  const effectText = nextText(effectLabel + 1)
  const metadata = lines.slice((effectText?.index ?? effectLabel) + 1, end).filter(Boolean)
  const purposes = metadata.filter((value) => value.startsWith('🎯 ')).map((value) => value.slice(3))
  const tools = metadata.filter((value) => value.startsWith('🛠️ ')).map((value) => value.slice(4))
  const authorLine = metadata.find((value) => !value.startsWith('#') && !value.startsWith('🎯 ') && !value.startsWith('🛠️ ') && !value.startsWith('🏭 '))

  systems.push({
    id: systems.length + 1,
    slug: `system-${String(systems.length + 1).padStart(3, '0')}`,
    industry,
    category: line.slice(3),
    title: titleLine.value,
    challenge: readBlock(challengeLabel.index, ['AI活用']),
    solution: readBlock(aiLabel, ['効果']),
    effect: effectText?.value || '',
    purposes,
    tools,
    author: authorLine || 'ユニコスクール',
  })
}

if (systems.length !== 220) {
  console.error(`Expected 220 systems, parsed ${systems.length}`)
  process.exit(1)
}

await mkdir(resolve('src/data'), { recursive: true })
await writeFile(resolve('src/data/systems.json'), `${JSON.stringify(systems, null, 2)}\n`)
console.log(`Generated ${systems.length} systems.`)
