import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { getWeekTrends } from '@/lib/db/queries/trends'
import { TrendCard } from '@/components/trends/TrendCard'
import { BarChart } from '@/components/trends/BarChart'
import { SparkLine } from '@/components/trends/SparkLine'

function getWeekStart(today: string): string {
  const d = new Date(today)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

function fmtSleep(s: number | null): string {
  if (s == null) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}

function fmtPace(sPerKm: number | null): string {
  if (sPerKm == null) return '—'
  const m = Math.floor(sPerKm / 60)
  const s = Math.round(sPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

function avg(vals: (number | null)[], round = 0): string {
  const defined = vals.filter((v): v is number => v != null)
  if (!defined.length) return '—'
  const a = defined.reduce((s, v) => s + v, 0) / defined.length
  return round === 0 ? String(Math.round(a)) : a.toFixed(round)
}

function fmtKm(m: number | null): string {
  if (m == null) return '—'
  return `${(m / 1000).toFixed(1)} km`
}

export default async function TrendsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getUserByClerkId(clerkId)
  if (!user) redirect('/sign-in')

  const today = new Date().toISOString().split('T')[0]
  const weekStart = getWeekStart(today)
  const hasBio = user.weightKg != null && user.heightCm != null && user.age != null && user.sex != null
  const bio = hasBio ? {
    weightKg: user.weightKg!,
    heightCm: user.heightCm!,
    age: user.age!,
    sex: user.sex! as 'male' | 'female' | 'other',
  } : undefined

  const { days } = await getWeekTrends(user.id, weekStart, bio)

  const labels = days.map(d => d.label)

  const todayIdx = days.findIndex(d => d.date === today)
  const ti = todayIdx === -1 ? 6 : todayIdx

  const sleepVals = days.map(d => d.sleepDurationS != null ? Math.round(d.sleepDurationS / 60) : null)
  const hrvVals = days.map(d => d.hrvRmssd)
  const hrVals = days.map(d => d.restingHr)
  const vo2Vals = days.map(d => d.vo2max)
  const burnedVals = days.map(d => d.caloriesBurned)
  const consumedVals = days.map(d => d.caloriesConsumed)
  const netVals = days.map(d =>
    d.caloriesConsumed != null && d.caloriesBurned != null
      ? d.caloriesConsumed - d.caloriesBurned
      : null
  )
  const distVals = days.map(d => d.runDistanceM)
  const paceVals = days.map(d => d.runPaceSPerKm)

  const avgSleepS = (() => {
    const defined = sleepVals.filter((v): v is number => v != null)
    if (!defined.length) return null
    return Math.round(defined.reduce((s, v) => s + v, 0) / defined.length) * 60
  })()

  const totalDistM = distVals.reduce<number | null>(
    (s, v) => v != null ? (s ?? 0) + v : s,
    null
  )

  const nonNullPaces = paceVals.filter((v): v is number => v != null)
  const bestPace: number | null = nonNullPaces.length
    ? nonNullPaces.reduce((best, v) => v < best ? v : best)
    : null

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">This Week</h1>

      <TrendCard
        title="Sleep"
        summary={fmtSleep(avgSleepS) + ' avg'}
        info="Total sleep duration each night, synced from Intervals.icu. Higher is generally better — most adults need 7–9 hours."
      >
        <SparkLine values={sleepVals} labels={labels} color="#00BCD4" today={ti} />
      </TrendCard>

      <TrendCard
        title="Heart Rate Variability"
        summary={`Avg ${avg(hrvVals, 1)} ms`}
        info="HRV (RMSSD) measures the variation in time between heartbeats. Higher values indicate better recovery and readiness. A rising trend is a positive sign."
      >
        <SparkLine values={hrvVals} labels={labels} color="#00C853" today={ti} />
      </TrendCard>

      <TrendCard
        title="Resting HR"
        summary={`Avg ${avg(hrVals)} bpm`}
        info="Your heart rate at rest. A lower resting HR generally means better cardiovascular fitness. Spikes can indicate fatigue, illness, or poor recovery."
      >
        <SparkLine values={hrVals} labels={labels} color="#f59e0b" today={ti} />
      </TrendCard>

      <TrendCard
        title="VO2 Max"
        summary={`Avg ${avg(vo2Vals, 1)} ml/kg/min`}
        info="An estimate of your maximum aerobic capacity — how efficiently your body uses oxygen during exercise. Higher is better. Changes slowly over weeks of training."
      >
        <SparkLine values={vo2Vals} labels={labels} color="#00C853" today={ti} />
      </TrendCard>

      <TrendCard
        title="Calories Burned"
        summary={`Avg ${avg(burnedVals)} kcal`}
        info="Total calories burned through recorded activities each day, synced from Intervals.icu."
      >
        <BarChart values={burnedVals} labels={labels} color="#f59e0b" unit="kcal" today={ti} />
      </TrendCard>

      <TrendCard
        title="Calories Consumed"
        summary={`Avg ${avg(consumedVals)} kcal`}
        info="Total calories logged in the Food tab each day."
      >
        <BarChart values={consumedVals} labels={labels} color="#00C853" unit="kcal" today={ti} />
      </TrendCard>

      <TrendCard
        title="Net Calories"
        summary={`Avg ${avg(netVals)} kcal`}
        info="Consumed minus burned. Positive means you ate more than you burned; negative means a deficit. Days with missing food or activity data will show as empty."
      >
        <BarChart values={netVals} labels={labels} color="#00BCD4" unit="kcal" today={ti} />
      </TrendCard>

      <TrendCard
        title="Run Distance"
        summary={`Total ${fmtKm(totalDistM)}`}
        info="Total distance run each day. The summary shows your week's total."
      >
        <BarChart
          values={distVals.map(v => v != null ? Math.round(v / 100) / 10 : null)}
          labels={labels}
          color="#00C853"
          unit="km"
          today={ti}
        />
      </TrendCard>

      <TrendCard
        title="Run Pace"
        summary={`Best ${fmtPace(bestPace)}`}
        info="Average pace for each run day. The chart shows faster days higher — lower min/km is better. The summary shows your best (fastest) pace of the week."
      >
        {/* Invert pace so faster (lower s/km) = higher on chart; fmtValue converts back to readable pace */}
        <SparkLine
          values={paceVals.map(v => v != null ? -v : null)}
          labels={labels}
          color="#00BCD4"
          today={ti}
          fmtValue={v => fmtPace(-v)}
        />
      </TrendCard>
    </div>
  )
}
