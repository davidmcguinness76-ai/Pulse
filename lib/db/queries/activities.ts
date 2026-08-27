import { eq, desc, and, gte, lt, sum } from 'drizzle-orm'
import { db } from '@/lib/db'
import { activities, type NewActivity, type Activity } from '@/lib/db/schema'

export async function upsertActivity(data: NewActivity): Promise<void> {
  await db
    .insert(activities)
    .values(data)
    .onConflictDoUpdate({ target: activities.intervalsActivityId, set: data })
}

export async function getTodayCaloriesBurned(userId: string, date: string): Promise<number> {
  const start = new Date(date)
  const end = new Date(date)
  end.setDate(end.getDate() + 1)
  const result = await db
    .select({ total: sum(activities.caloriesBurned) })
    .from(activities)
    .where(and(eq(activities.userId, userId), gte(activities.startedAt, start), lt(activities.startedAt, end)))
  return Number(result[0]?.total ?? 0)
}

export async function getRecentActivities(userId: string, limit = 10): Promise<Activity[]> {
  return db.query.activities.findMany({
    where: eq(activities.userId, userId),
    orderBy: desc(activities.startedAt),
    limit,
  })
}
