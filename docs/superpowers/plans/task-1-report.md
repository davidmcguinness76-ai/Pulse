# Task 1 Report: Burn Formula Module

**Status:** DONE  
**Commit hash:** 2d34eeb  
**Branch:** master

## Summary

Created `lib/burn.ts` with two pure TypeScript functions implementing the Mifflin-St Jeor BMR formula and a 3-part calorie burn breakdown calculation.

## Implementation Details

### Functions
1. **`calculateBmr`**: Computes Basal Metabolic Rate using the Mifflin-St Jeor formula, handling male, female, and other sex values (averaging male and female for "other").
2. **`calculateBurnBreakdown`**: Decomposes daily calorie burn into three components:
   - `bmrPassive`: BMR scaled by the fraction of the day not spent in recorded activity
   - `activity`: Garmin activity calories (passed through unchanged)
   - `nonActivitySteps`: Calories burned during non-activity steps (fixed 0.04 kcal/step)
   - `total`: Sum of the three components

### Key Decisions (Ponytail)
- Added explicit ponytail comment on the non-activity step coefficient, noting the fixed 0.04 kcal/step is a simplification pending run/walk split data from step type detection.
- Used `Math.max(0, ...)` guards to prevent negative values in passive fraction and non-activity steps calculations.
- Implemented passive BMR as a time-based fraction rather than including all BMR, since Garmin activity calories already include metabolic burn during activity time.

## Verification

Manual calculation for the test case (80kg, 180cm, 35yo male, 1h activity, 8000 steps, 2000 activity steps, 450 activity cals):
- BMR: 1755 ✓
- bmrPassive: 1683 ✓
- nonActivityStepsCal: 240 ✓
- total: 2373 ✓

TypeScript type check passed on `lib/burn.ts` (no module-specific errors).

## Files Changed
- Created: `lib/burn.ts` (57 lines)

## Next Steps
This module is ready for integration into the calorie breakdown view (Task 2). No external dependencies required; the module is self-contained.
