import { getOpening, currentOpeningType } from './_lib/prompt.js'

export default function handler(req, res) {
  const { mode } = req.query || {}
  const type = (mode === 'business_hours' || mode === 'after_hours')
    ? mode
    : currentOpeningType()
  res.status(200).json({
    type,
    message: getOpening(type),
    phone: process.env.DEMO_CALLER_PHONE || '(555) 010-4477',
  })
}
