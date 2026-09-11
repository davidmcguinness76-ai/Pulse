# Task 4 Report — Database Schema + Client

**Status: DONE**
**Commit: d7a8ca5**

## Files Created

- `lib/db/schema.ts` — 6 enums + 5 tables (users, activities, daily_wellness, foods, nutrition_log) + 5 exported types
- `lib/db/index.ts` — Neon HTTP client singleton, `db` export
- `lib/db/queries/users.ts` — `upsertUser`, `getUserByClerkId`
- `lib/db/queries/activities.ts` — `upsertActivity`, `getRecentActivities`
- `lib/db/queries/wellness.ts` — `upsertWellness`, `getTodayWellness`

## drizzle-kit push result

`[✓] Changes applied` — all 5 tables + 6 enums created in Neon. DATABASE_URL had to be set as an env var before running (drizzle-kit does not auto-load .env.local); used `$env:DATABASE_URL = "..."` in PowerShell before `npx drizzle-kit push`.

## Tables confirmed in Neon

- users
- activities
- daily_wellness
- foods
- nutrition_log

## Notes

No deviations from the plan. `drizzle-kit push` succeeded on first attempt once DATABASE_URL was exported into the shell environment.
