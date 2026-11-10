export const REQUIRED = ['name', 'address', 'job_details', 'urgency', 'preferred_datetime']

export function mergeLead(lead, update) {
  const result = { ...lead }
  for (const [k, v] of Object.entries(update)) {
    if (v !== undefined && v !== null && v !== '') {
      result[k] = v
    }
  }
  return result
}

export function computeMissing(lead, reason) {
  if (reason === 'commercial' || lead.inquiry_type === 'commercial') {
    return ['name', 'job_details'].filter(f => !lead[f])
  }
  let required = [...REQUIRED]
  if (lead.urgency === 'EMERGENCY') {
    required = required.filter(f => f !== 'preferred_datetime')
  }
  return required.filter(f => !lead[f])
}
