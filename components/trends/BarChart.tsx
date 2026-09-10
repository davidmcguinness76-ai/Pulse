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
  const W = 360
  const H = 100
  const LABEL_H = 16
  const PAD_L = 16
  const SCALE_W = 30
  const PAD_R = SCALE_W + 4
  const PLOT_W = W - PAD_L - PAD_R
  const PLOT_H = H - LABEL_H

  const barW = Math.floor(PLOT_W / 7 * 0.6)
  const slot = PLOT_W / 7

  const defined = values.filter((v): v is number => v != null)
  const rawMax = defined.length ? Math.max(...defined, 0) : 0
  const rawMin = defined.length ? Math.min(...defined, 0) : 0
  const range = rawMax - rawMin || 1

  const zeroY = PLOT_H * (rawMax / range)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: '100px' }}>
      {/* zero baseline */}
      <line x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY} stroke="#374151" strokeWidth={0.5} />

      {/* scale labels — top-right and bottom-right inside plot */}
      {rawMax !== 0 && (
        <text x={W - 4} y={2} textAnchor="end" dominantBaseline="hanging" fill="#4b5563" fontSize={8}>{fmtScale(rawMax)}</text>
      )}
      {rawMin !== 0 && (
        <text x={W - 4} y={PLOT_H - 2} textAnchor="end" dominantBaseline="auto" fill="#4b5563" fontSize={8}>{fmtScale(rawMin)}</text>
      )}

      {values.map((v, i) => {
        const cx = PAD_L + i * slot + slot / 2
        const x = cx - barW / 2
        const isToday = i === today
        const fill = v == null ? '#1f2937' : isToday ? color : `${color}66`

        if (v == null) {
          return (
            <g key={i}>
              <rect x={x} y={zeroY - 1} width={barW} height={2} rx={1} fill="#1f2937" />
              <text x={cx} y={H - 2} textAnchor="middle" fill="#6b7280" fontSize={9}>{labels[i]}</text>
            </g>
          )
        }

        const barH = Math.max(Math.abs(v) / range * PLOT_H, 2)
        const y = v >= 0 ? zeroY - barH : zeroY

        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={2} fill={fill} />
            <text x={cx} y={H - 2} textAnchor="middle" fill={isToday ? 'white' : '#6b7280'} fontSize={9}>
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
