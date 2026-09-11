# Task 2 Brief: Activity Query — Duration + Step Estimate

**Plan:** 2026-08-27-burn-breakdown-and-day-nav.md  
**Repo:** C:\Users\david\Documents\GitHub\Pulse  
**Base commit:** 2d34eeb

## Context

Task 1 created `lib/burn.ts` which needs `activityCalories`, `activityDurationS`, and `activitySteps` from a DB query. This task replaces the old `getTodayCaloriesBurned` function with a richer `getDayActivitySummary` that returns all three.

## What to build

Replace the entire contents of `lib/db/queries/activities.ts` with:

```ts
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
```

## Also update app/(dashboard)/page.tsx

The current page imports `getTodayCaloriesBurned` — that function no longer exists. Update the import line:

Change:
```ts
import { getTodayCaloriesBurned } from '@/lib/db/queries/activities'
```
To:
```ts
import { getDayActivitySummary } from '@/lib/db/queries/activities'
```

The page body still calls `getTodayCaloriesBurned(user.id, today)` — remove or comment out that call and the `burned` variable for now. The page will be fully rewritten in Task 6. Goal: file must compile cleanly after your change.

## Steps

- [ ] Read `lib/db/queries/activities.ts` (current content)
- [ ] Read `app/(dashboard)/page.tsx` (current content)
- [ ] Replace `lib/db/queries/activities.ts` with the content above
- [ ] Update the import in `app/(dashboard)/page.tsx` and remove/comment the dead call
- [ ] Run `npx tsc --noEmit` — fix any type errors before committing
- [ ] Commit: `git add lib/db/queries/activities.ts app/(dashboard)/page.tsx && git commit -m "feat: activity summary query with duration and step estimate (#5)"`

## Report

Write your full report to: `docs/superpowers/plans/task-2-report.md`

Return only:
- Status: DONE / BLOCKED / NEEDS_CONTEXT
- Commit hash
- One-line test summary
- Any concerns
