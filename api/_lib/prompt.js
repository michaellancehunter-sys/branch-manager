import { readFileSync } from 'fs'
import { join } from 'path'

const PROMPTS = join(process.cwd(), 'prompts')

function readPrompt(name) {
  return readFileSync(join(PROMPTS, name), 'utf8')
}

function formatPacificDatetime(date) {
  const tz = 'America/Los_Angeles'
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(date)
  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, month: 'long', day: 'numeric', year: 'numeric',
  }).format(date)
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date)
  return `${weekday}, ${dateStr}, ${timeStr}`
}

export function loadSystemPrompt({ version, lead, openingMessage } = {}) {
  const v = version || process.env.PROMPT_VERSION || 'v2'
  const template = readPrompt(`agent-system-prompt-${v}.md`)
  const leadIsEmpty = !lead || Object.keys(lead).length === 0
  const leadState = leadIsEmpty ? '(nothing captured yet)' : JSON.stringify(lead, null, 2)

  return template
    .replaceAll('{{BUSINESS_NAME}}', process.env.BUSINESS_NAME || 'Tri-Valley Tree Care')
    .replaceAll('{{CALLER_PHONE}}', process.env.DEMO_CALLER_PHONE || '(555) 010-4477')
    .replaceAll('{{OPENING_MESSAGE}}', openingMessage || '')
    .replaceAll('{{CURRENT_DATETIME}}', formatPacificDatetime(new Date()))
    .replaceAll('{{LEAD_STATE}}', leadState)
}

export function loadTools() {
  return JSON.parse(readPrompt('tools.json'))
}

export function getOpening(type) {
  const messages = JSON.parse(readPrompt('opening-messages.json'))
  const template = messages[type] || messages['business_hours']
  return template.replaceAll('{{BUSINESS_NAME}}', process.env.BUSINESS_NAME || 'Tri-Valley Tree Care')
}

export function currentOpeningType() {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
    10
  )
  return hour >= 8 && hour < 18 ? 'business_hours' : 'after_hours'
}
