import { fetchWellness, fetchActivities } from '@/lib/intervals/client'
import { parseWellness, parseActivity } from '@/lib/intervals/parser'
import { upsertWellness } from '@/lib/db/queries/wellness'
import { upsertActivity } from '@/lib/db/queries/activities'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const SYNC_COOLDOWN_MS = 5 * 60 * 1000

export type SyncResult = {
  ok: boolean
  wellnessUpserted: number
  activitiesUpserted: number
  errors: string[]
  skipped?: boolean
}

export async function syncUser(userId: string): Promise<SyncResult> {
  const today = new Date()
  const newest = today.toISOString().split('T')[0]
  const oldest = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let wellnessUpserted = 0
  let activitiesUpserted = 0
  const errors: string[] = []

  try {
    const [rawWellness, rawActivities] = await Promise.all([
      fetchWellness(oldest, newest),
      fetchActivities(oldest, newest),
    ])

    for (const w of rawWellness) {
      const parsed = parseWellness(w)
      await upsertWellness({
        userId,
        date: parsed.date,
        source: 'intervals_icu',
        steps: parsed.steps,
        restingHr: parsed.restingHr,
        hrvRmssd: parsed.hrvRmssd,
        sleepScore: parsed.sleepScore,
        sleepQuality: parsed.sleepQuality,
        sleepDurationS: parsed.sleepDurationS,
        weight: parsed.weight,
        vo2max: parsed.vo2max,
      })
      wellnessUpserted++
    }

    for (const a of rawActivities) {
      const parsed = parseActivity(a)
      await upsertActivity({
        userId,
        intervalsActivityId: parsed.intervalsActivityId,
        type: parsed.type,
        name: parsed.name,
        startedAt: parsed.startedAt,
        durationS: parsed.durationS,
        distanceM: parsed.distanceM,
        avgPaceSPerKm: parsed.avgPaceSPerKm,
        avgHr: parsed.avgHr,
        maxHr: parsed.maxHr,
        caloriesBurned: parsed.caloriesBurned,
        elevationM: parsed.elevationM,
        rawJson: parsed.rawJson,
      })
      activitiesUpserted++
    }

    await db.update(users).set({ lastSyncedAt: new Date() }).where(eq(users.id, userId))
  } catch (err) {
    errors.push(String(err))
  }

  return { ok: errors.length === 0, wellnessUpserted, activitiesUpserted, errors }
}

export async function syncAllUsers(): Promise<SyncResult> {
  const allUsers = await db.select().from(users)
  let wellnessUpserted = 0
  let activitiesUpserted = 0
  const errors: string[] = []

  for (const user of allUsers) {
    const result = await syncUser(user.id)
    wellnessUpserted += result.wellnessUpserted
    activitiesUpserted += result.activitiesUpserted
    errors.push(...result.errors)
  }

  return { ok: errors.length === 0, wellnessUpserted, activitiesUpserted, errors }
}

export async function syncUserWithCooldown(userId: string, lastSyncedAt: Date | null): Promise<SyncResult> {
  if (lastSyncedAt && Date.now() - lastSyncedAt.getTime() < SYNC_COOLDOWN_MS) {
    return { ok: true, wellnessUpserted: 0, activitiesUpserted: 0, errors: [], skipped: true }
  }
  return syncUser(userId)
}
