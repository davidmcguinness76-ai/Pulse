type Props = { hrv?: number | null; restingHr?: number | null }

export function HrvCard({ hrv, restingHr }: Props) {
  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-2">
      <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Recovery</h2>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-[#00BCD4]">{hrv != null ? Math.round(hrv) : '—'}</span>
        {hrv && <span className="text-gray-500 text-sm pb-1">ms HRV</span>}
      </div>
      <div className="text-sm text-gray-500">
        Resting HR <span className="text-white">{restingHr ?? '—'}</span> bpm
      </div>
    </div>
  )
}
