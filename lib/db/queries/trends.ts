import { and, gte, lt, lte, eq, sum } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dailyWellness, activities, nutritionLog } from '@/lib/db/schema'
import { calculateBurnBreakdown } from '@/lib/burn'

export type UserBio = {
  weightKg: number
  heightCm: number
  age: number
  sex: 'male' | 'female' | 'other'
}

export type DayTrend = {
  date: string
  label: string
  sleepDurationS: number | null
  hrvRmssd: number | null
  restingHr: number | null
  vo2max: number | null
  caloriesBurned: number | null
  caloriesConsumed: number | null
  runDistanceM: number | null
  runPaceSPerKm: number | null
}

export type WeekTrends = {
  weekStart: string
  weekEnd: string
  days: DayTrend[]
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export async function getWeekTrends(userId: string, weekStart: string, bio?: UserBio): Promise<WeekTrends> {
  // weekStart is Monday 'YYYY-MM-DD'; weekEnd is Sunday
  const startDate = new Date(weekStart)
  const endDate = new Date(weekStart)
  endDate.setDate(endDate.getDate() + 6)
  const weekEnd = endDate.toISOString().split('T')[0]

  // One day past Sunday for lt comparisons on timestamp columns
  const dayAfterEnd = new Date(weekStart)
  dayAfterEnd.setDate(dayAfterEnd.getDate() + 7)

  // Build the 7-day skeleton keyed by date string
  const skeleton = new Map<string, DayTrend>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const ds = d.toISOString().split('T')[0]
    skeleton.set(ds, {
      date: ds,
      label: DAY_LABELS[i],
      sleepDurationS: null,
      hrvRmssd: null,
      restingHr: null,
      vo2max: null,
      caloriesBurned: null,
      caloriesConsumed: null,
      runDistanceM: null,
      runPaceSPerKm: null,
    })
  }

  // Wellness query (date column — use string comparison)
  const wellnessRows = await db
    .select({
      date: dailyWellness.date,
      sleepDurationS: dailyWellness.sleepDurationS,
      hrvRmssd: dailyWellness.hrvRmssd,
      restingHr: dailyWellness.restingHr,
      vo2max: dailyWellness.vo2max,
      steps: dailyWellness.steps,
    })
    .from(dailyWellness)
    .where(
      and(
        eq(dailyWellness.userId, userId),
        gte(dailyWellness.date, weekStart),
        lte(dailyWellness.date, weekEnd),
      )
    )

  // Per-day wellness steps (for burn calculation)
  const wellnessSteps = new Map<string, number>()

  for (const row of wellnessRows) {
    const day = skeleton.get(row.date)
    if (!day) continue
    day.sleepDurationS = row.sleepDurationS ?? null
    day.hrvRmssd = row.hrvRmssd ?? null
    day.restingHr = row.restingHr ?? null
    day.vo2max = row.vo2max ?? null
    if (row.steps != null) wellnessSteps.set(row.date, row.steps)
  }

  // All activities per day — accumulate for burn calculation
  const burnRows = await db
    .select({
      startedAt: activities.startedAt,
      caloriesBurned: activities.caloriesBurned,
      durationS: activities.durationS,
      distanceM: activities.distanceM,
      type: activities.type,
    })
    .from(activities)
    .where(
      and(
        eq(activities.userId, userId),
        gte(activities.startedAt, startDate),
        lt(activities.startedAt, dayAfterEnd),
      )
    )

  type DayBurn = { actCal: number; actDurS: number; actSteps: number }
  const burnAccum = new Map<string, DayBurn>()

  for (const row of burnRows) {
    const ds = row.startedAt.toISOString().split('T')[0]
    const acc = burnAccum.get(ds) ?? { actCal: 0, actDurS: 0, actSteps: 0 }
    acc.actCal += row.caloriesBurned ?? 0
    acc.actDurS += row.durationS ?? 0
    // estimate activity steps for run/walk to subtract from total steps
    const dist = row.distanceM ?? 0
    if (row.type === 'run') acc.actSteps += Math.round(dist / 1000 * 793)
    else if (row.type === 'walk') acc.actSteps += Math.round(dist / 1000 * 1363)
    burnAccum.set(ds, acc)
  }

  const today = new Date().toISOString().split('T')[0]
  const now = new Date()

  for (const [ds, acc] of burnAccum) {
    const day = skeleton.get(ds)
    if (!day) continue

    if (bio) {
      const isToday = ds === today
      const dayFraction = isToday
        ? (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400
        : 1
      const totalSteps = wellnessSteps.get(ds) ?? 0
      const breakdown = calculateBurnBreakdown({
        ...bio,
        activityCalories: acc.actCal,
        activityDurationS: acc.actDurS,
        totalSteps,
        activitySteps: acc.actSteps,
        dayFraction,
      })
      day.caloriesBurned = breakdown.total
    } else {
      day.caloriesBurned = acc.actCal || null
    }
  }

  // Days with wellness data but no activities still need BMR if bio available
  if (bio) {
    for (const [ds, day] of skeleton) {
      if (day.caloriesBurned != null) continue  // already computed above
      const isToday = ds === today
      const dayFraction = isToday
        ? (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400
        : 1
      const totalSteps = wellnessSteps.get(ds) ?? 0
      if (totalSteps > 0 || ds <= today) {
        const breakdown = calculateBurnBreakdown({
          ...bio,
          activityCalories: 0,
          activityDurationS: 0,
          totalSteps,
          activitySteps: 0,
          dayFraction,
        })
        day.caloriesBurned = breakdown.total
      }
    }
  }

  // Nutrition query — sum calories per date
  const nutritionRows = await db
    .select({
      date: nutritionLog.loggedAt,
      total: sum(nutritionLog.calories),
    })
    .from(nutritionLog)
    .where(
      and(
        eq(nutritionLog.userId, userId),
        gte(nutritionLog.loggedAt, weekStart),
        lte(nutritionLog.loggedAt, weekEnd),
      )
    )
    .groupBy(nutritionLog.loggedAt)

  for (const row of nutritionRows) {
    const day = skeleton.get(row.date)
    if (!day) continue
    day.caloriesConsumed = Number(row.total ?? 0)
  }

  // Activities query — runs only, timestamp column
  const activityRows = await db
    .select({
      startedAt: activities.startedAt,
      distanceM: activities.distanceM,
      avgPaceSPerKm: activities.avgPaceSPerKm,
    })
    .from(activities)
    .where(
      and(
        eq(activities.userId, userId),
        eq(activities.type, 'run'),
        gte(activities.startedAt, startDate),
        lt(activities.startedAt, dayAfterEnd),
      )
    )

  // Accumulate distance + weighted pace per day (uses stored moving pace from Intervals.icu)
  const runAccum = new Map<string, { distanceM: number; weightedPaceSum: number }>()
  for (const row of activityRows) {
    const ds = row.startedAt.toISOString().split('T')[0]
    const acc = runAccum.get(ds) ?? { distanceM: 0, weightedPaceSum: 0 }
    const dist = row.distanceM ?? 0
    const pace = row.avgPaceSPerKm ?? 0
    acc.distanceM += dist
    acc.weightedPaceSum += pace * dist
    runAccum.set(ds, acc)
  }

  for (const [ds, acc] of runAccum) {
    const day = skeleton.get(ds)
    if (!day) continue
    day.runDistanceM = acc.distanceM > 0 ? acc.distanceM : null
    day.runPaceSPerKm = acc.distanceM > 0 ? acc.weightedPaceSum / acc.distanceM : null
  }

  return {
    weekStart,
    weekEnd,
    days: [...skeleton.values()],
  }
}

export async function getMonthTrends(
  userId: string,
  anchorWeekStart: string,
  bio?: UserBio,
): Promise<DayTrend[]> {
  const weeks: string[] = []
  for (let i = 3; i >= 0; i--) {
    const d = new Date(anchorWeekStart + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() - i * 7)
    weeks.push(d.toISOString().split('T')[0])
  }
  const results = await Promise.all(weeks.map(w => getWeekTrends(userId, w, bio)))
  return results.flatMap(r => r.days)
}
