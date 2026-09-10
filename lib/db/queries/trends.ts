import { and, gte, lt, lte, eq, sum } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dailyWellness, activities, nutritionLog } from '@/lib/db/schema'

export type DayTrend = {
  date: string
  label: string
  sleepDurationS: number | null
  hrvRmssd: number | null
  restingHr: number | null
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

export async function getWeekTrends(userId: string, weekStart: string): Promise<WeekTrends> {
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
      caloriesBurned: dailyWellness.caloriesBurned,
    })
    .from(dailyWellness)
    .where(
      and(
        eq(dailyWellness.userId, userId),
        gte(dailyWellness.date, weekStart),
        lte(dailyWellness.date, weekEnd),
      )
    )

  for (const row of wellnessRows) {
    const day = skeleton.get(row.date)
    if (!day) continue
    day.sleepDurationS = row.sleepDurationS ?? null
    day.hrvRmssd = row.hrvRmssd ?? null
    day.restingHr = row.restingHr ?? null
    day.caloriesBurned = row.caloriesBurned ?? null
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
      durationS: activities.durationS,
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

  // Accumulate distance + duration per day for weighted pace
  const runAccum = new Map<string, { distanceM: number; durationS: number }>()
  for (const row of activityRows) {
    const ds = row.startedAt.toISOString().split('T')[0]
    const acc = runAccum.get(ds) ?? { distanceM: 0, durationS: 0 }
    acc.distanceM += row.distanceM ?? 0
    acc.durationS += row.durationS ?? 0
    runAccum.set(ds, acc)
  }

  for (const [ds, acc] of runAccum) {
    const day = skeleton.get(ds)
    if (!day) continue
    day.runDistanceM = acc.distanceM > 0 ? acc.distanceM : null
    // pace = seconds per km
    day.runPaceSPerKm = acc.distanceM > 0 ? acc.durationS / (acc.distanceM / 1000) : null
  }

  return {
    weekStart,
    weekEnd,
    days: [...skeleton.values()],
  }
}
