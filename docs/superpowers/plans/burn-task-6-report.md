# Task 6 Report: Wire Today Page — Burn Breakdown + Day Navigation

**Status:** DONE  
**Commit:** 54a2594  
**Date:** 2026-08-27

## What was done

Replaced `app/(dashboard)/page.tsx` with the full integration wiring all pieces from Tasks 1–5:

- Added `DayNav` import and rendered it replacing the static `<h1>Today</h1>`, with `date` and `isToday` props.
- Added `calculateBurnBreakdown` import from `lib/burn.ts`.
- `searchParams` typed as `Promise<{ date?: string }>` (Next.js 15 async searchParams), awaited correctly.
- Date guard: `dateParam && dateParam <= today` prevents future-date navigation.
- Parallel fetch of `wellness` and `activitySummary` via `Promise.all`.
- `hasBio` guard: breakdown only computed when `weightKg`, `heightCm`, `age`, `sex` are all non-null.
- `burned` falls back to `activitySummary.totalCalories` when no bio data (no BMR possible).
- `breakdown ?? undefined` converts null to undefined to satisfy the optional prop type on `CalorieRing`.

## Type check

`npx tsc --noEmit` — zero errors.

## Concerns

None. The fallback path (`burned = activitySummary.totalCalories` when no bio) is intentional and matches the plan.

---

# Bug Fix Report: addDays timezone + ProfileForm error feedback

**Status:** DONE
**Commit:** de305c0
**Date:** 2026-08-27

## Fix 1 — `addDays` timezone bug (`components/today/DayNav.tsx`)

`new Date(iso)` parsed a bare `YYYY-MM-DD` string as UTC midnight, causing the local date to land one day behind in UTC- timezones. Changed to `new Date(iso + 'T12:00:00')`, matching the same pattern already used in `formatLabel`.

## Fix 2 — Silent save failure (`components/ProfileForm.tsx`)

`handleSubmit` was not checking `response.ok`, so a server-side Zod validation error (e.g. age=5 rejected) would silently show "✓ Saved". Changes made:

- Added `error` state (`useState<string | null>(null)`) alongside `saving` and `saved`.
- Captured the fetch response and returned early with `setError('Save failed — check your values')` (auto-clears after 3 s) when `!res.ok`.
- Rendered `{error && <p className="text-red-400 text-xs mt-1">{error}</p>}` below the Save button.

## Type check

`npx tsc --noEmit` — zero errors.
