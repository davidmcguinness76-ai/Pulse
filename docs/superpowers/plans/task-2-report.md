# Task 2 Report: Activity Query — Duration + Step Estimate

**Date:** 2026-08-27
**Task:** Task 2 of 2026-08-27-burn-breakdown-and-day-nav.md  
**Status:** DONE

## What was completed

Replaced `lib/db/queries/activities.ts` entirely with:
- New `DayActivitySummary` type with `totalCalories`, `totalDurationS`, `estimatedSteps`
- New `getDayActivitySummary(userId, date)` function returning the summary type
- Helper `estimateStepsFromActivity(type, distanceM)` using fixed multipliers: run 793 steps/km, walk 1363 steps/km
- Kept existing `upsertActivity()` and `getRecentActivities()` functions

Updated `app/(dashboard)/page.tsx`:
- Changed import from `getTodayCaloriesBurned` to `getDayActivitySummary`
- Removed dead function call to `getTodayCaloriesBurned` and `burned` variable
- Added TODO comment noting Task 6 will wire up the new query
- Passed `burned={0}` to `CalorieRing` as placeholder
- File now compiles without type errors

## Verification

- TypeScript build: passed (`npm run build` succeeded)
- Commit: `08e1955` with message `feat: activity summary query with duration and step estimate (#5)`
- No compilation errors or type issues

## Notes

The new query structure is ready for consumption by Task 1's `lib/burn.ts` module. The `estimateStepsFromActivity` helper uses simple linear multipliers per activity type — this is a placeholder estimate pending availability of actual step data from Intervals.icu API (as noted in project memory).

The page renders with burned=0 as a temporary value until Task 6 fully implements the burn breakdown UI and wires the activity summary into the display.
