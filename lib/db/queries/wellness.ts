import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dailyWellness, type DailyWellness, type NewDailyWellness } from '@/lib/db/schema'

export async function upsertWellness(data: NewDailyWellness): Promise<void> {
  await db
    .insert(dailyWellness)
    .values(data)
    .onConflictDoUpdate({
      target: [dailyWellness.userId, dailyWellness.date],
      set: data,
    })
}

export async function getTodayWellness(userId: string, date: string): Promise<DailyWellness | undefined> {
  return db.query.dailyWellness.findFirst({
    where: and(
      eq(dailyWellness.userId, userId),
      eq(dailyWellness.date, date),
    ),
  })
}
