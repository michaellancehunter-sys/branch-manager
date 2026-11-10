const URGENCY_BADGE = {
  EMERGENCY: 'bg-red-100 text-red-800 border border-red-200',
  URGENT: 'bg-amber-100 text-amber-800 border border-amber-200',
  ROUTINE: 'bg-green-100 text-green-800 border border-green-200',
}

const FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'address', label: 'Address' },
  { key: 'job_details', label: 'Job details' },
  { key: 'preferred_datetime', label: 'Preferred date/time' },
  { key: 'tree_type_size', label: 'Tree' },
  { key: 'access_notes', label: 'Access' },
  { key: 'insurance_claim', label: 'Insurance' },
  { key: 'out_of_area', label: 'Out of area' },
  { key: 'inquiry_type', label: 'Inquiry type' },
  { key: 'company', label: 'Company' },
]

export default function LeadPanel({ lead }) {
  const displayValue = (key, raw) => {
    if (key === 'out_of_area') return raw ? 'yes' : null
    return raw || null
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 h-fit">
      <h2 className="font-semibold text-stone-600 text-sm mb-4 uppercase tracking-wide">
        Lead record
      </h2>

      {lead.urgency ? (
        <div className="mb-4">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${URGENCY_BADGE[lead.urgency] || 'bg-stone-100 text-stone-600'}`}>
            {lead.urgency}
          </span>
        </div>
      ) : (
        <div className="mb-4">
          <span className="text-xs px-3 py-1 rounded-full bg-stone-100 text-stone-400">
            urgency not set
          </span>
        </div>
      )}

      <dl className="space-y-3">
        {FIELDS.map(({ key, label }) => {
          const val = displayValue(key, lead[key])
          return (
            <div key={key}>
              <dt className="text-xs text-stone-400 uppercase tracking-wide">{label}</dt>
              <dd className="text-sm text-stone-700 mt-0.5 leading-snug">
                {val ?? <span className="text-stone-300 italic text-xs">not captured</span>}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
