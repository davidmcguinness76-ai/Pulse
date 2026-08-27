type Props = { steps?: number | null; goal?: number }

export function StepsCard({ steps, goal = 10000 }: Props) {
  const s = steps ?? 0
  const pct = Math.min((s / goal) * 100, 100)
  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-2">
      <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Steps</h2>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-amber-400">{s.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-500">{goal.toLocaleString()} goal</p>
    </div>
  )
}
