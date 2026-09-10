function fmtScale(v: number): string {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 100) / 10}k`
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

export function SparkLine({
  values,
  labels,
  color,
  today,
}: {
  values: (number | null)[]
  labels: string[]
  color: string
  today: number
}) {
  const W = 220
  const H = 66
  const LABEL_H = 14
  const SCALE_W = 28
  const PLOT_W = W - SCALE_W
  const PLOT_H = H - LABEL_H

  const defined = values.filter((v): v is number => v != null)
  const min = defined.length ? Math.min(...defined) : 0
  const max = defined.length ? Math.max(...defined) : 1
  const range = max - min || 1

  const xStep = (PLOT_W - 10) / 6

  function xOf(i: number) {
    return 5 + i * xStep
  }

  function yOf(v: number) {
    return PLOT_H - ((v - min) / range) * (PLOT_H - 8) - 4
  }

  // Build polyline points, skipping nulls
  const segments: string[][] = []
  let current: string[] = []
  for (let i = 0; i < 7; i++) {
    const v = values[i]
    if (v == null) {
      if (current.length) {
        segments.push(current)
        current = []
      }
    } else {
      current.push(`${xOf(i)},${yOf(v)}`)
    }
  }
  if (current.length) segments.push(current)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '66px' }}>
      {/* scale labels */}
      {defined.length > 0 && (
        <>
          <text x={W - 2} y={4} textAnchor="end" dominantBaseline="hanging" fill="#6b7280" fontSize={8}>{fmtScale(max)}</text>
          {max !== min && (
            <text x={W - 2} y={PLOT_H - 2} textAnchor="end" dominantBaseline="auto" fill="#6b7280" fontSize={8}>{fmtScale(min)}</text>
          )}
        </>
      )}
      {segments.map((pts, si) => (
        <polyline
          key={si}
          points={pts.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {values.map((v, i) => {
        if (v == null) return null
        const cx = xOf(i)
        const cy = yOf(v)
        const isToday = i === today
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={isToday ? 4 : 2.5}
            fill={isToday ? color : '#111827'}
            stroke={color}
            strokeWidth={1.5}
          />
        )
      })}
      {labels.map((label, i) => (
        <text
          key={i}
          x={xOf(i)}
          y={H - 2}
          textAnchor="middle"
          fill={i === today ? 'white' : '#6b7280'}
          fontSize={9}
        >
          {label}
        </text>
      ))}
    </svg>
  )
}
