import { eq, desc, and, gte, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { activities, type NewActivity, type Activity } from '@/lib/db/schema'

export type DayActivitySummary = {
  totalCalories: number
  totalDurationS: number
  estimatedSteps: number
}

function estimateStepsFromActivity(type: string, distanceM: number | null): number {
  if (!distanceM) return 0
  const km = distanceM / 1000
  if (type === 'run') return Math.round(km * 793)
  if (type === 'walk') return Math.round(km * 1363)
  return 0
}

export async function getDayActivitySummary(userId: string, date: string): Promise<DayActivitySummary> {
  const start = new Date(date)
  const end = new Date(date)
  end.setDate(end.getDate() + 1)

  const rows = await db
    .select({
      caloriesBurned: activities.caloriesBurned,
      durationS: activities.durationS,
      distanceM: activities.distanceM,
      type: activities.type,
    })
    .from(activities)
    .where(and(eq(activities.userId, userId), gte(activities.startedAt, start), lt(activities.startedAt, end)))

  let totalCalories = 0
  let totalDurationS = 0
  let estimatedSteps = 0

  for (const row of rows) {
    totalCalories += row.caloriesBurned ?? 0
    totalDurationS += row.durationS ?? 0
    estimatedSteps += estimateStepsFromActivity(row.type, row.distanceM)
  }

  return { totalCalories, totalDurationS, estimatedSteps }
}

export async function upsertActivity(data: NewActivity): Promise<void> {
  await db
    .insert(activities)
    .values(data)
    .onConflictDoUpdate({ target: activities.intervalsActivityId, set: data })
}

export async function getRecentActivities(userId: string, limit = 10): Promise<Activity[]> {
  return db.query.activities.findMany({
    where: eq(activities.userId, userId),
    orderBy: desc(activities.startedAt),
    limit,
  })
}
