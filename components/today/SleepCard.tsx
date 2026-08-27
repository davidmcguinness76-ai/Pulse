function fmt(seconds?: number | null) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

type Props = {
  score?: number | null
  durationS?: number | null
  quality?: number | null
}

export function SleepCard({ score, durationS, quality }: Props) {
  const qualityLabel = quality != null ? ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][quality] ?? '—' : '—'
  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-3">
      <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Sleep</h2>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-indigo-400">{score ?? '—'}</span>
        <span className="text-gray-500 text-sm pb-1">{fmt(durationS)} · {qualityLabel}</span>
      </div>
    </div>
  )
}
