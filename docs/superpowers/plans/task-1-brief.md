# Task 1 Brief: Burn Formula Module

**Plan:** 2026-08-27-burn-breakdown-and-day-nav.md  
**Repo:** C:\Users\david\Documents\GitHub\Pulse  
**Base commit:** f98d6cd

## What to build

Create `lib/burn.ts` — a pure TypeScript module with two exported functions:

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
): number

export function calculateBurnBreakdown(params: {
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

## Formula details

**Mifflin-St Jeor BMR:**
- male = 10×weightKg + 6.25×heightCm − 5×age + 5
- female = 10×weightKg + 6.25×heightCm − 5×age − 161
- other = average of male and female

**Passive BMR fraction:**
- activityHours = activityDurationS / 3600
- passiveFraction = Math.max(0, 24 − activityHours) / 24
- bmrPassive = Math.round(bmr × passiveFraction)
- Rationale: Garmin activity calories already include burn during activity time, so we only credit passive BMR for the remaining hours

**Non-activity steps:**
- nonActivitySteps = Math.max(0, totalSteps − activitySteps)
- kcal = Math.round(nonActivitySteps × 0.04)
- Add ponytail comment: `// ponytail: fixed 0.04 kcal/step, revisit with run/walk split when step type data available`

**Total:** bmrPassive + activityCalories + nonActivityStepsCal

## Verification (mental check, no test runner available)

For 80kg, 180cm, 35yo male, 1h activity (3600s), 8000 total steps, 2000 activity steps, 450 activity cals:
- BMR = 800 + 1125 − 175 + 5 = 1755
- passiveFraction = 23/24 ≈ 0.9583 → bmrPassive = 1683
- nonActivitySteps = 6000 × 0.04 = 240
- total = 1683 + 450 + 240 = 2373

Verify your implementation produces this result mentally or via tsc.

## Steps

- [ ] Create `lib/burn.ts` with the exact code above
- [ ] Run `npx tsc --noEmit` from the repo root to confirm no type errors
- [ ] Commit: `git add lib/burn.ts && git commit -m "feat: add 3-part calorie burn formula (#5)"`

## Report

Write your full report to: `docs/superpowers/plans/task-1-report.md`

Return only:
- Status: DONE / BLOCKED / NEEDS_CONTEXT
- Commit hash
- One-line test summary
- Any concerns
