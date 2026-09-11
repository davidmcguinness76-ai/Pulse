# Task 5 Brief: DayNav Component

**Plan:** 2026-08-27-burn-breakdown-and-day-nav.md  
**Repo:** C:\Users\david\Documents\GitHub\Pulse  
**Base commit:** 982293c

## Context

The Today dashboard is currently locked to today's date. This task creates a client component `DayNav` that renders a back/forward arrow navigation with a date label. It pushes `?date=YYYY-MM-DD` search params via `useRouter`. The label shows "Today" for today's date, otherwise a human-readable short date (e.g. "Tue 26 Aug").

Forward navigation into the future is blocked. When the displayed date is today, the › button is disabled.

## Create `components/today/DayNav.tsx`

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

## Steps

- [ ] Create `components/today/DayNav.tsx` with the exact content above
- [ ] Run `npx tsc --noEmit` — fix any type errors
- [ ] Commit: `git add components/today/DayNav.tsx && git commit -m "feat: day navigation component with arrow controls (#6)"`

## Report

Write your full report to: `docs/superpowers/plans/burn-task-5-report.md`

Return only:
- Status: DONE / BLOCKED / NEEDS_CONTEXT
- Commit hash
- One-line test summary
- Any concerns
