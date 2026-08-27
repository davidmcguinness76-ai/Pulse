type Props = { consumed: number; goal: number; burned: number }

export function CalorieRing({ consumed, goal, burned }: Props) {
  const net = goal - consumed + burned
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0
  const r = 48
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="bg-[#111827] rounded-2xl p-4 flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke="#00C853" strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="56" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">{consumed}</text>
        <text x="60" y="70" textAnchor="middle" fill="#6b7280" fontSize="9">eaten</text>
      </svg>
      <div className="space-y-2 text-sm">
        <div><span className="text-gray-500">Goal </span><span className="text-white font-medium">{goal} kcal</span></div>
        <div><span className="text-gray-500">Burned </span><span className="text-[#00C853] font-medium">+{burned}</span></div>
        <div><span className="text-gray-500">Remaining </span><span className={`font-semibold ${net >= 0 ? 'text-white' : 'text-red-400'}`}>{net} kcal</span></div>
      </div>
    </div>
  )
}
