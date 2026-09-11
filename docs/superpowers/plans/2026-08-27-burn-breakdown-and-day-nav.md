# Burn Breakdown & Day Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a 3-part calorie burn breakdown (BMR passive, activity, non-activity steps) in an expandable CalorieRing, add height/age/sex to profile, and enable day navigation on the Today dashboard.

**Architecture:** A pure `lib/burn.ts` module owns the formula. The dashboard page accepts a `date` search param and fetches all data for that date. A client `DayNav` component handles arrow navigation by pushing search params. CalorieRing gains an optional expandable breakdown panel.

**Tech Stack:** Next.js App Router, Drizzle ORM, TypeScript, Tailwind CSS. No new dependencies.

## Global Constraints

- No new npm packages
- `sexEnum` values are `'male' | 'female' | 'other'` — Other maps to average of male/female BMR
- Step multipliers: run ~793 steps/km → 1000/793 ≈ 1.261 kcal/step (at ~5 kcal/km/kg... use simpler fixed: 0.04 kcal/step for run-pace, 0.03 kcal/step for walk-pace) — **use 0.04 kcal/step for all non-activity steps** (conservative, revisable)
- Mifflin-St Jeor: male = 10×weight + 6.25×height − 5×age + 5; female = 10×weight + 6.25×height − 5×age − 161; other = average
- Activity time deduction: sum `durationS` of today's activities, convert to hours, subtract from 24 before computing passive BMR fraction
- Issues: #5 (burn breakdown), #6 (day navigation)
- Commit format: `type: description (#issue-number)`

---

### Task 1: Burn formula module

**Files:**
- Create: `lib/burn.ts`
- Test: inline `node` check in step 2 (no test framework needed — pure functions)

**Interfaces:**
- Produces:
  ```ts
  type BurnBreakdown = {
    bmrPassive: number   // BMR × (24h − activityHours) / 24, rounded
    activity: number     // sum of activity calories from Garmin
    nonActivitySteps: number  // (totalSteps − estimatedActivitySteps) × 0.04
    total: number        // sum of all three
  }

  function calculateBmr(weightKg: number, heightCm: number, age: number, sex: 'male' | 'female' | 'other'): number

  function calculateBurnBreakdown(params: {
    weightKg: number
    heightCm: number
    age: number
    sex: 'male' | 'female' | 'other'
    activityCalories: number
    activityDurationS: number
    totalSteps: number
    activitySteps: number
  }): BurnBreakdown
  ```

- [ ] **Step 1: Create `lib/burn.ts`**

```ts
export type BurnBreakdown = {
  bmrPassive: number
  activity: number
  nonActivitySteps: number
  total: number
}

export function calculateBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female' | 'other'
): number {
  const male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  if (sex === 'male') return male
  if (sex === 'female') return female
  return (male + female) / 2
}

export function calculateBurnBreakdown(params: {
  weightKg: number
  heightCm: number
  age: number
  sex: 'male' | 'female' | 'other'
  activityCalories: number
  activityDurationS: number
  totalSteps: number
  activitySteps: number
}): BurnBreakdown {
  const bmr = calculateBmr(params.weightKg, params.heightCm, params.age, params.sex)
  const activityHours = params.activityDurationS / 3600
  const passiveFraction = Math.max(0, 24 - activityHours) / 24
  const bmrPassive = Math.round(bmr * passiveFraction)

  const nonActivitySteps = Math.max(0, params.totalSteps - params.activitySteps)
  // ponytail: fixed 0.04 kcal/step, revisit with run/walk split when step type data available
  const nonActivityStepsCal = Math.round(nonActivitySteps * 0.04)

  const total = bmrPassive + params.activityCalories + nonActivityStepsCal

  return {
    bmrPassive,
    activity: params.activityCalories,
    nonActivitySteps: nonActivityStepsCal,
    total,
  }
}
```

- [ ] **Step 2: Verify the formula with a quick node check**

Run in terminal (PowerShell):
```powershell
node -e "
const { calculateBurnBreakdown } = require('./lib/burn.ts')
" 
```
That will fail (TS). Instead verify logic by reading: for 80kg, 180cm, 35yo male with 1h activity (3600s), 8000 steps total, 2000 activity steps, 450 activity cals:
- BMR = 10×80 + 6.25×180 − 5×35 + 5 = 800 + 1125 − 175 + 5 = 1755
- passiveFraction = 23/24 = 0.9583 → bmrPassive = 1683
- nonActivitySteps = 6000 × 0.04 = 240
- total = 1683 + 450 + 240 = 2373
Confirm this matches your mental model before continuing.

- [ ] **Step 3: Commit**

```bash
git add lib/burn.ts
git commit -m "feat: add 3-part calorie burn formula (#5)"
```

---

### Task 2: Activity query returns duration and step estimate

**Files:**
- Modify: `lib/db/queries/activities.ts`

**Interfaces:**
- Consumes: existing `activities` table — `caloriesBurned`, `durationS`, `distanceM`, `type`
- Produces:
  ```ts
  type DayActivitySummary = {
    totalCalories: number
    totalDurationS: number
    estimatedSteps: number  // derived from distanceM × type multiplier
  }

  async function getDayActivitySummary(userId: string, date: string): Promise<DayActivitySummary>
  ```
  Step estimation: run → 793 steps/km, walk → 1363 steps/km, other types → 0 (conservative)

- [ ] **Step 1: Replace `getTodayCaloriesBurned` with `getDayActivitySummary` in `lib/db/queries/activities.ts`**

```ts
import { eq, desc, and, gte, lt, sum, sql } from 'drizzle-orm'
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

- [ ] **Step 2: Fix the import in `app/(dashboard)/page.tsx`**

Change:
```ts
import { getTodayCaloriesBurned } from '@/lib/db/queries/activities'
```
To:
```ts
import { getDayActivitySummary } from '@/lib/db/queries/activities'
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/queries/activities.ts app/(dashboard)/page.tsx
git commit -m "feat: activity summary query with duration and step estimate (#5)"
```

---

### Task 3: Profile API and form — add height, age, sex

**Files:**
- Modify: `app/api/profile/route.ts`
- Create: `components/ProfileForm.tsx`
- Modify: `app/(dashboard)/profile/page.tsx`

**Interfaces:**
- Consumes: `User` type from schema (already has `heightCm`, `age`, `sex`, `calorieGoal`, `weightKg`)
- Produces: `ProfileForm` component that saves all bio fields in one POST

- [ ] **Step 1: Extend the profile API to accept bio fields in `app/api/profile/route.ts`**

```ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const ProfileSchema = z.object({
  calorieGoal: z.number().int().min(500).max(10000).optional(),
  heightCm: z.number().min(50).max(300).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  age: z.number().int().min(10).max(120).optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
})

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserByClerkId(clerkId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const parsed = ProfileSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await db.update(users).set(parsed.data).where(eq(users.id, user.id))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create `components/ProfileForm.tsx`**

```tsx
'use client'
import { useState } from 'react'

type Props = {
  calorieGoal: number
  heightCm: number | null
  weightKg: number | null
  age: number | null
  sex: 'male' | 'female' | 'other' | null
}

export function ProfileForm({ calorieGoal, heightCm, weightKg, age, sex }: Props) {
  const [form, setForm] = useState({
    calorieGoal,
    heightCm: heightCm ?? '',
    weightKg: weightKg ?? '',
    age: age ?? '',
    sex: sex ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body: Record<string, unknown> = {}
    if (form.calorieGoal) body.calorieGoal = Number(form.calorieGoal)
    if (form.heightCm !== '') body.heightCm = Number(form.heightCm)
    if (form.weightKg !== '') body.weightKg = Number(form.weightKg)
    if (form.age !== '') body.age = Number(form.age)
    if (form.sex) body.sex = form.sex
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const row = (label: string, key: string, type: 'number' | 'text', unit?: string) => (
    <div className="flex items-center gap-3">
      <label className="text-gray-300 text-sm flex-1">{label}</label>
      <input
        type={type}
        value={form[key as keyof typeof form]}
        onChange={e => set(key, e.target.value)}
        className="w-24 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm text-right"
      />
      {unit && <span className="text-gray-500 text-sm w-6">{unit}</span>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {row('Daily calorie goal', 'calorieGoal', 'number', 'kcal')}
      {row('Height', 'heightCm', 'number', 'cm')}
      {row('Weight', 'weightKg', 'number', 'kg')}
      {row('Age', 'age', 'number', 'yrs')}
      <div className="flex items-center gap-3">
        <label className="text-gray-300 text-sm flex-1">Sex</label>
        <select
          value={form.sex}
          onChange={e => set('sex', e.target.value)}
          className="w-28 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm"
        >
          <option value="">—</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="pt-1">
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#00C853] hover:bg-[#00E676] disabled:opacity-50 text-black text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Update `app/(dashboard)/profile/page.tsx` to use ProfileForm**

```tsx
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { UserButton } from '@clerk/nextjs'
import { SyncButton } from '@/components/SyncButton'
import { ProfileForm } from '@/components/ProfileForm'

export default async function ProfilePage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const user = await getUserByClerkId(clerkId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Intervals.icu Sync</h2>
        <SyncButton lastSyncedAt={user?.lastSyncedAt ?? null} />
      </section>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Daily Wellness</h2>
        <p className="text-gray-500 text-sm">Intervals.icu syncs sleep, HRV, steps and resting HR automatically. Override values if needed.</p>
        <a href="/wellness" className="block text-center bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          Override Today&apos;s Wellness
        </a>
      </section>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Goals &amp; Body</h2>
        <ProfileForm
          calorieGoal={user?.calorieGoal ?? 2300}
          heightCm={user?.heightCm ?? null}
          weightKg={user?.weightKg ?? null}
          age={user?.age ?? null}
          sex={user?.sex ?? null}
        />
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Delete `components/CalorieGoalForm.tsx`** — replaced by ProfileForm

```bash
git rm components/CalorieGoalForm.tsx
```

- [ ] **Step 5: Commit**

```bash
git add app/api/profile/route.ts components/ProfileForm.tsx app/(dashboard)/profile/page.tsx
git commit -m "feat: add height/age/sex to profile form and API (#5)"
```

---

### Task 4: CalorieRing — expandable burn breakdown

**Files:**
- Modify: `components/today/CalorieRing.tsx`

**Interfaces:**
- Consumes:
  ```ts
  type Props = {
    consumed: number
    goal: number
    burned: number           // total, for ring display (unchanged)
    breakdown?: {
      bmrPassive: number
      activity: number
      nonActivitySteps: number
    }
  }
  ```
- Produces: same `CalorieRing` export, now with a tap-to-expand burn detail panel

- [ ] **Step 1: Rewrite `components/today/CalorieRing.tsx`**

```tsx
'use client'
import { useState } from 'react'

type Breakdown = {
  bmrPassive: number
  activity: number
  nonActivitySteps: number
}

type Props = { consumed: number; goal: number; burned: number; breakdown?: Breakdown }

export function CalorieRing({ consumed, goal, burned, breakdown }: Props) {
  const [open, setOpen] = useState(false)
  const net = goal - consumed + burned
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0
  const r = 48
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-4">
        <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke="#00C853" strokeWidth="10"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
          <text x="60" y="56" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">{consumed}</text>
          <text x="60" y="70" textAnchor="middle" fill="#6b7280" fontSize="9">eaten</text>
        </svg>
        <div className="space-y-2 text-sm flex-1">
          <div><span className="text-gray-500">Goal </span><span className="text-white font-medium">{goal} kcal</span></div>
          <div>
            <span className="text-gray-500">Burned </span>
            <button
              onClick={() => breakdown && setOpen(o => !o)}
              className={`font-medium ${breakdown ? 'text-[#00C853] underline decoration-dotted underline-offset-2' : 'text-[#00C853]'}`}
            >
              +{burned}
            </button>
          </div>
          <div><span className="text-gray-500">Remaining </span><span className={`font-semibold ${net >= 0 ? 'text-white' : 'text-red-400'}`}>{net} kcal</span></div>
        </div>
      </div>

      {open && breakdown && (
        <div className="border-t border-gray-800 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Passive (BMR)</span>
            <span className="text-white">{breakdown.bmrPassive} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Activities</span>
            <span className="text-white">{breakdown.activity} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Non-activity steps</span>
            <span className="text-white">{breakdown.nonActivitySteps} kcal</span>
          </div>
          <div className="flex justify-between border-t border-gray-800 pt-1 font-medium">
            <span className="text-gray-400">Total burned</span>
            <span className="text-[#00C853]">{burned} kcal</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

Note: the "Burned" value is tappable only when `breakdown` is provided. If bio data is missing the breakdown won't be passed and the value is inert.

- [ ] **Step 2: Commit**

```bash
git add components/today/CalorieRing.tsx
git commit -m "feat: expandable burn breakdown in CalorieRing (#5)"
```

---

### Task 5: Day navigation component

**Files:**
- Create: `components/today/DayNav.tsx`

**Interfaces:**
- Consumes: `date: string` (ISO `YYYY-MM-DD`), `isToday: boolean`
- Produces: client component that pushes `?date=YYYY-MM-DD` search param. Prevents navigating into the future.

- [ ] **Step 1: Create `components/today/DayNav.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'

type Props = { date: string; isToday: boolean }

function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatLabel(iso: string, isToday: boolean): string {
  if (isToday) return 'Today'
  const d = new Date(iso + 'T12:00:00') // noon avoids DST shift
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function DayNav({ date, isToday }: Props) {
  const router = useRouter()

  function go(n: number) {
    const next = addDays(date, n)
    const today = new Date().toISOString().split('T')[0]
    if (next > today) return
    router.push(next === today ? '/' : `/?date=${next}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => go(-1)}
        className="text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors text-lg leading-none"
        aria-label="Previous day"
      >
        ‹
      </button>
      <span className="text-2xl font-bold flex-1">{formatLabel(date, isToday)}</span>
      <button
        onClick={() => go(1)}
        disabled={isToday}
        className="text-gray-400 hover:text-white disabled:opacity-30 px-2 py-1 rounded-lg hover:bg-gray-800 disabled:hover:bg-transparent transition-colors text-lg leading-none"
        aria-label="Next day"
      >
        ›
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/today/DayNav.tsx
git commit -m "feat: day navigation component with arrow controls (#6)"
```

---

### Task 6: Wire everything into the Today page

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Modify: `lib/db/queries/wellness.ts` — ensure `getTodayWellness` accepts any date (check signature)

**Interfaces:**
- Consumes: `searchParams: { date?: string }` from Next.js App Router
- Consumes: `getDayActivitySummary` from Task 2
- Consumes: `calculateBurnBreakdown` from Task 1
- Consumes: `DayNav` from Task 5
- Consumes: updated `CalorieRing` from Task 4

- [ ] **Step 1: Check `getTodayWellness` in `lib/db/queries/wellness.ts`**

Open the file. If it already takes `(userId: string, date: string)` — no change needed. If it's hardcoded to today, update it to accept a `date` parameter and query by that date.

The expected signature:
```ts
export async function getTodayWellness(userId: string, date: string): Promise<DailyWellness | undefined>
```

If the body uses `new Date().toISOString().split('T')[0]` internally, replace it with the passed `date` param.

- [ ] **Step 2: Rewrite `app/(dashboard)/page.tsx`**

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

- [ ] **Step 3: Run type-check**

```powershell
npx tsc --noEmit
```

Fix any type errors before committing.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/page.tsx lib/db/queries/wellness.ts
git commit -m "feat: wire burn breakdown and day navigation into Today page (#5 #6)"
```

---

### Task 7: Manual smoke test

- [ ] **Step 1: Run the dev server**

```powershell
npm run dev
```

- [ ] **Step 2: Go to Profile, fill in height/age/sex, save**

Navigate to `/profile`. Enter realistic values (e.g. 180cm, 80kg, 35, Male). Hit Save. Confirm the ✓ Saved feedback appears.

- [ ] **Step 3: Go to Today, verify burn breakdown**

Navigate to `/`. The Burned value should now be a dotted-underline tappable link. Tap it — the breakdown panel should expand showing Passive (BMR), Activities, Non-activity steps, and Total.

- [ ] **Step 4: Verify day navigation**

Tap the ‹ arrow. The date label should change to yesterday (e.g. "Tue 26 Aug"). Data cards should update. Tap › to come back to Today. The › arrow should be disabled on Today.

- [ ] **Step 5: Verify missing bio graceful fallback**

Temporarily clear bio fields (or use a separate test account with no bio). Burned should show raw activity calories with no tappable breakdown.

- [ ] **Step 6: Close tickets**

```bash
gh issue close 5 --repo davidmcguinness76-ai/Pulse
gh issue close 6 --repo davidmcguinness76-ai/Pulse
```
