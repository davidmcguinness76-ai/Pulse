# Task 4: Database Schema + Client

## Context
Pulse app — Next.js 15, TypeScript strict, Drizzle ORM, Neon Postgres serverless.
Working directory: C:\Users\david\Documents\GitHub\Pulse
Current HEAD: e54ed20
Plan: C:\Users\david\Documents\GitHub\Pulse\docs\superpowers\plans\2026-08-26-m1-foundation.md

Task 1-3 are complete. The project is scaffolded and deployed to Vercel. Drizzle Kit is installed. DATABASE_URL is in .env.local pointing at a live Neon database.

Data source is Intervals.icu (NOT Strava). There are no Strava tables. The wellness_source enum values are 'manual' and 'intervals_icu'.

## Files to create
- lib/db/schema.ts
- lib/db/index.ts
- lib/db/queries/users.ts
- lib/db/queries/activities.ts
- lib/db/queries/wellness.ts

## Exact schema required

### Enums
- activity_type: 'run' | 'walk' | 'cycle' | 'swim' | 'strength' | 'other'
- serving_unit: 'g' | 'ml' | 'item'
- food_source: 'open_food_facts' | 'manual' | 'ai_scan'
- sex: 'male' | 'female' | 'other'
- activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
- wellness_source: 'manual' | 'intervals_icu'

### Tables: users, activities, daily_wellness, foods, nutrition_log

See the plan file Task 4 section for the complete step-by-step with exact code for all files. Read the plan and implement exactly as written.

## Functions to produce
- upsertUser(clerkId: string, email: string): Promise<User>
- getUserByClerkId(clerkId: string): Promise<User | undefined>
- upsertActivity(data: NewActivity): Promise<void>
- getRecentActivities(userId: string, limit: number): Promise<Activity[]>
- upsertWellness(data: NewDailyWellness): Promise<void>
- getTodayWellness(userId: string, date: string): Promise<DailyWellness | undefined>

## Global Constraints
- TypeScript strict mode — no `any`, no implicit returns
- Drizzle for all DB access — no raw SQL strings
- Use drizzle-orm/neon-http (not neon-serverless websocket) for the client
- Export all types: User, Activity, NewActivity, DailyWellness, NewDailyWellness

## After implementation
Run: npx drizzle-kit push
Confirm tables exist in Neon console.

Commit: git add lib/db/ drizzle.config.ts drizzle/ && git commit -m "feat: add Drizzle schema and Neon DB client (#4)"
Then git push.

## Report
Write report to: C:\Users\david\Documents\GitHub\Pulse\docs\superpowers\plans\task-4-report.md

Include: files created, drizzle-kit push result, tables confirmed, commit hash.
Status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED
