# Task 4 Brief: CalorieRing — Expandable Burn Breakdown

**Plan:** 2026-08-27-burn-breakdown-and-day-nav.md  
**Repo:** C:\Users\david\Documents\GitHub\Pulse  
**Base commit:** 8c2f443

## Context

This task rewrites `components/today/CalorieRing.tsx` to add an optional tap-to-expand breakdown panel showing the 3 burn components. The component is a server-rendered-compatible client component (it needs useState for the expand toggle).

The existing CalorieRing props: `{ consumed: number; goal: number; burned: number }`.
New props add optional `breakdown?: { bmrPassive: number; activity: number; nonActivitySteps: number }`.

When `breakdown` is provided, the "Burned" value becomes a tappable dotted-underline button that toggles an expanded panel. When `breakdown` is absent, the value is plain text (inert).

## Replace entire `components/today/CalorieRing.tsx` with:

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

## Steps

- [ ] Read `components/today/CalorieRing.tsx` (current content)
- [ ] Replace it with the exact content above
- [ ] Run `npx tsc --noEmit` — fix any type errors
- [ ] Commit: `git add components/today/CalorieRing.tsx && git commit -m "feat: expandable burn breakdown in CalorieRing (#5)"`

## Report

Write your full report to: `docs/superpowers/plans/burn-task-4-report.md`

Return only:
- Status: DONE / BLOCKED / NEEDS_CONTEXT
- Commit hash
- One-line test summary
- Any concerns
