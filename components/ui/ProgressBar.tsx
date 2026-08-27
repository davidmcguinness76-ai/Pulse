type Props = {
  label: string
  value: number
  max: number
  unit: string
  colour?: string
}

export function ProgressBar({ label, value, max, unit, colour = 'bg-[#00C853]' }: Props) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const left = Math.max(max - value, 0)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-500">{value.toFixed(0)} / {max} {unit} · <span className="text-white">{left.toFixed(0)} left</span></span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${colour} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
