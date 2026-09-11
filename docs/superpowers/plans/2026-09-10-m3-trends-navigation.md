# Trends Week/Month Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add week-by-week `< >` navigation and a Week/Month toggle to the Trends page, with month view showing ~28 days as sparklines for all metrics.

**Architecture:** Navigation state lives in URL search params (`?week=2026-09-08&view=month`) so the existing server component re-runs with the correct date range — no client-side data fetching needed. A new `TrendsNav` client component handles `< >` and the toggle by pushing to the router. Month view reuses `getWeekTrends` called 4× (one per week in the month) and merges into a flat array; all charts use `SparkLine` in month view. The existing `BarChart` is only used in week view.

**Tech Stack:** Next.js 15 App Router (server component + searchParams), `useRouter` for navigation, existing `SparkLine`/`BarChart`/`TrendCard` components, existing `getWeekTrends` query.

## Global Constraints

- TypeScript strict — no `any`, no unsafe `!`
- No new npm dependencies
- URL params: `week=YYYY-MM-DD` (Monday of selected week), `view=week|month` (default `week`)
- Week view: unchanged — 7 bars/points, Mon–Sun labels, today highlighted
- Month view: 4 weeks back from the selected week's Monday (28 days), all SparkLine, no BarChart, no "today" highlight (highlight makes less sense at this density)
- Month view labels: show only Mon labels for each of the 4 weeks (every 7th point), rest empty string — keeps chart readable
- Commit format: `feat/fix: description (#14)`
- Brand colours: `#00C853` green, `#00BCD4` teal, `#f59e0b` amber, dark bg `#111827`
- Mobile-first

---

## File Structure

**New files:**
- `components/trends/TrendsNav.tsx` — client component: `< Week/Month > ` controls

**Modified files:**
- `lib/db/queries/trends.ts` — add `getMonthTrends(userId, anchorWeekStart, bio?)` that returns `DayTrend[]` for 4 weeks (~28 days)
- `app/(dashboard)/trends/page.tsx` — accept `searchParams`, wire `TrendsNav`, branch week/month rendering

---

### Task 1: `getMonthTrends` query

**Files:**
- Modify: `lib/db/queries/trends.ts`

**Interfaces:**
- Consumes: existing `getWeekTrends(userId, weekStart, bio?)`, `UserBio`, `DayTrend`, `WeekTrends` from same file
- Produces:
  ```ts
  // Returns 28 DayTrend entries (4 × Mon–Sun), oldest first
  export async function getMonthTrends(
    userId: string,
    anchorWeekStart: string,  // Monday of the most recent week to include
    bio?: UserBio,
  ): Promise<DayTrend[]>
  ```

- [ ] **Step 1: Add `getMonthTrends` to `lib/db/queries/trends.ts`**

Append after the closing brace of `getWeekTrends`:

```ts
// Returns 28 days (4 Mon–Sun weeks), oldest first.
// anchorWeekStart is the Monday of the most recent (rightmost) week.
export async function getMonthTrends(
  userId: string,
  anchorWeekStart: string,
  bio?: UserBio,
): Promise<DayTrend[]> {
  // Build Monday dates for weeks: anchor-3w, anchor-2w, anchor-1w, anchor
  const weeks: string[] = []
  for (let i = 3; i >= 0; i--) {
    const d = new Date(anchorWeekStart)
    d.setUTCDate(d.getUTCDate() - i * 7)
    weeks.push(d.toISOString().split('T')[0])
  }

  // Fetch all 4 weeks in parallel
  const results = await Promise.all(
    weeks.map(w => getWeekTrends(userId, w, bio))
  )

  // Flatten oldest-first
  return results.flatMap(r => r.days)
}
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```
git add lib/db/queries/trends.ts
git commit -m "feat: add getMonthTrends query — 4-week flat DayTrend array (#14)"
```

---

### Task 2: `TrendsNav` component

**Files:**
- Create: `components/trends/TrendsNav.tsx`

**Interfaces:**
- Consumes: `useRouter`, `useSearchParams` from `next/navigation`
- Produces:
  ```ts
  export function TrendsNav(props: {
    weekStart: string   // current Monday 'YYYY-MM-DD'
    view: 'week' | 'month'
    isCurrentWeek: boolean  // disables the > button in week view
  }): JSX.Element
  ```

The component pushes URL changes: `?week=YYYY-MM-DD&view=week|month`. Navigation in month view steps by 4 weeks. The `>` button is disabled when `isCurrentWeek` is true AND view is `week`; in month view the `>` is disabled when the anchor week is the current week.

- [ ] **Step 1: Create `components/trends/TrendsNav.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'

function addWeeks(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().split('T')[0]
}

function fmtWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(weekStart + 'T12:00:00')
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`
}

function fmtMonthRange(anchorWeekStart: string): string {
  // 4 weeks back from anchor — show start of oldest week to end of anchor week
  const start = new Date(anchorWeekStart + 'T12:00:00')
  start.setDate(start.getDate() - 21)  // 3 weeks back
  const end = new Date(anchorWeekStart + 'T12:00:00')
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`
}

export function TrendsNav({
  weekStart,
  view,
  isCurrentWeek,
}: {
  weekStart: string
  view: 'week' | 'month'
  isCurrentWeek: boolean
}) {
  const router = useRouter()

  function go(delta: number) {
    const step = view === 'month' ? delta * 4 : delta
    const next = addWeeks(weekStart, step)
    router.push(`/trends?week=${next}&view=${view}`)
  }

  function toggleView() {
    const next = view === 'week' ? 'month' : 'week'
    router.push(`/trends?week=${weekStart}&view=${next}`)
  }

  const label = view === 'week' ? fmtWeekRange(weekStart) : fmtMonthRange(weekStart)
  const atLatest = isCurrentWeek

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          className="text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors text-xl leading-none"
          aria-label="Previous period"
        >
          ‹
        </button>
        <span className="text-sm text-gray-300 font-medium">{label}</span>
        <button
          onClick={() => go(1)}
          disabled={atLatest}
          className="text-gray-400 hover:text-white disabled:opacity-30 px-2 py-1 rounded-lg hover:bg-gray-800 disabled:hover:bg-transparent transition-colors text-xl leading-none"
          aria-label="Next period"
        >
          ›
        </button>
      </div>

      {/* Week / Month toggle */}
      <div className="flex rounded-xl bg-[#1f2937] p-0.5">
        <button
          onClick={() => view !== 'week' && toggleView()}
          className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
            view === 'week' ? 'bg-[#111827] text-white' : 'text-gray-500'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => view !== 'month' && toggleView()}
          className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
            view === 'month' ? 'bg-[#111827] text-white' : 'text-gray-500'
          }`}
        >
          Month
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```
git add components/trends/TrendsNav.tsx
git commit -m "feat: TrendsNav week/month toggle and period navigation (#14)"
```

---

### Task 3: Wire the Trends page

**Files:**
- Modify: `app/(dashboard)/trends/page.tsx`

**Interfaces:**
- Consumes:
  - `TrendsNav` from `@/components/trends/TrendsNav`
  - `getMonthTrends(userId, anchorWeekStart, bio?)` from `@/lib/db/queries/trends`
  - `DayTrend` type from same
  - Existing `getWeekTrends`, `SparkLine`, `BarChart`, `TrendCard`, helper functions — all unchanged
- The page receives `searchParams: Promise<{ week?: string; view?: string }>` (Next.js 15 async searchParams)

**Logic:**
- Parse `week` param: validate it's a Monday (day-of-week check), fall back to current week's Monday if missing/invalid/future
- Parse `view` param: `'month'` if value is `'month'`, else `'week'`
- `isCurrentWeek`: resolved `weekStart === currentWeekStart`
- Week view: call `getWeekTrends`, render existing 9 cards with `BarChart` for calories/distance and `SparkLine` for the rest, `today` index highlighted
- Month view: call `getMonthTrends`, render same 9 cards but ALL as `SparkLine`, `today` index set to index of today in the 28-day array (or -1 → no highlight), labels show day-of-month for every Monday (`d.getDate()` formatted), empty string for other days

**Month view label generation:**
```ts
// For a 28-day DayTrend array, labels show the date number on Mondays only
const monthLabels = days.map((d, i) => i % 7 === 0 ? new Date(d.date + 'T12:00:00').getDate().toString() : '')
```

**Month view today index:**
```ts
const todayIdx = days.findIndex(d => d.date === today)
const ti = todayIdx  // -1 means no highlight; SparkLine already handles this (circle is drawn only for non-null values; we just don't highlight)
```

For month view, the `today` prop passed to SparkLine should be `ti` — when `-1`, no dot will be highlighted (the SparkLine `isToday = i === today` check with `i >= 0` will never match `-1`).

- [ ] **Step 1: Replace `app/(dashboard)/trends/page.tsx`**

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { getWeekTrends, getMonthTrends } from '@/lib/db/queries/trends'
import { TrendCard } from '@/components/trends/TrendCard'
import { TrendsNav } from '@/components/trends/TrendsNav'
import { BarChart } from '@/components/trends/BarChart'
import { SparkLine } from '@/components/trends/SparkLine'

function getWeekStart(today: string): string {
  const d = new Date(today)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// Returns weekStart if it's a valid Monday on or before today, else currentWeekStart
function resolveWeek(param: string | undefined, currentWeekStart: string, today: string): string {
  if (!param) return currentWeekStart
  // Must be YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(param)) return currentWeekStart
  // Must not be in the future
  if (param > today) return currentWeekStart
  // Must be a Monday (UTC day 1)
  const d = new Date(param)
  if (d.getUTCDay() !== 1) return currentWeekStart
  return param
}

function fmtSleep(s: number | null): string {
  if (s == null) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}

function fmtPace(sPerKm: number | null): string {
  if (sPerKm == null) return '—'
  const m = Math.floor(sPerKm / 60)
  const s = Math.round(sPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

function avg(vals: (number | null)[], round = 0): string {
  const defined = vals.filter((v): v is number => v != null)
  if (!defined.length) return '—'
  const a = defined.reduce((s, v) => s + v, 0) / defined.length
  return round === 0 ? String(Math.round(a)) : a.toFixed(round)
}

function fmtKm(m: number | null): string {
  if (m == null) return '—'
  return `${(m / 1000).toFixed(1)} km`
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string }>
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getUserByClerkId(clerkId)
  if (!user) redirect('/sign-in')

  const today = new Date().toISOString().split('T')[0]
  const currentWeekStart = getWeekStart(today)

  const { week: weekParam, view: viewParam } = await searchParams
  const weekStart = resolveWeek(weekParam, currentWeekStart, today)
  const view = viewParam === 'month' ? 'month' : 'week'
  const isCurrentWeek = weekStart === currentWeekStart

  const hasBio = user.weightKg != null && user.heightCm != null && user.age != null && user.sex != null
  const bio = hasBio ? {
    weightKg: user.weightKg!,
    heightCm: user.heightCm!,
    age: user.age!,
    sex: user.sex! as 'male' | 'female' | 'other',
  } : undefined

  const days = view === 'month'
    ? await getMonthTrends(user.id, weekStart, bio)
    : (await getWeekTrends(user.id, weekStart, bio)).days

  // Labels
  const labels = view === 'month'
    ? days.map((d, i) => i % 7 === 0 ? new Date(d.date + 'T12:00:00').getDate().toString() : '')
    : days.map(d => d.label)

  // Today highlight index (-1 = no highlight)
  const todayIdx = days.findIndex(d => d.date === today)
  const ti = view === 'week' ? (todayIdx === -1 ? 6 : todayIdx) : todayIdx

  // Metric arrays
  const sleepVals = days.map(d => d.sleepDurationS != null ? Math.round(d.sleepDurationS / 60) : null)
  const hrvVals = days.map(d => d.hrvRmssd)
  const hrVals = days.map(d => d.restingHr)
  const vo2Vals = days.map(d => d.vo2max)
  const burnedVals = days.map(d => d.caloriesBurned)
  const consumedVals = days.map(d => d.caloriesConsumed)
  const netVals = days.map(d =>
    d.caloriesConsumed != null && d.caloriesBurned != null
      ? d.caloriesConsumed - d.caloriesBurned
      : null
  )
  const distVals = days.map(d => d.runDistanceM)
  const paceVals = days.map(d => d.runPaceSPerKm)

  // Summaries
  const avgSleepS = (() => {
    const defined = sleepVals.filter((v): v is number => v != null)
    if (!defined.length) return null
    return Math.round(defined.reduce((s, v) => s + v, 0) / defined.length) * 60
  })()

  const totalDistM = distVals.reduce<number | null>(
    (s, v) => v != null ? (s ?? 0) + v : s,
    null
  )

  const nonNullPaces = paceVals.filter((v): v is number => v != null)
  const bestPace: number | null = nonNullPaces.length
    ? nonNullPaces.reduce((best, v) => v < best ? v : best)
    : null

  // In month view all charts use SparkLine
  const useBar = view === 'week'

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Trends</h1>

      <TrendsNav weekStart={weekStart} view={view} isCurrentWeek={isCurrentWeek} />

      <TrendCard
        title="Sleep"
        summary={fmtSleep(avgSleepS) + ' avg'}
        info="Total sleep duration each night, synced from Intervals.icu. Higher is generally better — most adults need 7–9 hours."
      >
        <SparkLine values={sleepVals} labels={labels} color="#00BCD4" today={ti} />
      </TrendCard>

      <TrendCard
        title="Heart Rate Variability"
        summary={`Avg ${avg(hrvVals, 1)} ms`}
        info="HRV (RMSSD) measures the variation in time between heartbeats. Higher values indicate better recovery and readiness. A rising trend is a positive sign."
      >
        <SparkLine values={hrvVals} labels={labels} color="#00C853" today={ti} />
      </TrendCard>

      <TrendCard
        title="Resting HR"
        summary={`Avg ${avg(hrVals)} bpm`}
        info="Your heart rate at rest. A lower resting HR generally means better cardiovascular fitness. Spikes can indicate fatigue, illness, or poor recovery."
      >
        <SparkLine values={hrVals} labels={labels} color="#f59e0b" today={ti} />
      </TrendCard>

      <TrendCard
        title="VO2 Max"
        summary={`Avg ${avg(vo2Vals, 1)} ml/kg/min`}
        info="An estimate of your maximum aerobic capacity — how efficiently your body uses oxygen during exercise. Higher is better. Changes slowly over weeks of training."
      >
        <SparkLine values={vo2Vals} labels={labels} color="#00C853" today={ti} />
      </TrendCard>

      <TrendCard
        title="Calories Burned"
        summary={`Avg ${avg(burnedVals)} kcal`}
        info="Total calories burned through recorded activities each day, synced from Intervals.icu."
      >
        {useBar
          ? <BarChart values={burnedVals} labels={labels} color="#f59e0b" unit="kcal" today={ti} />
          : <SparkLine values={burnedVals} labels={labels} color="#f59e0b" today={ti} />}
      </TrendCard>

      <TrendCard
        title="Calories Consumed"
        summary={`Avg ${avg(consumedVals)} kcal`}
        info="Total calories logged in the Food tab each day."
      >
        {useBar
          ? <BarChart values={consumedVals} labels={labels} color="#00C853" unit="kcal" today={ti} />
          : <SparkLine values={consumedVals} labels={labels} color="#00C853" today={ti} />}
      </TrendCard>

      <TrendCard
        title="Net Calories"
        summary={`Avg ${avg(netVals)} kcal`}
        info="Consumed minus burned. Positive means you ate more than you burned; negative means a deficit. Days with missing food or activity data will show as empty."
      >
        {useBar
          ? <BarChart values={netVals} labels={labels} color="#00BCD4" unit="kcal" today={ti} />
          : <SparkLine values={netVals} labels={labels} color="#00BCD4" today={ti} />}
      </TrendCard>

      <TrendCard
        title="Run Distance"
        summary={`Total ${fmtKm(totalDistM)}`}
        info="Total distance run each day. The summary shows your period total."
      >
        {useBar
          ? <BarChart
              values={distVals.map(v => v != null ? Math.round(v / 100) / 10 : null)}
              labels={labels}
              color="#00C853"
              unit="km"
              today={ti}
            />
          : <SparkLine
              values={distVals.map(v => v != null ? Math.round(v / 100) / 10 : null)}
              labels={labels}
              color="#00C853"
              today={ti}
            />}
      </TrendCard>

      <TrendCard
        title="Run Pace"
        summary={`Best ${fmtPace(bestPace)}`}
        info="Average pace for each run day. The chart shows faster days higher — lower min/km is better. The summary shows your best (fastest) pace of the period."
      >
        <SparkLine
          values={paceVals.map(v => v != null ? -v : null)}
          labels={labels}
          color="#00BCD4"
          today={ti}
          fmtValue={v => fmtPace(-v)}
        />
      </TrendCard>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Push and verify**

```
git add "app/(dashboard)/trends/page.tsx"
git commit -m "feat: week/month navigation and month view on trends page (#14)"
git push origin master
```

Verify at https://pulse-livid-two.vercel.app/trends after deploy:
- Default loads current week view with `< week-range >` and Week/Month pill
- `<` navigates to previous week, `>` navigates forward, `>` is disabled on current week
- Month toggle shows 4 weeks of sparklines for all 9 metrics
- `<` and `>` in month view step by 4 weeks
- Title changed from "This Week" to "Trends"

---

## Self-Review

**Spec coverage:**
- Week-by-week `< >` navigation ✓ (Task 2 `TrendsNav`, steps by 1 week)
- Month view toggle ✓ (Task 2 toggle, Task 3 `view` param)
- Month view all sparklines ✓ (Task 3 `useBar = view === 'week'`)
- Month view steps by 4 weeks ✓ (`go(delta * 4)` in TrendsNav)
- `>` disabled at current week ✓ (`isCurrentWeek` prop, `disabled={atLatest}`)
- Future navigation prevented ✓ (`resolveWeek` rejects `param > today`)
- 28-day data for month view ✓ (`getMonthTrends` 4× `getWeekTrends`)
- Month labels readable ✓ (day-of-month on Mondays, empty string otherwise)

**Placeholder scan:** None found.

**Type consistency:**
- `getMonthTrends` returns `DayTrend[]` — same type as `getWeekTrends(...).days` ✓
- `TrendsNav` props match usage in page ✓
- `SparkLine` `today={ti}` where `ti = -1` in month view when today not in range — `isToday = i === -1` never matches since `i >= 0` ✓
- `resolveWeek` uses `getUTCDay() !== 1` for Monday check — consistent with `getWeekStart` which uses `getUTCDay()` ✓
- `fmtMonthRange` offsets by 21 days back (3 weeks) to get the oldest Monday — matches `getMonthTrends` which steps back `i * 7` for `i = 3, 2, 1, 0` ✓
