# Task 6 Brief: Wire Today Page — Burn Breakdown + Day Navigation

**Plan:** 2026-08-27-burn-breakdown-and-day-nav.md  
**Repo:** C:\Users\david\Documents\GitHub\Pulse  
**Base commit:** b1945e6

## Context

This is the integration task. All building blocks now exist:
- `lib/burn.ts` — `calculateBurnBreakdown` (Task 1)
- `getDayActivitySummary` in `lib/db/queries/activities.ts` (Task 2)
- `CalorieRing` with optional `breakdown` prop (Task 4)
- `DayNav` component (Task 5)

`lib/db/queries/wellness.ts` already has the correct signature: `getTodayWellness(userId: string, date: string)` — no change needed there.

Current `app/(dashboard)/page.tsx` has a TODO comment and passes `burned={0}`. This task does the full rewrite.

## Replace entire `app/(dashboard)/page.tsx` with:

```tsx
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, upsertUser } from '@/lib/db/queries/users'
import { getTodayWellness } from '@/lib/db/queries/wellness'
import { getDayActivitySummary } from '@/lib/db/queries/activities'
import { calculateBurnBreakdown } from '@/lib/burn'
import { syncUserWithCooldown } from '@/lib/intervals/sync'
import { SleepCard } from '@/components/today/SleepCard'
import { StepsCard } from '@/components/today/StepsCard'
import { HrvCard } from '@/components/today/HrvCard'
import { CalorieRing } from '@/components/today/CalorieRing'
import { DayNav } from '@/components/today/DayNav'
import Link from 'next/link'

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { userId: clerkId, sessionClaims } = await auth()
  if (!clerkId) return null

  let user = await getUserByClerkId(clerkId)
  if (!user) user = await upsertUser(clerkId, (sessionClaims?.email as string) ?? '')

  // Auto-sync on load with cooldown — don't await so it doesn't block rendering
  syncUserWithCooldown(user.id, user.lastSyncedAt).catch(() => {})

  const today = new Date().toISOString().split('T')[0]
  const { date: dateParam } = await searchParams
  const date = dateParam && dateParam <= today ? dateParam : today
  const isToday = date === today

  const [wellness, activitySummary] = await Promise.all([
    getTodayWellness(user.id, date),
    getDayActivitySummary(user.id, date),
  ])

  // Compute burn breakdown if we have the bio data needed for BMR
  const hasBio = user.weightKg != null && user.heightCm != null && user.age != null && user.sex != null
  const breakdown = hasBio
    ? calculateBurnBreakdown({
        weightKg: user.weightKg!,
        heightCm: user.heightCm!,
        age: user.age!,
        sex: user.sex! as 'male' | 'female' | 'other',
        activityCalories: activitySummary.totalCalories,
        activityDurationS: activitySummary.totalDurationS,
        totalSteps: wellness?.steps ?? 0,
        activitySteps: activitySummary.estimatedSteps,
      })
    : null

  const burned = breakdown?.total ?? activitySummary.totalCalories

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <DayNav date={date} isToday={isToday} />
        <Link href="/wellness" className="text-sm text-[#00C853]">Override</Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StepsCard steps={wellness?.steps} goal={10000} />
        <HrvCard hrv={wellness?.hrvRmssd} restingHr={wellness?.restingHr} />
      </div>

      <SleepCard
        score={wellness?.sleepScore}
        durationS={wellness?.sleepDurationS}
        quality={wellness?.sleepQuality}
      />

      <CalorieRing
        consumed={0}
        goal={user.calorieGoal ?? 2300}
        burned={burned}
        breakdown={breakdown ?? undefined}
      />
    </div>
  )
}
```

## Key things to verify

1. `searchParams` is typed as `Promise<{ date?: string }>` — this is correct for Next.js 15 App Router (searchParams is async)
2. The `sex` field from the DB is typed as the DB enum, so the `as 'male' | 'female' | 'other'` cast is needed
3. `breakdown ?? undefined` converts null to undefined to match the optional prop type

## Steps

- [ ] Read `app/(dashboard)/page.tsx` (confirm current content)
- [ ] Replace it with the exact content above
- [ ] Run `npx tsc --noEmit` — fix any type errors before committing
- [ ] Commit: `git add app/(dashboard)/page.tsx && git commit -m "feat: wire burn breakdown and day navigation into Today page (#5 #6)"`

## Report

Write your full report to: `docs/superpowers/plans/burn-task-6-report.md`

Return only:
- Status: DONE / BLOCKED / NEEDS_CONTEXT
- Commit hash
- One-line test summary
- Any concerns
