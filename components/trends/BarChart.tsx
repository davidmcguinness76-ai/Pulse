export function BarChart({
  values,
  labels,
  color,
  unit,
  today,
}: {
  values: (number | null)[]
  labels: string[]
  color: string
  unit: string
  today: number
}) {
  const W = 220
  const H = 80
  const LABEL_H = 14
  const BAR_H = H - LABEL_H
  const barW = 20
  const gap = (W - 7 * barW) / 6 // ~11.4

  const max = Math.max(...values.map((v) => v ?? 0), 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
      {values.map((v, i) => {
        const x = i * (barW + gap)
        const heightPct = v != null ? v / max : 0
        const barH = Math.max(heightPct * BAR_H, v != null ? 2 : 1)
        const y = BAR_H - barH
        const isToday = i === today
        const fill = v == null ? '#1f2937' : isToday ? color : `${color}66`
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill={fill}
            />
            <text
              x={x + barW / 2}
              y={H - 2}
              textAnchor="middle"
              fill={isToday ? 'white' : '#6b7280'}
              fontSize={9}
            >
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
