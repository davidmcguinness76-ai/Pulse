function fmtScale(v: number): string {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 100) / 10}k`
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

export function SparkLine({
  values,
  labels,
  color,
  today,
  fmtValue,
}: {
  values: (number | null)[]
  labels: string[]
  color: string
  today: number
  fmtValue?: (v: number) => string
}) {
  const W = 360
  const H = 80
  const LABEL_H = 16
  const PAD_L = 16
  const SCALE_W = 30
  const PAD_R = SCALE_W + 4
  const PLOT_W = W - PAD_L - PAD_R
  const PLOT_H = H - LABEL_H

  const defined = values.filter((v): v is number => v != null)
  const min = defined.length ? Math.min(...defined) : 0
  const max = defined.length ? Math.max(...defined) : 1
  const range = max - min || 1

  const n = values.length || 1
  const slot = PLOT_W / n

  function xOf(i: number) {
    return PAD_L + i * slot + slot / 2
  }

  function yOf(v: number) {
    return PLOT_H - ((v - min) / range) * (PLOT_H - 10) - 5
  }

  const segments: string[][] = []
  let current: string[] = []
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null) {
      if (current.length) { segments.push(current); current = [] }
    } else {
      current.push(`${xOf(i)},${yOf(v)}`)
    }
  }
  if (current.length) segments.push(current)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: '80px' }}>
      {/* scale labels */}
      {defined.length > 0 && (
        <>
          <text x={W - 4} y={2} textAnchor="end" dominantBaseline="hanging" fill="#4b5563" fontSize={8}>{fmtValue ? fmtValue(max) : fmtScale(max)}</text>
          {max !== min && (
            <text x={W - 4} y={PLOT_H - 2} textAnchor="end" dominantBaseline="auto" fill="#4b5563" fontSize={8}>{fmtValue ? fmtValue(min) : fmtScale(min)}</text>
          )}
        </>
      )}

      {segments.map((pts, si) => (
        <polyline
          key={si}
          points={pts.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2}
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
            cx={cx} cy={cy}
            r={isToday ? 5 : 3}
            fill={isToday ? color : '#111827'}
            stroke={color}
            strokeWidth={2}
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
