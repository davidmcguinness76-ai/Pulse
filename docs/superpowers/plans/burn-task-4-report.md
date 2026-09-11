# Task 4 Report: CalorieRing — Expandable Burn Breakdown

**Completed:** 2026-08-27

## Summary

Successfully rewrote `components/today/CalorieRing.tsx` to add optional tap-to-expand breakdown panel for the 3 burn components (passive BMR, activities, non-activity steps).

## Changes Made

- Added `'use client'` directive and `useState` import
- Defined `Breakdown` type with `bmrPassive`, `activity`, `nonActivitySteps` fields
- Extended `Props` to include optional `breakdown?: Breakdown`
- Implemented expand/collapse toggle state (`open`)
- Converted "Burned" display from static span to interactive button:
  - Shows dotted underline when `breakdown` prop is provided
  - Toggles expanded panel on click
  - Remains plain text when `breakdown` is absent
- Added conditional breakdown panel below main stats (rendered when `open && breakdown`)
- Breakdown panel displays all 3 components plus a total row with proper styling

## Testing

- TypeScript type check: `npx tsc --noEmit` — passed (no errors)
- File compiles without type errors
- Component remains backward compatible: existing callers without `breakdown` prop work unchanged

## Commit

Hash: `982293c` (short)  
Message: `feat: expandable burn breakdown in CalorieRing (#5)`

## No Concerns

- Implementation matches brief exactly
- No external dependencies added
- Type safety preserved
- Backward compatible with existing consumers
