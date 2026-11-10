import Anthropic from '@anthropic-ai/sdk'
import { computeMissing } from './_lib/lead.js'

const FIELD_LABELS = {
  name: 'Name',
  address: 'Address',
  job_details: 'Job details',
  urgency: 'Urgency',
  preferred_datetime: 'Preferred date/time',
}

const anthropic = new Anthropic()

function buildOptionalFields(lead) {
  const parts = []
  if (lead.tree_type_size) parts.push(`Tree: ${lead.tree_type_size}`)
  if (lead.access_notes) parts.push(`Access: ${lead.access_notes}`)
  if (lead.insurance_claim) parts.push(`Insurance claim: ${lead.insurance_claim}`)
  if (lead.out_of_area) parts.push('Out of area: yes')
  if (lead.inquiry_type === 'commercial') parts.push(`Commercial: ${lead.company || 'yes'}`)
  return parts.join('; ')
}

function formatTranscript(transcript) {
  return transcript.map(t => `${t.role === 'agent' ? 'Agent' : 'Customer'}: ${t.text}`).join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { chatId, lead = {}, transcript, completedBy, summary: inputSummary, reason } = body || {}

  if (!chatId || !Array.isArray(transcript)) {
    return res.status(400).json({ error: 'chatId and transcript are required' })
  }

  let summary = inputSummary || ''
  if (!summary) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-5-5',
        max_tokens: 200,
        system: 'Summarize this tree service lead for the business owner in one to three plain sentences: what the customer needs, how urgent it is, and any flags. No markdown.',
        messages: [{ role: 'user', content: formatTranscript(transcript) }],
      })
      summary = response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    } catch {
      summary = 'Marked complete manually; no summary available.'
    }
  }

  const webhookUrl = process.env.SHEET_WEBHOOK_URL
  if (!webhookUrl) return res.status(502).json({ error: 'SHEET_WEBHOOK_URL not configured' })

  const payload = {
    token: process.env.SHEET_TOKEN || '',
    chatId,
    name: lead.name || '',
    address: lead.address || '',
    jobDetails: lead.job_details || '',
    urgency: lead.urgency || '',
    preferredDatetime: lead.preferred_datetime || '',
    phone: process.env.DEMO_CALLER_PHONE || '',
    optionalFields: buildOptionalFields(lead),
    summary,
    missingFields: computeMissing(lead, reason).map(f => FIELD_LABELS[f] || f).join(', '),
    completedBy: completedBy || '',
    transcript: formatTranscript(transcript),
  }

  let sheetRes
  try {
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    sheetRes = await r.json()
  } catch (err) {
    console.error('Sheet webhook error:', err.message)
    return res.status(502).json({ error: err.message })
  }

  if (!sheetRes.ok) {
    return res.status(502).json({ error: sheetRes.error || 'sheet returned not ok' })
  }

  res.status(200).json({ ok: true, duplicate: sheetRes.duplicate || false })
}
