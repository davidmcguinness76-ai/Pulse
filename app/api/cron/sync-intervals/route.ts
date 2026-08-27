import { NextRequest, NextResponse } from 'next/server'
import { fetchWellness, fetchActivities } from '@/lib/intervals/client'
import { parseWellness, parseActivity } from '@/lib/intervals/parser'
import { upsertWellness } from '@/lib/db/queries/wellness'
import { upsertActivity } from '@/lib/db/queries/activities'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

// This route is called by Vercel Cron every 30 minutes.
// It syncs the last 2 days of data for all users who have an Intervals.icu connection.
// Currently single-user (David), but the loop over users makes it multi-user ready.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const newest = today.toISOString().split('T')[0]
  const oldest = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const allUsers = await db.select().from(users)

  let wellnessUpserted = 0
  let activitiesUpserted = 0
  const errors: string[] = []

  for (const user of allUsers) {
    try {
      const [rawWellness, rawActivities] = await Promise.all([
        fetchWellness(oldest, newest),
        fetchActivities(oldest, newest),
      ])

      for (const w of rawWellness) {
        const parsed = parseWellness(w)
        await upsertWellness({
          userId: user.id,
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
          userId: user.id,
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
    } catch (err) {
      errors.push(`user ${user.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ ok: true, wellnessUpserted, activitiesUpserted, errors })
}
