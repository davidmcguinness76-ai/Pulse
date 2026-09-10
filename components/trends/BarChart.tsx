export function BarChart({ values, labels, color, unit, today }: {
  values: (number | null)[]
  labels: string[]
  color: string
  unit: string
  today: number
}) {
  const W = 220
  const H = 80
  const LABEL_H = 14
  const PLOT_H = H - LABEL_H  // 66px for bars

  const barW = 20
  const gap = (W - 7 * barW) / 6  // ~11.4

  const defined = values.filter((v): v is number => v != null)
  const rawMax = defined.length ? Math.max(...defined, 0) : 0
  const rawMin = defined.length ? Math.min(...defined, 0) : 0
  const range = rawMax - rawMin || 1

  // y coordinate of the zero baseline within PLOT area (top=0, bottom=PLOT_H)
  const zeroY = PLOT_H * (rawMax / range)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
      {/* zero baseline */}
      <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="#374151" strokeWidth={0.5} />
      {values.map((v, i) => {
        const x = i * (barW + gap)
        const isToday = i === today
        const fill = v == null ? '#1f2937' : isToday ? color : `${color}66`

        if (v == null) {
          // placeholder: thin bar at baseline
          return (
            <g key={i}>
              <rect x={x} y={zeroY - 1} width={barW} height={2} rx={1} fill="#1f2937" />
              <text x={x + barW / 2} y={H - 2} textAnchor="middle" fill="#6b7280" fontSize={9}>{labels[i]}</text>
            </g>
          )
        }

        // positive: bar goes up from zeroY; negative: bar goes down from zeroY
        const barH = Math.max(Math.abs(v) / range * PLOT_H, 2)
        const y = v >= 0 ? zeroY - barH : zeroY

        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={fill} />
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
