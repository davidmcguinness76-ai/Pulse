# Pulse M1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the full project skeleton with auth, database, Intervals.icu polling for activity and wellness data ingestion, manual wellness override form, and the Today dashboard showing live data.

**Architecture:** Next.js 15 App Router monorepo on Vercel. Clerk handles auth. Neon Postgres via Drizzle ORM. Intervals.icu is polled on a Vercel cron every 30 minutes — no webhooks. Wellness data (sleep, HRV, steps, resting HR) comes from Intervals.icu automatically; the user can also override values manually. Vercel is deployed early (Task 3) so the cron URL exists and env vars are confirmed before building data pipelines. Two medium risks are validated in Tasks 2 and 3 before building anything that depends on them.

**Tech Stack:** Next.js 15, TypeScript (strict), Clerk, Neon Postgres, Drizzle ORM, Zod, Vitest, Tailwind CSS, @ducanh2912/next-pwa, Vercel, Intervals.icu REST API

## Global Constraints

- TypeScript strict mode — no `any`, no implicit returns
- All API routes protected by Clerk `auth()` — no public routes except `/sign-in` and `/api/cron/sync-intervals` (verified by `CRON_SECRET` header)
- No API keys in client bundle — all server-side only
- Zod validation at every API boundary
- Vitest for all unit tests — no Jest, no other test frameworks
- Drizzle for all DB access — no raw SQL strings
- Intervals.icu API key stored in `INTERVALS_API_KEY` env var; athlete ID in `INTERVALS_ATHLETE_ID`
- Intervals.icu auth: Basic auth with username `API_KEY` and password = the API key
- Use `@ducanh2912/next-pwa` not `next-pwa` — better Next.js 15 App Router support
- Commit format: `type: description (#issue-number)` — e.g. `feat: add Intervals.icu sync cron (#3)`
- One GitHub issue per task — label with `feature` + `P3-medium` + `status:todo` before starting, flip to `status:in-progress` when starting, `status:review` when done

---

## Risk Register

| Risk | Mitigation | Validated in |
|------|-----------|-------------|
| `@ducanh2912/next-pwa` + Next.js 15 App Router compatibility | Use this fork specifically; validate PWA manifest loads | Task 2 |
| Vercel cron + Intervals.icu API reachable from serverless | Deploy early; smoke-test cron endpoint before building full sync logic | Task 3 |
| Barcode camera (`getUserMedia`) requires HTTPS | Deploy to Vercel early; test on production URL from Android | Task 3 (smoke test) |

---

## File Map

| File | Responsibility |
|------|---------------|
| `app/layout.tsx` | Root layout with ClerkProvider, global styles |
| `app/(dashboard)/layout.tsx` | Dashboard shell with bottom nav |
| `app/(dashboard)/page.tsx` | Today view |
| `app/(dashboard)/activity/page.tsx` | Activity list |
| `app/(dashboard)/wellness/page.tsx` | Manual wellness override form |
| `app/(dashboard)/nutrition/page.tsx` | Log Food stub (M2) |
| `app/(dashboard)/trends/page.tsx` | Trends stub (M3) |
| `app/(dashboard)/profile/page.tsx` | Profile + account settings |
| `app/sign-in/[[...sign-in]]/page.tsx` | Clerk sign-in page |
| `app/api/cron/sync-intervals/route.ts` | Vercel cron — polls Intervals.icu, upserts activities + wellness |
| `app/api/wellness/route.ts` | POST manual wellness override |
| `middleware.ts` | Clerk auth middleware — protects all routes |
| `lib/db/schema.ts` | Drizzle schema — all tables |
| `lib/db/index.ts` | Neon + Drizzle client singleton |
| `lib/db/queries/users.ts` | User upsert, get by clerk_id |
| `lib/db/queries/activities.ts` | Upsert activities, get recent |
| `lib/db/queries/wellness.ts` | Upsert daily wellness, get today |
| `lib/intervals/client.ts` | Intervals.icu API client (wellness + activities fetch) |
| `lib/intervals/parser.ts` | Map Intervals.icu response fields to internal types |
| `lib/intervals/parser.test.ts` | Unit tests for parser |
| `components/today/SleepCard.tsx` | Sleep score + duration card |
| `components/today/StepsCard.tsx` | Steps progress card |
| `components/today/HrvCard.tsx` | HRV + resting HR card |
| `components/today/CalorieRing.tsx` | Calories consumed / goal / burned ring |
| `components/ui/ProgressBar.tsx` | Reusable labelled progress bar |
| `components/nav/BottomNav.tsx` | PWA bottom navigation |
| `public/manifest.json` | PWA manifest |
| `next.config.ts` | @ducanh2912/next-pwa config |
| `drizzle.config.ts` | Drizzle Kit config |
| `vitest.config.ts` | Vitest config |

---

## Pre-flight: One-time Manual Steps

Complete these before writing any code:

- [ ] Create GitHub repo `davidmcguinness76-ai/Pulse` (public) — **done**
- [ ] Run `C:\Users\david\Documents\GitHub\_AI_Master\scripts\setup-labels.ps1` to apply label taxonomy — **done**
- [ ] Create Clerk application at clerk.com → enable Google OAuth → note `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- [ ] Create Neon project at neon.tech → note `DATABASE_URL` (pooled connection string)
- [ ] Note Intervals.icu credentials: Athlete ID `i690717`, API key `696c2ua3ijof3alnfwu48dta7`
- [ ] Create GitHub issues for each task (labels: `feature` + `P3-medium` + `status:todo`)

---

## Task 1: Project Scaffold + Tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`
- Create: `vitest.config.ts`
- Create: `drizzle.config.ts`
- Create: `.env.local` (gitignored)
- Create: `middleware.ts`
- Create: `app/layout.tsx`
- Create: `app/sign-in/[[...sign-in]]/page.tsx`

**Interfaces:**
- Produces: working Next.js 15 dev server at localhost:3000, Clerk auth redirect, Vitest runner, Drizzle Kit CLI

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd C:\Users\david\Documents\GitHub\Pulse
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*" --yes
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @clerk/nextjs drizzle-orm @neondatabase/serverless zod @ducanh2912/next-pwa
npm install -D drizzle-kit vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 3: Create `.env.local`**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://...
INTERVALS_API_KEY=696c2ua3ijof3alnfwu48dta7
INTERVALS_ATHLETE_ID=i690717
CRON_SECRET=<any random string, e.g. run: openssl rand -hex 32>
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 5: Configure Drizzle Kit**

Create `drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

- [ ] **Step 6: Configure @ducanh2912/next-pwa**

Replace `next.config.ts`:
```typescript
import withPWA from '@ducanh2912/next-pwa'

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
})

export default withPWAConfig({
  reactStrictMode: true,
})
```

- [ ] **Step 7: Configure Tailwind with brand palette**

Replace the `theme.extend.colors` section in `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00C853',
          teal: '#00BCD4',
          dark: '#0A0F0A',
          card: '#111827',
        },
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 8: Add Clerk middleware**

Create `middleware.ts`:
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/api/cron/sync-intervals',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth.protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

- [ ] **Step 9: Create root layout with ClerkProvider**

Replace `app/layout.tsx`:
```typescript
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pulse',
  description: 'Fuel. Move. Thrive.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-[#0A0F0A] text-white">{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 10: Create sign-in page**

Create `app/sign-in/[[...sign-in]]/page.tsx`:
```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0F0A]">
      <SignIn />
    </main>
  )
}
```

- [ ] **Step 11: Add PWA manifest**

Create `public/manifest.json`:
```json
{
  "name": "Pulse",
  "short_name": "Pulse",
  "description": "Fuel. Move. Thrive.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0F0A",
  "theme_color": "#00C853",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add placeholder 192×192 and 512×512 PNG icons to `public/` — any solid green square works; replace with real logo icons later. The real logo PNGs are in `resources/logos/` — export correct sizes from there when ready.

- [ ] **Step 12: Verify dev server starts and Clerk redirects**

```bash
npm run dev
```

Expected: `http://localhost:3000` redirects to `/sign-in`, Google sign-in button visible.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 with Clerk, Drizzle, Vitest, brand palette, PWA (#1)"
```

---

## Task 2: Validate PWA (Medium Risk — validate early)

**Goal:** Confirm `@ducanh2912/next-pwa` works with Next.js 15 App Router before building anything that depends on it.

**Files:**
- Modify: `app/layout.tsx` — add manifest link tag if missing
- Read: generated `public/sw.js` after build

**Interfaces:**
- Produces: confirmed PWA manifest loads in browser; service worker registers without error

- [ ] **Step 1: Run a production build locally**

```bash
npm run build
```

Expected: build completes without errors. The `@ducanh2912/next-pwa` plugin generates `public/sw.js` and `public/workbox-*.js`. If build fails with a PWA-related error, check the plugin version matches Next.js 15 — consult https://github.com/DuCanhGH/next-pwa.

- [ ] **Step 2: Serve the production build**

```bash
npm run start
```

- [ ] **Step 3: Check manifest loads**

Open `http://localhost:3000` in Chrome. Open DevTools → Application tab → Manifest. Expected: Pulse manifest visible with name, icons, theme colour `#00C853`.

- [ ] **Step 4: Check service worker registers**

In DevTools → Application → Service Workers. Expected: `sw.js` registered and status "activated and is running".

- [ ] **Step 5: Record result**

If both checks pass: PWA risk is cleared. Continue to Task 3.

If manifest or service worker fails: the issue is almost certainly the `next-pwa` config. Check the `@ducanh2912/next-pwa` README for Next.js 15-specific config. Fix before continuing.

- [ ] **Step 6: Commit if any fixes were needed**

```bash
git add next.config.ts
git commit -m "fix: resolve PWA compatibility with Next.js 15 (#2)"
```

---

## Task 3: Deploy to Vercel (Early — validate cron reachability)

**Goal:** Get a live production URL and confirm the cron endpoint is reachable from Vercel's infrastructure before building the full sync logic.

**Files:** none — Vercel config via dashboard

**Interfaces:**
- Produces: live `https://<your-app>.vercel.app` URL; confirmed cron endpoint returns 200

- [ ] **Step 1: Push repo to GitHub**

```bash
git remote add origin https://github.com/davidmcguinness76-ai/Pulse.git
git push -u origin main
```

- [ ] **Step 2: Import project in Vercel**

Go to vercel.com → Add New → Import Git Repository → select `davidmcguinness76-ai/Pulse`. Framework: Next.js. Accept defaults.

- [ ] **Step 3: Set environment variables in Vercel**

In Vercel project settings → Environment Variables, add all vars from `.env.local`. Set `NEXT_PUBLIC_APP_URL` to your Vercel production URL (e.g. `https://pulse-david.vercel.app`).

- [ ] **Step 4: Redeploy after env vars**

Vercel → Deployments → Redeploy latest.

- [ ] **Step 5: Verify production URL loads**

Open production URL. Expected: redirects to Clerk sign-in page.

- [ ] **Step 6: Android PWA smoke test**

On your Pixel 10 Pro XL:
1. Open Chrome → navigate to production URL
2. Sign in with Google
3. Chrome should show "Add to Home Screen" prompt — install it
4. Open from home screen — should launch in standalone mode (no browser chrome)

Expected: standalone mode works. If it fails, check manifest `display: standalone` and that the service worker registered on the production URL.

- [ ] **Step 7: Commit any config changes and push**

```bash
git add .
git commit -m "chore: add Vercel deployment config (#3)"
git push
```

---

## Task 4: Database Schema + Client

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`
- Create: `lib/db/queries/users.ts`
- Create: `lib/db/queries/activities.ts`
- Create: `lib/db/queries/wellness.ts`

**Interfaces:**
- Produces:
  - `db` — Drizzle client, imported as `import { db } from '@/lib/db'`
  - `upsertUser(clerkId: string, email: string): Promise<User>`
  - `getUserByClerkId(clerkId: string): Promise<User | undefined>`
  - `upsertActivity(data: NewActivity): Promise<void>`
  - `getRecentActivities(userId: string, limit: number): Promise<Activity[]>`
  - `upsertWellness(data: NewDailyWellness): Promise<void>`
  - `getTodayWellness(userId: string, date: string): Promise<DailyWellness | undefined>`

- [ ] **Step 1: Write the schema**

Create `lib/db/schema.ts`:
```typescript
import { pgTable, text, integer, real, boolean, timestamp, date, pgEnum, uuid } from 'drizzle-orm/pg-core'

export const activityTypeEnum = pgEnum('activity_type', ['run', 'walk', 'cycle', 'swim', 'strength', 'other'])
export const servingUnitEnum = pgEnum('serving_unit', ['g', 'ml', 'item'])
export const foodSourceEnum = pgEnum('food_source', ['open_food_facts', 'manual', 'ai_scan'])
export const sexEnum = pgEnum('sex', ['male', 'female', 'other'])
export const activityLevelEnum = pgEnum('activity_level', ['sedentary', 'light', 'moderate', 'active', 'very_active'])
export const wellnessSourceEnum = pgEnum('wellness_source', ['manual', 'intervals_icu'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  age: integer('age'),
  sex: sexEnum('sex'),
  activityLevel: activityLevelEnum('activity_level'),
  calorieGoal: real('calorie_goal'),
  proteinG: real('protein_g'),
  carbsG: real('carbs_g'),
  fatG: real('fat_g'),
  fibreG: real('fibre_g'),
  sugarG: real('sugar_g'),
  satFatG: real('sat_fat_g'),
  polyFatG: real('poly_fat_g'),
  monoFatG: real('mono_fat_g'),
  transFatG: real('trans_fat_g'),
  cholesterolMg: real('cholesterol_mg'),
  sodiumMg: real('sodium_mg'),
  potassiumMg: real('potassium_mg'),
  calciumMg: real('calcium_mg'),
  ironMg: real('iron_mg'),
  vitaminAPct: real('vitamin_a_pct'),
  vitaminCPct: real('vitamin_c_pct'),
})

export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  intervalsActivityId: text('intervals_activity_id').notNull().unique(),
  type: activityTypeEnum('type').notNull(),
  name: text('name'),
  startedAt: timestamp('started_at').notNull(),
  durationS: integer('duration_s'),
  distanceM: real('distance_m'),
  avgPaceSPerKm: real('avg_pace_s_per_km'),
  avgHr: integer('avg_hr'),
  maxHr: integer('max_hr'),
  caloriesBurned: integer('calories_burned'),
  elevationM: real('elevation_m'),
  rawJson: text('raw_json').notNull(),
})

export const dailyWellness = pgTable('daily_wellness', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  source: wellnessSourceEnum('source').notNull().default('intervals_icu'),
  steps: integer('steps'),
  restingHr: integer('resting_hr'),
  hrvRmssd: real('hrv_rmssd'),
  sleepScore: integer('sleep_score'),
  sleepQuality: integer('sleep_quality'),
  sleepDurationS: integer('sleep_duration_s'),
  weight: real('weight'),
  vo2max: real('vo2max'),
  caloriesBurned: integer('calories_burned'),
})

export const foods = pgTable('foods', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  brand: text('brand'),
  barcode: text('barcode'),
  calories: real('calories'),
  proteinG: real('protein_g'),
  carbsG: real('carbs_g'),
  fatG: real('fat_g'),
  fibreG: real('fibre_g'),
  sugarG: real('sugar_g'),
  satFatG: real('sat_fat_g'),
  polyFatG: real('poly_fat_g'),
  monoFatG: real('mono_fat_g'),
  transFatG: real('trans_fat_g'),
  cholesterolMg: real('cholesterol_mg'),
  sodiumMg: real('sodium_mg'),
  potassiumMg: real('potassium_mg'),
  calciumMg: real('calcium_mg'),
  ironMg: real('iron_mg'),
  vitaminAPct: real('vitamin_a_pct'),
  vitaminCPct: real('vitamin_c_pct'),
  servingUnit: servingUnitEnum('serving_unit').notNull().default('g'),
  servingDescription: text('serving_description'),
  servingSizeG: real('serving_size_g').notNull(),
  source: foodSourceEnum('source').notNull().default('manual'),
  verifiedByUser: boolean('verified_by_user').notNull().default(false),
})

export const nutritionLog = pgTable('nutrition_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  foodId: uuid('food_id').references(() => foods.id).notNull(),
  loggedAt: date('logged_at').notNull(),
  quantityG: real('quantity_g').notNull(),
  calories: real('calories'),
  proteinG: real('protein_g'),
  carbsG: real('carbs_g'),
  fatG: real('fat_g'),
  fibreG: real('fibre_g'),
  sugarG: real('sugar_g'),
  satFatG: real('sat_fat_g'),
  polyFatG: real('poly_fat_g'),
  monoFatG: real('mono_fat_g'),
  transFatG: real('trans_fat_g'),
  cholesterolMg: real('cholesterol_mg'),
  sodiumMg: real('sodium_mg'),
  potassiumMg: real('potassium_mg'),
  calciumMg: real('calcium_mg'),
  ironMg: real('iron_mg'),
  vitaminAPct: real('vitamin_a_pct'),
  vitaminCPct: real('vitamin_c_pct'),
})

export type User = typeof users.$inferSelect
export type Activity = typeof activities.$inferSelect
export type NewActivity = typeof activities.$inferInsert
export type DailyWellness = typeof dailyWellness.$inferSelect
export type NewDailyWellness = typeof dailyWellness.$inferInsert
```

- [ ] **Step 2: Create DB client**

Create `lib/db/index.ts`:
```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

- [ ] **Step 3: Create user queries**

Create `lib/db/queries/users.ts`:
```typescript
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, type User } from '@/lib/db/schema'

export async function upsertUser(clerkId: string, email: string): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({ clerkId, email })
    .onConflictDoUpdate({ target: users.clerkId, set: { email } })
    .returning()
  return user
}

export async function getUserByClerkId(clerkId: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
}
```

- [ ] **Step 4: Create activity queries**

Create `lib/db/queries/activities.ts`:
```typescript
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { activities, type NewActivity, type Activity } from '@/lib/db/schema'

export async function upsertActivity(data: NewActivity): Promise<void> {
  await db
    .insert(activities)
    .values(data)
    .onConflictDoUpdate({ target: activities.intervalsActivityId, set: data })
}

export async function getRecentActivities(userId: string, limit = 10): Promise<Activity[]> {
  return db.query.activities.findMany({
    where: eq(activities.userId, userId),
    orderBy: desc(activities.startedAt),
    limit,
  })
}
```

- [ ] **Step 5: Create wellness queries**

Create `lib/db/queries/wellness.ts`:
```typescript
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dailyWellness, type DailyWellness, type NewDailyWellness } from '@/lib/db/schema'

export async function upsertWellness(data: NewDailyWellness): Promise<void> {
  await db
    .insert(dailyWellness)
    .values(data)
    .onConflictDoUpdate({
      target: [dailyWellness.userId, dailyWellness.date],
      set: data,
    })
}

export async function getTodayWellness(userId: string, date: string): Promise<DailyWellness | undefined> {
  return db.query.dailyWellness.findFirst({
    where: and(
      eq(dailyWellness.userId, userId),
      eq(dailyWellness.date, date),
    ),
  })
}
```

- [ ] **Step 6: Push schema to Neon**

```bash
npx drizzle-kit push
```

Expected: all tables created. Confirm in Neon console — you should see: `users`, `activities`, `daily_wellness`, `foods`, `nutrition_log`.

- [ ] **Step 7: Commit**

```bash
git add lib/db/ drizzle.config.ts drizzle/
git commit -m "feat: add Drizzle schema and Neon DB client (#4)"
git push
```

---

## Task 5: Intervals.icu Client + Parser (with tests)

**Files:**
- Create: `lib/intervals/client.ts`
- Create: `lib/intervals/parser.ts`
- Create: `lib/intervals/parser.test.ts`

**Interfaces:**
- Produces:
  - `fetchWellness(date: string): Promise<IntervalsWellness[]>` — returns array (may be empty)
  - `fetchActivities(oldest: string, newest: string): Promise<IntervalsActivity[]>`
  - `parseWellness(raw: IntervalsWellness): ParsedWellness`
  - `parseActivity(raw: IntervalsActivity): ParsedActivity`
  - Types: `IntervalsWellness`, `IntervalsActivity`, `ParsedWellness`, `ParsedActivity`

- [ ] **Step 1: Write parser tests**

Create `lib/intervals/parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseWellness, parseActivity } from './parser'

describe('parseWellness', () => {
  it('maps confirmed Intervals.icu fields to internal types', () => {
    const raw = {
      id: '2026-08-25',
      restingHR: 40,
      hrv: 95.0,
      sleepSecs: 22860,
      sleepScore: 79.0,
      sleepQuality: 3,
      steps: 17686,
      weight: 65.7,
      vo2max: 49.0,
    }
    const result = parseWellness(raw)
    expect(result.date).toBe('2026-08-25')
    expect(result.restingHr).toBe(40)
    expect(result.hrvRmssd).toBe(95.0)
    expect(result.sleepDurationS).toBe(22860)
    expect(result.sleepScore).toBe(79)
    expect(result.sleepQuality).toBe(3)
    expect(result.steps).toBe(17686)
    expect(result.weight).toBe(65.7)
    expect(result.vo2max).toBe(49.0)
  })

  it('handles null fields gracefully', () => {
    const raw = { id: '2026-08-26', restingHR: 40, hrv: 111.0, sleepSecs: null, sleepScore: null, sleepQuality: null, steps: 17087, weight: null, vo2max: null }
    const result = parseWellness(raw)
    expect(result.sleepDurationS).toBeNull()
    expect(result.sleepScore).toBeNull()
    expect(result.steps).toBe(17087)
  })
})

describe('parseActivity', () => {
  it('maps a walk activity to internal type', () => {
    const raw = {
      id: 'i180053414',
      type: 'Walk',
      name: 'Richmond upon Thames Walking',
      start_date_local: '2026-08-25T12:50:21',
      elapsed_time: 3402,
      distance: 4499.58,
      average_heartrate: 80,
      max_heartrate: 104,
      calories: 181,
      total_elevation_gain: 23.0,
      average_speed: 1.323,
    }
    const result = parseActivity(raw)
    expect(result.intervalsActivityId).toBe('i180053414')
    expect(result.type).toBe('walk')
    expect(result.name).toBe('Richmond upon Thames Walking')
    expect(result.durationS).toBe(3402)
    expect(result.distanceM).toBeCloseTo(4499.58)
    expect(result.avgHr).toBe(80)
    expect(result.caloriesBurned).toBe(181)
  })

  it('maps Run type correctly', () => {
    const raw = { id: 'i999', type: 'Run', name: 'Morning Run', start_date_local: '2026-08-20T07:00:00', elapsed_time: 1800, distance: 5000, average_heartrate: 145, max_heartrate: 170, calories: 400, total_elevation_gain: 50, average_speed: 2.78 }
    expect(parseActivity(raw).type).toBe('run')
  })

  it('falls back to "other" for unknown types', () => {
    const raw = { id: 'i123', type: 'Kayaking', name: 'Sea kayak', start_date_local: '2026-08-01T09:00:00', elapsed_time: 7200, distance: 10000, average_heartrate: null, max_heartrate: null, calories: null, total_elevation_gain: null, average_speed: null }
    expect(parseActivity(raw).type).toBe('other')
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run lib/intervals/parser.test.ts
```

Expected: FAIL — `Cannot find module './parser'`

- [ ] **Step 3: Implement parser**

Create `lib/intervals/parser.ts`:
```typescript
export type IntervalsWellness = {
  id: string
  restingHR: number | null
  hrv: number | null
  sleepSecs: number | null
  sleepScore: number | null
  sleepQuality: number | null
  steps: number | null
  weight: number | null
  vo2max: number | null
  [key: string]: unknown
}

export type IntervalsActivity = {
  id: string
  type: string
  name: string
  start_date_local: string
  elapsed_time: number | null
  distance: number | null
  average_heartrate: number | null
  max_heartrate: number | null
  calories: number | null
  total_elevation_gain: number | null
  average_speed: number | null
  [key: string]: unknown
}

export type ParsedWellness = {
  date: string
  restingHr: number | null
  hrvRmssd: number | null
  sleepDurationS: number | null
  sleepScore: number | null
  sleepQuality: number | null
  steps: number | null
  weight: number | null
  vo2max: number | null
}

export type ParsedActivity = {
  intervalsActivityId: string
  type: 'run' | 'walk' | 'cycle' | 'swim' | 'strength' | 'other'
  name: string
  startedAt: Date
  durationS: number | null
  distanceM: number | null
  avgPaceSPerKm: number | null
  avgHr: number | null
  maxHr: number | null
  caloriesBurned: number | null
  elevationM: number | null
  rawJson: string
}

const TYPE_MAP: Record<string, ParsedActivity['type']> = {
  Run: 'run',
  Walk: 'walk',
  Ride: 'cycle',
  VirtualRide: 'cycle',
  Swim: 'swim',
  WeightTraining: 'strength',
  Workout: 'strength',
}

export function parseWellness(raw: IntervalsWellness): ParsedWellness {
  return {
    date: raw.id,
    restingHr: raw.restingHR ?? null,
    hrvRmssd: raw.hrv ?? null,
    sleepDurationS: raw.sleepSecs ?? null,
    sleepScore: raw.sleepScore != null ? Math.round(raw.sleepScore) : null,
    sleepQuality: raw.sleepQuality ?? null,
    steps: raw.steps ?? null,
    weight: raw.weight ?? null,
    vo2max: raw.vo2max ?? null,
  }
}

export function parseActivity(raw: IntervalsActivity): ParsedActivity {
  const speedMs = raw.average_speed
  const avgPaceSPerKm = speedMs && speedMs > 0 ? 1000 / speedMs : null
  return {
    intervalsActivityId: raw.id,
    type: TYPE_MAP[raw.type] ?? 'other',
    name: raw.name ?? 'Activity',
    startedAt: new Date(raw.start_date_local),
    durationS: raw.elapsed_time ?? null,
    distanceM: raw.distance ?? null,
    avgPaceSPerKm,
    avgHr: raw.average_heartrate != null ? Math.round(raw.average_heartrate) : null,
    maxHr: raw.max_heartrate ?? null,
    caloriesBurned: raw.calories ?? null,
    elevationM: raw.total_elevation_gain ?? null,
    rawJson: JSON.stringify(raw),
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npx vitest run lib/intervals/parser.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Implement Intervals.icu API client**

Create `lib/intervals/client.ts`:
```typescript
import { type IntervalsWellness, type IntervalsActivity } from './parser'

const BASE = 'https://intervals.icu/api/v1'
const ATHLETE = process.env.INTERVALS_ATHLETE_ID!
const KEY = process.env.INTERVALS_API_KEY!

function authHeader(): HeadersInit {
  const encoded = Buffer.from(`API_KEY:${KEY}`).toString('base64')
  return { Authorization: `Basic ${encoded}` }
}

export async function fetchWellness(oldest: string, newest: string): Promise<IntervalsWellness[]> {
  const url = `${BASE}/athlete/${ATHLETE}/wellness.json?oldest=${oldest}&newest=${newest}`
  const res = await fetch(url, { headers: authHeader() })
  if (!res.ok) throw new Error(`Intervals.icu wellness fetch failed: ${res.status}`)
  return res.json() as Promise<IntervalsWellness[]>
}

export async function fetchActivities(oldest: string, newest: string): Promise<IntervalsActivity[]> {
  const url = `${BASE}/athlete/${ATHLETE}/activities?oldest=${oldest}&newest=${newest}&limit=50`
  const res = await fetch(url, { headers: authHeader() })
  if (!res.ok) throw new Error(`Intervals.icu activities fetch failed: ${res.status}`)
  return res.json() as Promise<IntervalsActivity[]>
}
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add lib/intervals/
git commit -m "feat: add Intervals.icu client and parser with tests (#5)"
git push
```

---

## Task 6: Sync Cron Route

**Files:**
- Create: `app/api/cron/sync-intervals/route.ts`
- Modify: `vercel.json` (create if not present) — add cron schedule

**Interfaces:**
- Consumes: `fetchWellness`, `fetchActivities` from `@/lib/intervals/client`; `parseWellness`, `parseActivity` from `@/lib/intervals/parser`; `upsertWellness` from wellness queries; `upsertActivity` from activities queries; `getUserByClerkId` from users queries
- Produces: `GET /api/cron/sync-intervals` — fetches last 2 days from Intervals.icu, upserts into DB; protected by `CRON_SECRET` header

- [ ] **Step 1: Create cron route**

Create `app/api/cron/sync-intervals/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { fetchWellness, fetchActivities } from '@/lib/intervals/client'
import { parseWellness, parseActivity } from '@/lib/intervals/parser'
import { upsertWellness } from '@/lib/db/queries/wellness'
import { upsertActivity } from '@/lib/db/queries/activities'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

// This route is called by Vercel Cron every 30 minutes.
// It syncs the last 2 days of data for all users who have an Intervals.icu connection.
// Currently single-user (David), but the loop over users makes it multi-user ready.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const newest = today.toISOString().split('T')[0]
  const oldest = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const allUsers = await db.select().from(users)

  let wellnessUpserted = 0
  let activitiesUpserted = 0
  const errors: string[] = []

  for (const user of allUsers) {
    try {
      const [rawWellness, rawActivities] = await Promise.all([
        fetchWellness(oldest, newest),
        fetchActivities(oldest, newest),
      ])

      for (const w of rawWellness) {
        const parsed = parseWellness(w)
        await upsertWellness({
          userId: user.id,
          date: parsed.date,
          source: 'intervals_icu',
          steps: parsed.steps,
          restingHr: parsed.restingHr,
          hrvRmssd: parsed.hrvRmssd,
          sleepScore: parsed.sleepScore,
          sleepQuality: parsed.sleepQuality,
          sleepDurationS: parsed.sleepDurationS,
          weight: parsed.weight,
          vo2max: parsed.vo2max,
        })
        wellnessUpserted++
      }

      for (const a of rawActivities) {
        const parsed = parseActivity(a)
        await upsertActivity({
          userId: user.id,
          intervalsActivityId: parsed.intervalsActivityId,
          type: parsed.type,
          name: parsed.name,
          startedAt: parsed.startedAt,
          durationS: parsed.durationS,
          distanceM: parsed.distanceM,
          avgPaceSPerKm: parsed.avgPaceSPerKm,
          avgHr: parsed.avgHr,
          maxHr: parsed.maxHr,
          caloriesBurned: parsed.caloriesBurned,
          elevationM: parsed.elevationM,
          rawJson: parsed.rawJson,
        })
        activitiesUpserted++
      }
    } catch (err) {
      errors.push(`user ${user.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ ok: true, wellnessUpserted, activitiesUpserted, errors })
}
```

- [ ] **Step 2: Add Vercel cron config**

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-intervals",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

- [ ] **Step 3: Smoke-test the cron endpoint locally**

```bash
npm run dev
```

In a second terminal, trigger the cron manually (using the CRON_SECRET from your `.env.local`):

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/sync-intervals
```

Expected response:
```json
{"ok":true,"wellnessUpserted":2,"activitiesUpserted":1,"errors":[]}
```

Check Neon console → `daily_wellness` and `activities` tables should have rows from Intervals.icu.

Note: local test requires `DATABASE_URL` in `.env.local` pointing at Neon (not a local DB) since Neon serverless only works over HTTP. This is fine for dev validation.

- [ ] **Step 4: Deploy and verify cron runs on Vercel**

```bash
git add app/api/cron/ vercel.json
git commit -m "feat: add Intervals.icu sync cron (#6)"
git push
```

In Vercel dashboard → your project → Cron Jobs tab. The `*/30 * * * *` job should appear. Trigger it manually from the dashboard to confirm it runs and returns 200.

---

## Task 7: Manual Wellness Override API + Form

**Goal:** Allow the user to manually override or supplement wellness values for a day (e.g. if Garmin didn't sync, or to add a note).

**Files:**
- Create: `app/api/wellness/route.ts`
- Create: `app/(dashboard)/wellness/page.tsx`

**Interfaces:**
- Consumes: `upsertWellness` from `@/lib/db/queries/wellness`; `getUserByClerkId` from users queries
- Produces: `POST /api/wellness` stores/overrides a daily wellness entry; `/wellness` page renders the form

- [ ] **Step 1: Create wellness API route**

Create `app/api/wellness/route.ts`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserByClerkId, upsertUser } from '@/lib/db/queries/users'
import { upsertWellness } from '@/lib/db/queries/wellness'

const WellnessSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().min(0).optional(),
  restingHr: z.number().int().min(20).max(250).optional(),
  hrvRmssd: z.number().min(0).optional(),
  sleepScore: z.number().int().min(0).max(100).optional(),
  sleepQuality: z.number().int().min(1).max(5).optional(),
  sleepDurationS: z.number().int().min(0).optional(),
  weight: z.number().min(0).optional(),
  caloriesBurned: z.number().int().min(0).optional(),
})

export async function POST(req: NextRequest) {
  const { userId: clerkId, sessionClaims } = auth().protect()
  const body = await req.json()
  const parsed = WellnessSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  let user = await getUserByClerkId(clerkId)
  if (!user) user = await upsertUser(clerkId, sessionClaims?.email as string ?? '')

  await upsertWellness({ userId: user.id, source: 'manual', ...parsed.data })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create wellness override form**

Create `app/(dashboard)/wellness/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WellnessPage() {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const toNum = (key: string) => { const v = form.get(key); return v ? Number(v) : undefined }
    const toSec = (h: string, m: string) => { const hv = toNum(h); const mv = toNum(m); return (hv || mv) ? ((hv ?? 0) * 3600 + (mv ?? 0) * 60) : undefined }

    await fetch('/api/wellness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        steps: toNum('steps'),
        restingHr: toNum('restingHr'),
        hrvRmssd: toNum('hrvRmssd'),
        sleepScore: toNum('sleepScore'),
        sleepDurationS: toSec('sleepDurationH', 'sleepDurationM'),
        weight: toNum('weight'),
        caloriesBurned: toNum('caloriesBurned'),
      }),
    })
    setSaving(false)
    router.push('/')
  }

  function Field({ label, name, unit, max }: { label: string; name: string; unit?: string; max?: number }) {
    return (
      <div className="flex items-center justify-between">
        <label className="text-gray-300 text-sm">{label}</label>
        <div className="flex items-center gap-1">
          <input name={name} type="number" min="0" max={max} className="w-20 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm text-right" />
          {unit && <span className="text-gray-500 text-sm w-8">{unit}</span>}
        </div>
      </div>
    )
  }

  function DurationField({ label, nameH, nameM }: { label: string; nameH: string; nameM: string }) {
    return (
      <div className="flex items-center justify-between">
        <label className="text-gray-300 text-sm">{label}</label>
        <div className="flex items-center gap-1">
          <input name={nameH} type="number" min="0" max="23" placeholder="0" className="w-14 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm text-right" />
          <span className="text-gray-500 text-sm">h</span>
          <input name={nameM} type="number" min="0" max="59" placeholder="0" className="w-14 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm text-right" />
          <span className="text-gray-500 text-sm">m</span>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-2xl font-bold">Override Wellness</h1>
      <p className="text-gray-400 text-sm">Intervals.icu syncs automatically. Use this to correct today's values.</p>

      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Sleep</h2>
        <Field label="Sleep Score" name="sleepScore" unit="/100" max={100} />
        <DurationField label="Total Duration" nameH="sleepDurationH" nameM="sleepDurationM" />
      </section>

      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Heart & Recovery</h2>
        <Field label="Resting HR" name="restingHr" unit="bpm" />
        <Field label="HRV" name="hrvRmssd" unit="ms" />
      </section>

      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Activity</h2>
        <Field label="Steps" name="steps" />
        <Field label="Calories Burned" name="caloriesBurned" unit="kcal" />
      </section>

      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Body</h2>
        <Field label="Weight" name="weight" unit="kg" />
      </section>

      <button type="submit" disabled={saving} className="w-full bg-[#00C853] hover:bg-[#00E676] disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors">
        {saving ? 'Saving...' : 'Save Override'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Verify form works**

```bash
npm run dev
```

Navigate to `http://localhost:3000/wellness`. Fill in resting HR of 42, sleep score of 81. Submit. Expected: redirects to `/`. Check Neon console → `daily_wellness` table has a row with `source = 'manual'`.

- [ ] **Step 4: Commit**

```bash
git add app/api/wellness/ app/\(dashboard\)/wellness/
git commit -m "feat: add manual wellness override form and API route (#7)"
git push
```

---

## Task 8: Today Dashboard + Activity Page UI

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/page.tsx`
- Create: `app/(dashboard)/activity/page.tsx`
- Create: `app/(dashboard)/nutrition/page.tsx` (stub)
- Create: `app/(dashboard)/trends/page.tsx` (stub)
- Create: `components/nav/BottomNav.tsx`
- Create: `components/today/SleepCard.tsx`
- Create: `components/today/StepsCard.tsx`
- Create: `components/today/HrvCard.tsx`
- Create: `components/today/CalorieRing.tsx`
- Create: `components/ui/ProgressBar.tsx`

**Interfaces:**
- Consumes: `getTodayWellness` from `@/lib/db/queries/wellness`; `getRecentActivities` from `@/lib/db/queries/activities`; `getUserByClerkId`, `upsertUser` from users queries
- Produces: Today page with live wellness cards populated from Intervals.icu sync; Activity page with recent activities list

- [ ] **Step 1: Create bottom nav**

Create `components/nav/BottomNav.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Today', icon: '⚡' },
  { href: '/nutrition', label: 'Food', icon: '🥗' },
  { href: '/activity', label: 'Activity', icon: '🏃' },
  { href: '/trends', label: 'Trends', icon: '📈' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111827] border-t border-gray-800 flex safe-area-pb">
      {links.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${pathname === href ? 'text-[#00C853]' : 'text-gray-500'}`}
        >
          <span className="text-xl">{icon}</span>
          {label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Create dashboard layout**

Create `app/(dashboard)/layout.tsx`:
```typescript
import { BottomNav } from '@/components/nav/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0F0A] text-white pb-24">
      <main className="max-w-lg mx-auto px-4 pt-6">{children}</main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 3: Create ProgressBar**

Create `components/ui/ProgressBar.tsx`:
```typescript
type Props = {
  label: string
  value: number
  max: number
  unit: string
  colour?: string
}

export function ProgressBar({ label, value, max, unit, colour = 'bg-[#00C853]' }: Props) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const left = Math.max(max - value, 0)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-500">{value.toFixed(0)} / {max} {unit} · <span className="text-white">{left.toFixed(0)} left</span></span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${colour} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create SleepCard**

Create `components/today/SleepCard.tsx`:
```typescript
function fmt(seconds?: number | null) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

type Props = {
  score?: number | null
  durationS?: number | null
  quality?: number | null
}

export function SleepCard({ score, durationS, quality }: Props) {
  const qualityLabel = quality != null ? ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][quality] ?? '—' : '—'
  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-3">
      <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Sleep</h2>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-indigo-400">{score ?? '—'}</span>
        <span className="text-gray-500 text-sm pb-1">{fmt(durationS)} · {qualityLabel}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create StepsCard**

Create `components/today/StepsCard.tsx`:
```typescript
type Props = { steps?: number | null; goal?: number }

export function StepsCard({ steps, goal = 10000 }: Props) {
  const s = steps ?? 0
  const pct = Math.min((s / goal) * 100, 100)
  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-2">
      <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Steps</h2>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-amber-400">{s.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-500">{goal.toLocaleString()} goal</p>
    </div>
  )
}
```

- [ ] **Step 6: Create HrvCard**

Create `components/today/HrvCard.tsx`:
```typescript
type Props = { hrv?: number | null; restingHr?: number | null }

export function HrvCard({ hrv, restingHr }: Props) {
  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-2">
      <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Recovery</h2>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-[#00BCD4]">{hrv != null ? Math.round(hrv) : '—'}</span>
        {hrv && <span className="text-gray-500 text-sm pb-1">ms HRV</span>}
      </div>
      <div className="text-sm text-gray-500">
        Resting HR <span className="text-white">{restingHr ?? '—'}</span> bpm
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create CalorieRing**

Create `components/today/CalorieRing.tsx`:
```typescript
type Props = { consumed: number; goal: number; burned: number }

export function CalorieRing({ consumed, goal, burned }: Props) {
  const net = goal - consumed + burned
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0
  const r = 48
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="bg-[#111827] rounded-2xl p-4 flex items-center gap-4">
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
      <div className="space-y-2 text-sm">
        <div><span className="text-gray-500">Goal </span><span className="text-white font-medium">{goal} kcal</span></div>
        <div><span className="text-gray-500">Burned </span><span className="text-[#00C853] font-medium">+{burned}</span></div>
        <div><span className="text-gray-500">Remaining </span><span className={`font-semibold ${net >= 0 ? 'text-white' : 'text-red-400'}`}>{net} kcal</span></div>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Create Today page**

Create `app/(dashboard)/page.tsx`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, upsertUser } from '@/lib/db/queries/users'
import { getTodayWellness } from '@/lib/db/queries/wellness'
import { SleepCard } from '@/components/today/SleepCard'
import { StepsCard } from '@/components/today/StepsCard'
import { HrvCard } from '@/components/today/HrvCard'
import { CalorieRing } from '@/components/today/CalorieRing'
import Link from 'next/link'

export default async function TodayPage() {
  const { userId: clerkId, sessionClaims } = auth()
  if (!clerkId) return null

  let user = await getUserByClerkId(clerkId)
  if (!user) user = await upsertUser(clerkId, sessionClaims?.email as string ?? '')

  const today = new Date().toISOString().split('T')[0]
  const wellness = await getTodayWellness(user.id, today)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Today</h1>
        <Link href="/wellness" className="text-sm text-[#00C853]">Override</Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StepsCard steps={wellness?.steps} goal={10000} />
        <HrvCard hrv={wellness?.hrvRmssd} restingHr={wellness?.restingHr} />
      </div>

      <SleepCard
        score={wellness?.sleepScore}
        durationS={wellness?.sleepDurationS}
        quality={wellness?.sleepQuality}
      />

      <CalorieRing
        consumed={0}
        goal={user.calorieGoal ?? 2000}
        burned={wellness?.caloriesBurned ?? 0}
      />
    </div>
  )
}
```

- [ ] **Step 9: Create Activity page**

Create `app/(dashboard)/activity/page.tsx`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { getRecentActivities } from '@/lib/db/queries/activities'

function fmtPace(sPerKm?: number | null) {
  if (!sPerKm) return '—'
  const m = Math.floor(sPerKm / 60)
  const s = Math.round(sPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

function fmtDuration(s?: number | null) {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDistance(m?: number | null) {
  if (!m) return '—'
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`
}

export default async function ActivityPage() {
  const { userId: clerkId } = auth()
  if (!clerkId) return null

  const user = await getUserByClerkId(clerkId)
  const activities = user ? await getRecentActivities(user.id, 20) : []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Activity</h1>
      {activities.length === 0 ? (
        <div className="bg-[#111827] rounded-2xl p-6 text-center text-gray-500">
          <p>No activities yet.</p>
          <p className="text-sm mt-1">Intervals.icu syncs automatically from your Garmin every 30 minutes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(a => (
            <div key={a.id} className="bg-[#111827] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{a.name ?? a.type}</span>
                <span className="text-gray-500 text-sm">{new Date(a.startedAt).toLocaleDateString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-center">
                <div><div className="text-white font-medium">{fmtDistance(a.distanceM)}</div><div className="text-gray-500 text-xs">distance</div></div>
                <div><div className="text-white font-medium">{fmtDuration(a.durationS)}</div><div className="text-gray-500 text-xs">duration</div></div>
                <div><div className="text-white font-medium">{fmtPace(a.avgPaceSPerKm)}</div><div className="text-gray-500 text-xs">pace</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 10: Create stub pages**

Create `app/(dashboard)/nutrition/page.tsx`:
```typescript
export default function NutritionPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Log Food</h1>
      <div className="bg-[#111827] rounded-2xl p-6 text-center text-gray-500">Coming in M2</div>
    </div>
  )
}
```

Create `app/(dashboard)/trends/page.tsx`:
```typescript
export default function TrendsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Trends</h1>
      <div className="bg-[#111827] rounded-2xl p-6 text-center text-gray-500">Coming in M3</div>
    </div>
  )
}
```

- [ ] **Step 11: Verify in browser**

```bash
npm run dev
```

Expected: Today page renders with cards showing real Intervals.icu data (steps, HRV, sleep) pulled from Neon after the cron ran. If cron hasn't run yet, trigger manually per Task 6 Step 3, then refresh.

- [ ] **Step 12: Commit**

```bash
git add app/\(dashboard\)/ components/
git commit -m "feat: add Today dashboard, Activity page, and nav (#8)"
git push
```

---

## Task 9: Profile Page

**Files:**
- Create: `app/(dashboard)/profile/page.tsx`

**Interfaces:**
- Consumes: `getUserByClerkId` from users queries
- Produces: Profile page showing Intervals.icu sync status, last sync time, link to manual wellness override

- [ ] **Step 1: Create profile page**

Create `app/(dashboard)/profile/page.tsx`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { getTodayWellness } from '@/lib/db/queries/wellness'
import { UserButton } from '@clerk/nextjs'

export default async function ProfilePage() {
  const { userId: clerkId } = auth()
  if (!clerkId) return null

  const user = await getUserByClerkId(clerkId)
  const today = new Date().toISOString().split('T')[0]
  const wellness = user ? await getTodayWellness(user.id, today) : null
  const lastSync = wellness ? new Date(wellness.date).toLocaleDateString() : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Intervals.icu Sync</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Connected via Garmin</p>
            <p className="text-gray-500 text-sm">
              {lastSync ? `Last data: ${lastSync}` : 'Syncs every 30 minutes automatically'}
            </p>
          </div>
          <span className="text-[#00C853] text-sm">Active</span>
        </div>
      </section>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Daily Wellness</h2>
        <p className="text-gray-500 text-sm">Intervals.icu syncs sleep, HRV, steps and resting HR automatically. Override values if needed.</p>
        <a href="/wellness" className="block text-center bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          Override Today's Wellness
        </a>
      </section>

      <section className="bg-[#111827] rounded-2xl p-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Goals</h2>
        <p className="text-gray-500 text-sm">Calorie and nutrient goals — coming in M2</p>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npm run dev
```

Navigate to `/profile`. Expected: Intervals.icu sync status, wellness override link, goals stub.

- [ ] **Step 3: Commit and push**

```bash
git add app/\(dashboard\)/profile/
git commit -m "feat: add profile page with sync status and wellness override link (#9)"
git push
```

---

## Self-Review

**Spec coverage:**
- Next.js 15 + TypeScript strict + Clerk + Neon + Drizzle + Zod + Vitest + @ducanh2912/next-pwa
- All DB tables defined: users, activities, daily_wellness, foods, nutrition_log
- Intervals.icu polling cron (every 30 min) — no webhook required
- Wellness fields confirmed from live API: restingHr, hrv, sleepSecs, sleepScore, sleepQuality, steps, weight, vo2max
- Body Battery: not available from Garmin → Intervals.icu (removed from schema)
- Sleep stages (deep/REM/light): not in Intervals.icu wellness response (removed from schema, keeping only total duration + score + quality)
- Manual wellness override for any field
- Today dashboard: steps, HRV + resting HR, sleep score/duration, calorie ring
- Activity page: recent activities list from Intervals.icu sync
- Profile page: sync status, wellness override link
- Bottom nav (5 tabs)
- PWA manifest with brand colours
- Vercel deployment early (Task 3) — cron URL confirmed before building sync logic
- PWA compatibility validated early (Task 2)
- Android PWA smoke test in Task 3
- Unit tests: parser (5 tests covering wellness + activity mapping, null handling, type mapping)
- Brand palette applied throughout (bg-[#0A0F0A], bg-[#111827], text-[#00C853])

**Removed vs original plan:**
- Strava OAuth, webhook, token encryption — replaced by Intervals.icu polling cron
- Body Battery fields — not available from Garmin via Intervals.icu
- Sleep stages (deep/REM/light/awake) — not in Intervals.icu wellness response; only total duration + score + quality

**Gaps:** foods and nutrition_log tables exist in schema ready for M2. Profile goals section is a stub — correct, that's M2.
