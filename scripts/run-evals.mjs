import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scenarios = JSON.parse(readFileSync(join(__dirname, '../evals/scenarios.json'), 'utf8'))

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const args = process.argv.slice(2)
const toRun = args.length > 0 ? scenarios.filter(s => args.includes(s.id)) : scenarios

async function runScenario(scenario) {
  const { id, name, turns, expect } = scenario
  console.log(`\n${'='.repeat(60)}`)
  console.log(`${id}: ${name}`)
  console.log('='.repeat(60))

  let messages = []
  let lead = {}
  let completion = null
  const agentReplies = []

  for (const turn of turns) {
    messages.push({ role: 'user', content: turn })
    console.log(`C: ${turn}`)

    let data
    try {
      const r = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, lead, openingType: 'business_hours' }),
      })
      data = await r.json()
      if (!r.ok) {
        console.error(`API error ${r.status}:`, JSON.stringify(data))
        break
      }
    } catch (err) {
      console.error('Fetch error:', err.message)
      break
    }

    const { reply, lead: updatedLead, completion: updatedCompletion } = data
    lead = updatedLead || lead
    if (updatedCompletion) completion = updatedCompletion

    console.log(`A: ${reply}`)
    agentReplies.push(reply || '')
    messages.push({ role: 'assistant', content: reply || '' })

    if (completion) break
  }

  console.log('\nLead:')
  console.log(JSON.stringify(lead, null, 2))
  console.log('\nCompletion:')
  console.log(completion ? JSON.stringify(completion, null, 2) : 'null')

  const checks = []

  function check(label, passed) {
    checks.push({ label, passed })
    console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${label}`)
  }

  console.log('\nChecks:')

  if (expect.urgency !== undefined) {
    check(`urgency is ${expect.urgency}`, lead.urgency === expect.urgency)
  }

  if (expect.completes !== undefined) {
    check(`completes is ${expect.completes}`, (completion !== null) === expect.completes)
  }

  if (expect.maxAgentMessages !== undefined) {
    check(`agent messages <= ${expect.maxAgentMessages}`, agentReplies.length <= expect.maxAgentMessages)
  }

  if (expect.firstReplyIncludes) {
    for (const str of expect.firstReplyIncludes) {
      const first = agentReplies[0] || ''
      check(`first reply includes "${str}"`, first.toLowerCase().includes(str.toLowerCase()))
    }
  }

  if (expect.mustNotMatch !== undefined) {
    const re = new RegExp(expect.mustNotMatch)
    const anyMatch = agentReplies.some(r => re.test(r))
    check(`no reply matches /${expect.mustNotMatch}/`, !anyMatch)
  }

  if (expect.outOfArea !== undefined) {
    check('lead.out_of_area === true', lead.out_of_area === true)
  }

  if (expect.leadEmpty !== undefined) {
    check('lead is empty', Object.keys(lead).length === 0)
  }

  const allShort = agentReplies.length > 0 && agentReplies.every(r => r.length <= 300)
  check('all replies <= 300 chars', allShort)

  const passed = checks.filter(c => c.passed).length
  const total = checks.length
  console.log(`\n${passed}/${total} checks passed`)

  return { id, name, passed, total }
}

const results = []
for (const scenario of toRun) {
  results.push(await runScenario(scenario))
}

console.log(`\n${'='.repeat(60)}`)
console.log('Summary')
console.log('='.repeat(60))
for (const { id, name, passed, total } of results) {
  const status = passed === total ? 'PASS' : 'FAIL'
  console.log(`${id.padEnd(4)}  ${name.padEnd(42)} ${passed}/${total}  ${status}`)
}
