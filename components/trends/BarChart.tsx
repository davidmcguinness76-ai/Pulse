function fmtScale(v: number): string {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 100) / 10}k`
  return String(Math.round(v))
}

export function BarChart({ values, labels, color, unit, today }: {
  values: (number | null)[]
  labels: string[]
  color: string
  unit: string
  today: number
}) {
  const W = 220
  const H = 86
  const LABEL_H = 14
  const SCALE_W = 28  // right-side scale column
  const PLOT_W = W - SCALE_W
  const PLOT_H = H - LABEL_H  // 72px for bars

  const barW = 18
  const gap = (PLOT_W - 7 * barW) / 6

  const defined = values.filter((v): v is number => v != null)
  const rawMax = defined.length ? Math.max(...defined, 0) : 0
  const rawMin = defined.length ? Math.min(...defined, 0) : 0
  const range = rawMax - rawMin || 1

  const zeroY = PLOT_H * (rawMax / range)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '86px' }}>
      {/* zero baseline */}
      <line x1={0} y1={zeroY} x2={PLOT_W} y2={zeroY} stroke="#374151" strokeWidth={0.5} />

      {/* scale labels */}
      {rawMax !== 0 && (
        <text x={W - 2} y={4} textAnchor="end" dominantBaseline="hanging" fill="#6b7280" fontSize={8}>{fmtScale(rawMax)}</text>
      )}
      {rawMin !== 0 && (
        <text x={W - 2} y={PLOT_H - 2} textAnchor="end" dominantBaseline="auto" fill="#6b7280" fontSize={8}>{fmtScale(rawMin)}</text>
      )}

      {values.map((v, i) => {
        const x = i * (barW + gap)
        const isToday = i === today
        const fill = v == null ? '#1f2937' : isToday ? color : `${color}66`

        if (v == null) {
          return (
            <g key={i}>
              <rect x={x} y={zeroY - 1} width={barW} height={2} rx={1} fill="#1f2937" />
              <text x={x + barW / 2} y={H - 2} textAnchor="middle" fill="#6b7280" fontSize={9}>{labels[i]}</text>
            </g>
          )
        }

        const barH = Math.max(Math.abs(v) / range * PLOT_H, 2)
        const y = v >= 0 ? zeroY - barH : zeroY

        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={fill} />
            <text x={x + barW / 2} y={H - 2} textAnchor="middle" fill={isToday ? 'white' : '#6b7280'} fontSize={9}>
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
