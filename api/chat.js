import Anthropic from '@anthropic-ai/sdk'
import { loadSystemPrompt, loadTools, getOpening } from './_lib/prompt.js'
import { mergeLead, computeMissing } from './_lib/lead.js'

const anthropic = new Anthropic()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { messages, lead: inputLead, openingType } = body || {}

  if (!Array.isArray(messages) || messages.length === 0 || messages[0].role !== 'user') {
    return res.status(400).json({ error: 'messages must be a non-empty array whose first item is role "user"' })
  }

  const openingMessage = getOpening(openingType || 'business_hours')
  const tools = loadTools()

  let workingMessages = messages.map(m => ({ role: m.role, content: m.content }))
  let workingLead = inputLead ? { ...inputLead } : {}
  let completion = null
  let lastReply = ''

  for (let i = 0; i < 4; i++) {
    const system = loadSystemPrompt({ lead: workingLead, openingMessage })

    let response
    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-5-5',
        max_tokens: 1024,
        system,
        tools,
        messages: workingMessages,
      })
    } catch (err) {
      console.error('Anthropic API error:', err.message)
      return res.status(502).json({ error: err.message })
    }

    const textBlocks = response.content.filter(b => b.type === 'text').map(b => b.text)
    const textReply = textBlocks.join('')
    if (textReply) lastReply = textReply

    workingMessages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason !== 'tool_use') break

    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
    const updateCalls = toolUseBlocks.filter(b => b.name === 'update_lead')
    const completeCalls = toolUseBlocks.filter(b => b.name === 'complete_chat')

    const toolResults = []

    for (const block of updateCalls) {
      workingLead = mergeLead(workingLead, block.input)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify({ ok: true }),
      })
    }

    for (const block of completeCalls) {
      if (!completion) {
        const { summary, reason } = block.input
        completion = {
          summary,
          reason,
          missingFields: computeMissing(workingLead, reason),
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ ok: true, missing_fields: completion.missingFields }),
        })
      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ ok: false, error: 'already completed' }),
        })
      }
    }

    workingMessages.push({ role: 'user', content: toolResults })
  }

  res.status(200).json({ reply: lastReply, lead: workingLead, completion })
}
