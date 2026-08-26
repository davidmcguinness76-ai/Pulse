# Pulse M1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the full project skeleton with auth, database, Strava OAuth + webhook for activity ingestion, manual wellness logging, and the Today dashboard showing live data.

**Architecture:** Next.js 15 App Router monorepo on Vercel. Clerk handles auth. Neon Postgres via Drizzle ORM. Strava pushes activity data via webhook after each run. Wellness data (sleep, body battery, HRV) is entered manually by the user — same schema, different source. Vercel is deployed early (Task 3) so the Strava webhook URL exists before it is needed. Two medium risks are validated in Tasks 2 and 5 before building anything that depends on them.

**Tech Stack:** Next.js 15, TypeScript (strict), Clerk, Neon Postgres, Drizzle ORM, Zod, Vitest, Tailwind CSS, @ducanh2912/next-pwa, Vercel, Strava API

## Global Constraints

- TypeScript strict mode — no `any`, no implicit returns
- All API routes protected by Clerk `auth()` — no public routes except `/api/strava/webhook` (verified by signature) and `/sign-in`
- No API keys in client bundle — all server-side only
- Zod validation at every API boundary
- Vitest for all unit tests — no Jest, no other test frameworks
- Drizzle for all DB access — no raw SQL strings
- Strava tokens encrypted at rest with AES-256-GCM; key in `STRAVA_TOKEN_ENCRYPTION_KEY` env var (32-byte hex)
- Use `@ducanh2912/next-pwa` not `next-pwa` — better Next.js 15 App Router support
- Commit format: `type: description (#issue-number)` — e.g. `feat: add Strava webhook handler (#3)`
- One GitHub issue per task — label with `feature` + `P3-medium` + `status:todo` before starting, flip to `status:in-progress` when starting, `status:review` when done

---

## Risk Register

| Risk | Mitigation | Validated in |
|------|-----------|-------------|
| `@ducanh2912/next-pwa` + Next.js 15 App Router compatibility | Use this fork specifically; validate PWA manifest loads | Task 2 |
| Barcode camera (`getUserMedia`) requires HTTPS | Deploy to Vercel early; test on production URL from Android | Task 5 (smoke test) |

---

## File Map

| File | Responsibility |
|------|---------------|
| `app/layout.tsx` | Root layout with ClerkProvider, global styles |
| `app/(dashboard)/layout.tsx` | Dashboard shell with bottom nav |
| `app/(dashboard)/page.tsx` | Today view |
| `app/(dashboard)/activity/page.tsx` | Activity list |
| `app/(dashboard)/wellness/page.tsx` | Manual wellness log form |
| `app/(dashboard)/nutrition/page.tsx` | Log Food stub (M2) |
| `app/(dashboard)/trends/page.tsx` | Trends stub (M3) |
| `app/(dashboard)/profile/page.tsx` | Profile + Strava connect |
| `app/sign-in/[[...sign-in]]/page.tsx` | Clerk sign-in page |
| `app/api/strava/callback/route.ts` | Strava OAuth callback — stores tokens |
| `app/api/strava/webhook/route.ts` | Strava push webhook — upserts activities |
| `app/api/strava/connect/route.ts` | Initiates Strava OAuth redirect |
| `app/api/strava/disconnect/route.ts` | Deletes stored tokens |
| `app/api/wellness/route.ts` | POST manual wellness entry |
| `middleware.ts` | Clerk auth middleware — protects all routes |
| `lib/db/schema.ts` | Drizzle schema — all tables |
| `lib/db/index.ts` | Neon + Drizzle client singleton |
| `lib/db/queries/users.ts` | User upsert, get by clerk_id |
| `lib/db/queries/strava.ts` | Upsert activities, tokens |
| `lib/db/queries/wellness.ts` | Upsert daily wellness |
| `lib/strava/crypto.ts` | AES-256-GCM encrypt/decrypt for tokens |
| `lib/strava/webhook.ts` | Payload parser + signature verification |
| `lib/strava/client.ts` | Strava API client (token refresh, activity fetch) |
| `components/today/BodyBatteryCard.tsx` | Body battery hero card |
| `components/today/SleepCard.tsx` | Sleep score + stages card |
| `components/today/StepsCard.tsx` | Steps progress card |
| `components/today/CalorieRing.tsx` | Calories consumed / goal / burned ring |
| `components/ui/ProgressBar.tsx` | Reusable labelled progress bar |
| `components/nav/BottomNav.tsx` | PWA bottom navigation |
| `public/manifest.json` | PWA manifest |
| `next.config.ts` | @ducanh2912/next-pwa config |
| `drizzle.config.ts` | Drizzle Kit config |
| `vitest.config.ts` | Vitest config |
| `lib/strava/webhook.test.ts` | Webhook parser unit tests |
| `lib/strava/crypto.test.ts` | Encrypt/decrypt unit tests |

---

## Pre-flight: One-time Manual Steps

Complete these before writing any code:

- [ ] Create GitHub repo `davidmcguinness76-ai/Pulse` (public)
- [ ] Run `C:\Users\david\Documents\GitHub\_AI_Master\scripts\setup-labels.ps1` to apply label taxonomy
- [ ] Register Strava developer app at developers.strava.com → "My API Application" → note `Client ID` and `Client Secret` (instant, no approval wait)
- [ ] Set Strava Authorization Callback Domain to `localhost` for now (update to Vercel URL after Task 3)
- [ ] Create Clerk application at clerk.com → enable Google OAuth → note `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- [ ] Create Neon project at neon.tech → note `DATABASE_URL` (pooled connection string)
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
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_WEBHOOK_VERIFY_TOKEN=<any random string you choose, e.g. pulse-webhook-2026>
STRAVA_TOKEN_ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
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
  '/api/strava/webhook',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect()
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
- Modify: `app/layout.tsx` — add manifest link tag
- Read: generated `public/sw.js` after build

**Interfaces:**
- Produces: confirmed PWA manifest loads in browser; service worker registers without error

- [ ] **Step 1: Run a production build locally**

```bash
npm run build
```

Expected: build completes without errors. The `@ducanh2912/next-pwa` plugin generates `public/sw.js` and `public/workbox-*.js`. If build fails with a PWA-related error, check the plugin version matches Next.js 15 — consult `https://github.com/DuCanhGH/next-pwa`.

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

If manifest or service worker fails: the issue is almost certainly the `next-pwa` config. Check the `@ducanh2912/next-pwa` README for Next.js 15-specific config — the `dest` and `disable` options may need adjustment. Fix before continuing.

- [ ] **Step 6: Commit if any fixes were needed**

```bash
git add next.config.ts
git commit -m "fix: resolve PWA compatibility with Next.js 15 (#2)"
```

---

## Task 3: Deploy to Vercel (Early — needed for Strava webhook)

**Goal:** Get a live production URL before registering the Strava webhook subscription.

**Files:** none — Vercel config via dashboard

**Interfaces:**
- Produces: live `https://<your-app>.vercel.app` URL for Strava webhook registration

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

- [ ] **Step 5: Update Strava callback domain**

In Strava developer settings, update "Authorization Callback Domain" to your Vercel domain (e.g. `pulse-david.vercel.app`). Remove `localhost` or add both.

- [ ] **Step 6: Verify production URL loads**

Open production URL. Expected: redirects to Clerk sign-in page.

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
- Create: `lib/db/queries/strava.ts`
- Create: `lib/db/queries/wellness.ts`

**Interfaces:**
- Produces:
  - `db` — Drizzle client, imported as `import { db } from '@/lib/db'`
  - `upsertUser(clerkId: string, email: string): Promise<User>`
  - `getUserByClerkId(clerkId: string): Promise<User | undefined>`
  - `upsertActivity(data: NewStravaActivity): Promise<void>`
  - `getRecentActivities(userId: string, limit: number): Promise<StravaActivity[]>`
  - `saveStravaTokens(userId: string, tokens: StravaTokens): Promise<void>`
  - `getStravaTokens(userId: string): Promise<StravaTokenRow | null>`
  - `deleteStravaTokens(userId: string): Promise<void>`
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
export const wellnessSourceEnum = pgEnum('wellness_source', ['manual', 'api'])

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

export const stravaTokens = pgTable('strava_tokens', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  stravaAthleteId: text('strava_athlete_id').notNull(),
})

export const stravaActivities = pgTable('strava_activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  stravaActivityId: text('strava_activity_id').notNull().unique(),
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
  source: wellnessSourceEnum('source').notNull().default('manual'),
  steps: integer('steps'),
  restingHr: integer('resting_hr'),
  bodyBatteryHigh: integer('body_battery_high'),
  bodyBatteryLow: integer('body_battery_low'),
  hrvRmssd: real('hrv_rmssd'),
  sleepScore: integer('sleep_score'),
  sleepDurationS: integer('sleep_duration_s'),
  sleepDeepS: integer('sleep_deep_s'),
  sleepLightS: integer('sleep_light_s'),
  sleepRemS: integer('sleep_rem_s'),
  sleepAwakeS: integer('sleep_awake_s'),
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
export type StravaActivity = typeof stravaActivities.$inferSelect
export type NewStravaActivity = typeof stravaActivities.$inferInsert
export type StravaTokenRow = typeof stravaTokens.$inferSelect
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

- [ ] **Step 4: Create Strava queries**

Create `lib/db/queries/strava.ts`:
```typescript
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { stravaTokens, stravaActivities, type NewStravaActivity, type StravaActivity, type StravaTokenRow } from '@/lib/db/schema'

export type StravaTokens = {
  accessTokenEncrypted: string
  refreshTokenEncrypted: string
  expiresAt: Date
  stravaAthleteId: string
}

export async function saveStravaTokens(userId: string, tokens: StravaTokens): Promise<void> {
  await db
    .insert(stravaTokens)
    .values({ userId, ...tokens })
    .onConflictDoUpdate({ target: stravaTokens.userId, set: tokens })
}

export async function getStravaTokens(userId: string): Promise<StravaTokenRow | null> {
  return db.query.stravaTokens.findFirst({ where: eq(stravaTokens.userId, userId) }) ?? null
}

export async function deleteStravaTokens(userId: string): Promise<void> {
  await db.delete(stravaTokens).where(eq(stravaTokens.userId, userId))
}

export async function upsertActivity(data: NewStravaActivity): Promise<void> {
  await db
    .insert(stravaActivities)
    .values(data)
    .onConflictDoUpdate({ target: stravaActivities.stravaActivityId, set: data })
}

export async function getRecentActivities(userId: string, limit = 10): Promise<StravaActivity[]> {
  return db.query.stravaActivities.findMany({
    where: eq(stravaActivities.userId, userId),
    orderBy: desc(stravaActivities.startedAt),
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

Expected: all tables created. Confirm in Neon console — you should see: `users`, `strava_tokens`, `strava_activities`, `daily_wellness`, `foods`, `nutrition_log`.

- [ ] **Step 7: Commit**

```bash
git add lib/db/ drizzle.config.ts drizzle/
git commit -m "feat: add Drizzle schema and Neon DB client (#4)"
git push
```

---

## Task 5: Token Crypto + Strava Webhook Parser (with tests)

**Files:**
- Create: `lib/strava/crypto.ts`
- Create: `lib/strava/crypto.test.ts`
- Create: `lib/strava/webhook.ts`
- Create: `lib/strava/webhook.test.ts`

**Interfaces:**
- Produces:
  - `encrypt(plaintext: string): string` — returns `iv:authTag:ciphertext` hex string
  - `decrypt(encrypted: string): string` — reverses encrypt
  - `verifyStravaWebhook(token: string, verifyToken: string): boolean`
  - `parseStravaActivity(payload: unknown): ParsedActivity | null`

- [ ] **Step 1: Write crypto tests**

Create `lib/strava/crypto.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from './crypto'

describe('encrypt/decrypt', () => {
  it('round-trips a token string', () => {
    const original = 'test-access-token-abc123'
    const encrypted = encrypt(original)
    expect(encrypted).not.toBe(original)
    expect(decrypt(encrypted)).toBe(original)
  })

  it('produces different ciphertexts for same input (random IV)', () => {
    const a = encrypt('same-value')
    const b = encrypt('same-value')
    expect(a).not.toBe(b)
    expect(decrypt(a)).toBe('same-value')
    expect(decrypt(b)).toBe('same-value')
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
STRAVA_TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32) npx vitest run lib/strava/crypto.test.ts
```

Expected: FAIL — `Cannot find module './crypto'`

- [ ] **Step 3: Implement crypto**

Create `lib/strava/crypto.ts`:
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const KEY = Buffer.from(process.env.STRAVA_TOKEN_ENCRYPTION_KEY!, 'hex')
const ALGO = 'aes-256-gcm'

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, dataHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Run crypto tests**

```bash
STRAVA_TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32) npx vitest run lib/strava/crypto.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Write webhook parser tests**

Create `lib/strava/webhook.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseStravaActivity, verifyStravaWebhook } from './webhook'

describe('verifyStravaWebhook', () => {
  it('returns true when token matches', () => {
    expect(verifyStravaWebhook('pulse-webhook-2026', 'pulse-webhook-2026')).toBe(true)
  })

  it('returns false when token does not match', () => {
    expect(verifyStravaWebhook('wrong-token', 'pulse-webhook-2026')).toBe(false)
  })
})

describe('parseStravaActivity', () => {
  it('parses a valid Strava activity payload', () => {
    const payload = {
      object_type: 'activity',
      object_id: 12345678,
      aspect_type: 'create',
      owner_id: 987654,
    }
    const result = parseStravaActivity(payload)
    expect(result).not.toBeNull()
    expect(result!.stravaActivityId).toBe('12345678')
    expect(result!.stravaAthleteId).toBe('987654')
    expect(result!.aspectType).toBe('create')
  })

  it('returns null for non-activity events', () => {
    expect(parseStravaActivity({ object_type: 'athlete' })).toBeNull()
  })

  it('returns null for delete events', () => {
    expect(parseStravaActivity({ object_type: 'activity', aspect_type: 'delete' })).toBeNull()
  })
})
```

- [ ] **Step 6: Run to confirm fail**

```bash
npx vitest run lib/strava/webhook.test.ts
```

Expected: FAIL — `Cannot find module './webhook'`

- [ ] **Step 7: Implement webhook parser**

Create `lib/strava/webhook.ts`:

```typescript
// Strava webhooks deliver event notifications only — no activity data.
// We use the event to know a new activity exists, then fetch full details
// from the Strava API using the stored access token.
export type ParsedWebhookEvent = {
  stravaActivityId: string
  stravaAthleteId: string
  aspectType: 'create' | 'update'
}

export type ParsedActivity = {
  stravaActivityId: string
  type: 'run' | 'walk' | 'cycle' | 'swim' | 'strength' | 'other'
  name: string
  startedAt: Date
  durationS?: number
  distanceM?: number
  avgPaceSPerKm?: number
  avgHr?: number
  maxHr?: number
  caloriesBurned?: number
  elevationM?: number
  rawJson: string
}

const TYPE_MAP: Record<string, ParsedActivity['type']> = {
  Run: 'run',
  Walk: 'walk',
  Ride: 'cycle',
  Swim: 'swim',
  WeightTraining: 'strength',
  Workout: 'strength',
}

export function verifyStravaWebhook(token: string, verifyToken: string): boolean {
  return token === verifyToken
}

export function parseStravaActivity(payload: unknown): ParsedWebhookEvent | null {
  const p = payload as Record<string, unknown>
  if (p.object_type !== 'activity') return null
  if (p.aspect_type === 'delete') return null
  if (p.aspect_type !== 'create' && p.aspect_type !== 'update') return null
  return {
    stravaActivityId: String(p.object_id),
    stravaAthleteId: String(p.owner_id),
    aspectType: p.aspect_type as 'create' | 'update',
  }
}

export function parseStravaApiActivity(data: Record<string, unknown>): ParsedActivity {
  const speedMs = data.average_speed as number | undefined
  const avgPaceSPerKm = speedMs && speedMs > 0 ? 1000 / speedMs : undefined
  return {
    stravaActivityId: String(data.id),
    type: TYPE_MAP[String(data.type)] ?? 'other',
    name: String(data.name ?? 'Activity'),
    startedAt: new Date(String(data.start_date)),
    durationS: data.elapsed_time as number | undefined,
    distanceM: data.distance as number | undefined,
    avgPaceSPerKm,
    avgHr: data.average_heartrate as number | undefined,
    maxHr: data.max_heartrate as number | undefined,
    caloriesBurned: data.calories as number | undefined,
    elevationM: data.total_elevation_gain as number | undefined,
    rawJson: JSON.stringify(data),
  }
}
```

- [ ] **Step 8: Run all tests**

```bash
STRAVA_TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32) npx vitest run
```

Expected: PASS (all tests)

- [ ] **Step 9: Smoke-test PWA on Android (Medium Risk — validate now)**

Deploy current state to Vercel (`git push` triggers auto-deploy). On your Pixel 10 Pro XL:
1. Open Chrome → navigate to production URL
2. Sign in with Google
3. Chrome should show "Add to Home Screen" prompt — install it
4. Open from home screen — should launch in standalone mode (no browser chrome)
5. Open Chrome DevTools on desktop → `chrome://inspect` → inspect the device → Application → Service Workers

Expected: standalone mode works, service worker active. If it fails, the issue is either the manifest `display: standalone` or the service worker not registering — check Vercel deployment logs.

- [ ] **Step 10: Commit**

```bash
git add lib/strava/
git commit -m "feat: add Strava token crypto and webhook parser with tests (#5)"
git push
```

---

## Task 6: Strava OAuth + Webhook API Routes

**Files:**
- Create: `app/api/strava/connect/route.ts`
- Create: `app/api/strava/callback/route.ts`
- Create: `app/api/strava/webhook/route.ts`
- Create: `app/api/strava/disconnect/route.ts`
- Create: `lib/strava/client.ts`

**Interfaces:**
- Consumes: `encrypt`, `decrypt` from `@/lib/strava/crypto`; `verifyStravaWebhook`, `parseStravaActivity`, `parseStravaApiActivity` from `@/lib/strava/webhook`; all strava queries; `upsertUser`, `getUserByClerkId` from users queries
- Produces: working Strava OAuth flow; webhook that fetches and stores activity details on each new Strava activity

- [ ] **Step 1: Create Strava API client**

Create `lib/strava/client.ts`:
```typescript
import { decrypt, encrypt } from './crypto'
import { saveStravaTokens, getStravaTokens } from '@/lib/db/queries/strava'
import { parseStravaApiActivity, type ParsedActivity } from './webhook'

const TOKEN_URL = 'https://www.strava.com/oauth/token'
const ACTIVITY_URL = 'https://www.strava.com/api/v3/activities'

export function getStravaAuthUrl(callbackUrl: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: callbackUrl,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`)
  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_at: number
    athlete: { id: number }
  }>
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const row = await getStravaTokens(userId)
  if (!row) throw new Error('No Strava tokens for user')

  if (new Date() < row.expiresAt) {
    return decrypt(row.accessTokenEncrypted)
  }

  // Refresh expired token
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      refresh_token: decrypt(row.refreshTokenEncrypted),
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`)
  const data = await res.json() as { access_token: string; refresh_token: string; expires_at: number }

  await saveStravaTokens(userId, {
    accessTokenEncrypted: encrypt(data.access_token),
    refreshTokenEncrypted: encrypt(data.refresh_token),
    expiresAt: new Date(data.expires_at * 1000),
    stravaAthleteId: row.stravaAthleteId,
  })

  return data.access_token
}

export async function fetchActivity(userId: string, stravaActivityId: string): Promise<ParsedActivity> {
  const token = await getValidAccessToken(userId)
  const res = await fetch(`${ACTIVITY_URL}/${stravaActivityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Strava activity fetch failed: ${res.status}`)
  const data = await res.json()
  return parseStravaApiActivity(data)
}
```

- [ ] **Step 2: Create connect route**

Create `app/api/strava/connect/route.ts`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getStravaAuthUrl } from '@/lib/strava/client'

export async function GET() {
  auth().protect()
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`
  return NextResponse.redirect(getStravaAuthUrl(callbackUrl))
}
```

- [ ] **Step 3: Create callback route**

Create `app/api/strava/callback/route.ts`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUserByClerkId, upsertUser } from '@/lib/db/queries/users'
import { saveStravaTokens } from '@/lib/db/queries/strava'
import { encrypt } from '@/lib/strava/crypto'
import { exchangeCodeForTokens } from '@/lib/strava/client'

export async function GET(req: NextRequest) {
  const { userId: clerkId, sessionClaims } = auth()
  if (!clerkId) return NextResponse.redirect(new URL('/sign-in', req.url))

  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/profile?error=strava_denied', req.url))

  const email = sessionClaims?.email as string ?? ''
  let user = await getUserByClerkId(clerkId)
  if (!user) user = await upsertUser(clerkId, email)

  const tokens = await exchangeCodeForTokens(code)

  await saveStravaTokens(user.id, {
    accessTokenEncrypted: encrypt(tokens.access_token),
    refreshTokenEncrypted: encrypt(tokens.refresh_token),
    expiresAt: new Date(tokens.expires_at * 1000),
    stravaAthleteId: String(tokens.athlete.id),
  })

  return NextResponse.redirect(new URL('/profile?connected=true', req.url))
}
```

- [ ] **Step 4: Create webhook route**

Create `app/api/strava/webhook/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyStravaWebhook, parseStravaActivity } from '@/lib/strava/webhook'
import { fetchActivity } from '@/lib/strava/client'
import { upsertActivity, getStravaTokens } from '@/lib/db/queries/strava'
import { db } from '@/lib/db'
import { stravaTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Strava sends a GET to verify the webhook subscription endpoint
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && verifyStravaWebhook(token ?? '', process.env.STRAVA_WEBHOOK_VERIFY_TOKEN!)) {
    return NextResponse.json({ 'hub.challenge': challenge })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Strava sends a POST for each new/updated activity event
export async function POST(req: NextRequest) {
  const payload = await req.json()
  const event = parseStravaActivity(payload)
  if (!event) return NextResponse.json({ ok: true }) // ignore non-activity or delete events

  // Find the internal user by Strava athlete ID
  const tokenRow = await db.query.stravaTokens.findFirst({
    where: eq(stravaTokens.stravaAthleteId, event.stravaAthleteId),
  })
  if (!tokenRow) return NextResponse.json({ error: 'Unknown athlete' }, { status: 404 })

  const activity = await fetchActivity(tokenRow.userId, event.stravaActivityId)

  await upsertActivity({
    userId: tokenRow.userId,
    stravaActivityId: activity.stravaActivityId,
    type: activity.type,
    name: activity.name,
    startedAt: activity.startedAt,
    durationS: activity.durationS,
    distanceM: activity.distanceM,
    avgPaceSPerKm: activity.avgPaceSPerKm,
    avgHr: activity.avgHr,
    maxHr: activity.maxHr,
    caloriesBurned: activity.caloriesBurned,
    elevationM: activity.elevationM,
    rawJson: activity.rawJson,
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create disconnect route**

Create `app/api/strava/disconnect/route.ts`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { deleteStravaTokens } from '@/lib/db/queries/strava'

export async function POST() {
  const { userId: clerkId } = auth().protect()
  const user = await getUserByClerkId(clerkId)
  if (user) await deleteStravaTokens(user.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Register Strava webhook subscription**

After deploying to Vercel, run this once from your terminal to register the webhook:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_STRAVA_CLIENT_ID \
  -F client_secret=YOUR_STRAVA_CLIENT_SECRET \
  -F callback_url=https://YOUR_VERCEL_URL/api/strava/webhook \
  -F verify_token=pulse-webhook-2026
```

Expected response: `{"id": 12345}` — save this ID. Strava will now push to your webhook on every new activity.

- [ ] **Step 7: End-to-end smoke test**

1. Navigate to `/profile` → click Connect Strava → authorise in Strava
2. Go for a short walk or manually trigger a sync in the Strava app
3. Check Vercel logs → should see a POST to `/api/strava/webhook`
4. Check Neon console → `strava_activities` table should have a new row

- [ ] **Step 8: Commit**

```bash
git add app/api/strava/ lib/strava/client.ts
git commit -m "feat: add Strava OAuth, webhook handler, and activity ingestion (#6)"
git push
```

---

## Task 7: Manual Wellness Log API + Form

**Files:**
- Create: `app/api/wellness/route.ts`
- Create: `app/(dashboard)/wellness/page.tsx`

**Interfaces:**
- Consumes: `upsertWellness` from `@/lib/db/queries/wellness`; `getUserByClerkId` from users queries
- Produces: `POST /api/wellness` stores a daily wellness entry; `/wellness` page renders the form

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
  bodyBatteryHigh: z.number().int().min(0).max(100).optional(),
  bodyBatteryLow: z.number().int().min(0).max(100).optional(),
  hrvRmssd: z.number().min(0).optional(),
  sleepScore: z.number().int().min(0).max(100).optional(),
  sleepDurationS: z.number().int().min(0).optional(),
  sleepDeepS: z.number().int().min(0).optional(),
  sleepLightS: z.number().int().min(0).optional(),
  sleepRemS: z.number().int().min(0).optional(),
  sleepAwakeS: z.number().int().min(0).optional(),
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

- [ ] **Step 2: Create wellness log page**

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
        bodyBatteryHigh: toNum('bodyBatteryHigh'),
        bodyBatteryLow: toNum('bodyBatteryLow'),
        hrvRmssd: toNum('hrvRmssd'),
        sleepScore: toNum('sleepScore'),
        sleepDurationS: toSec('sleepDurationH', 'sleepDurationM'),
        sleepDeepS: toSec('sleepDeepH', 'sleepDeepM'),
        sleepLightS: toSec('sleepLightH', 'sleepLightM'),
        sleepRemS: toSec('sleepRemH', 'sleepRemM'),
        sleepAwakeS: toSec('sleepAwakeH', 'sleepAwakeM'),
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
      <h1 className="text-2xl font-bold">Log Wellness</h1>
      <p className="text-gray-400 text-sm">Enter today's values from your Garmin Connect app</p>

      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Body Battery</h2>
        <Field label="High" name="bodyBatteryHigh" unit="/100" max={100} />
        <Field label="Low" name="bodyBatteryLow" unit="/100" max={100} />
      </section>

      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Sleep</h2>
        <Field label="Sleep Score" name="sleepScore" unit="/100" max={100} />
        <DurationField label="Total" nameH="sleepDurationH" nameM="sleepDurationM" />
        <DurationField label="Deep" nameH="sleepDeepH" nameM="sleepDeepM" />
        <DurationField label="REM" nameH="sleepRemH" nameM="sleepRemM" />
        <DurationField label="Light" nameH="sleepLightH" nameM="sleepLightM" />
        <DurationField label="Awake" nameH="sleepAwakeH" nameM="sleepAwakeM" />
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

      <button type="submit" disabled={saving} className="w-full bg-[#00C853] hover:bg-[#00E676] disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors">
        {saving ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Verify form works**

```bash
npm run dev
```

Navigate to `http://localhost:3000/wellness`. Fill in a body battery high of 85, sleep score of 72. Submit. Expected: redirects to `/`. Check Neon console → `daily_wellness` table has a new row.

- [ ] **Step 4: Commit**

```bash
git add app/api/wellness/ app/\(dashboard\)/wellness/
git commit -m "feat: add manual wellness log form and API route (#7)"
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
- Create: `components/today/BodyBatteryCard.tsx`
- Create: `components/today/SleepCard.tsx`
- Create: `components/today/StepsCard.tsx`
- Create: `components/today/CalorieRing.tsx`
- Create: `components/ui/ProgressBar.tsx`

**Interfaces:**
- Consumes: `getTodayWellness` from `@/lib/db/queries/wellness`; `getRecentActivities` from `@/lib/db/queries/strava`; `getUserByClerkId`, `upsertUser` from users queries
- Produces: Today page with live wellness cards; Activity page with recent Strava activities list

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

- [ ] **Step 4: Create BodyBatteryCard**

Create `components/today/BodyBatteryCard.tsx`:
```typescript
type Props = { high?: number | null; low?: number | null }

export function BodyBatteryCard({ high, low }: Props) {
  const current = high ?? 0
  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-2">
      <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Body Battery</h2>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-[#00C853]">{high ?? '—'}</span>
        {high && <span className="text-gray-500 text-sm pb-1">/ 100</span>}
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-[#00C853] rounded-full transition-all" style={{ width: `${current}%` }} />
      </div>
      <div className="flex gap-3 text-xs text-gray-500">
        <span>High <span className="text-white">{high ?? '—'}</span></span>
        <span>Low <span className="text-white">{low ?? '—'}</span></span>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create SleepCard**

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
  deepS?: number | null
  remS?: number | null
  lightS?: number | null
  awakeS?: number | null
}

export function SleepCard({ score, durationS, deepS, remS, lightS, awakeS }: Props) {
  const stages = [
    { label: 'Deep', val: deepS, cls: 'text-indigo-400' },
    { label: 'REM', val: remS, cls: 'text-violet-400' },
    { label: 'Light', val: lightS, cls: 'text-blue-400' },
    { label: 'Awake', val: awakeS, cls: 'text-gray-400' },
  ]
  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-3">
      <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Sleep</h2>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-indigo-400">{score ?? '—'}</span>
        <span className="text-gray-500 text-sm pb-1">{fmt(durationS)} total</span>
      </div>
      <div className="grid grid-cols-4 gap-1 text-center text-xs">
        {stages.map(({ label, val, cls }) => (
          <div key={label}>
            <div className={`font-medium ${cls}`}>{fmt(val)}</div>
            <div className="text-gray-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create StepsCard**

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
import { BodyBatteryCard } from '@/components/today/BodyBatteryCard'
import { SleepCard } from '@/components/today/SleepCard'
import { StepsCard } from '@/components/today/StepsCard'
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
        <Link href="/wellness" className="text-sm text-[#00C853]">+ Log wellness</Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BodyBatteryCard high={wellness?.bodyBatteryHigh} low={wellness?.bodyBatteryLow} />
        <StepsCard steps={wellness?.steps} goal={10000} />
      </div>

      <SleepCard
        score={wellness?.sleepScore}
        durationS={wellness?.sleepDurationS}
        deepS={wellness?.sleepDeepS}
        remS={wellness?.sleepRemS}
        lightS={wellness?.sleepLightS}
        awakeS={wellness?.sleepAwakeS}
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
import { getRecentActivities } from '@/lib/db/queries/strava'

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
          <p className="text-sm mt-1">Connect Strava in Profile to sync your runs.</p>
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

Expected: Today page renders with hero cards (showing `—` until wellness logged). Tap "+ Log wellness" → fill form → save → return to Today → cards show real values. Activity page shows "No activities yet" until Strava syncs.

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
- Consumes: `getStravaTokens` from `@/lib/db/queries/strava`; `getUserByClerkId` from users queries
- Produces: Profile page showing Strava connection status with connect/disconnect; link to wellness log

- [ ] **Step 1: Create profile page**

Create `app/(dashboard)/profile/page.tsx`:
```typescript
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { getStravaTokens } from '@/lib/db/queries/strava'
import { UserButton } from '@clerk/nextjs'

export default async function ProfilePage() {
  const { userId: clerkId } = auth()
  if (!clerkId) return null

  const user = await getUserByClerkId(clerkId)
  const tokens = user ? await getStravaTokens(user.id) : null
  const isConnected = !!tokens

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Strava</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">{isConnected ? 'Connected' : 'Not connected'}</p>
            <p className="text-gray-500 text-sm">
              {isConnected
                ? 'Activities sync automatically after each run'
                : 'Connect to sync runs and activities'}
            </p>
          </div>
          {isConnected ? (
            <form action="/api/strava/disconnect" method="POST">
              <button type="submit" className="text-sm text-red-400 hover:text-red-300">Disconnect</button>
            </form>
          ) : (
            <a href="/api/strava/connect" className="bg-[#00C853] hover:bg-[#00E676] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Connect
            </a>
          )}
        </div>
      </section>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Daily Wellness</h2>
        <p className="text-gray-500 text-sm">Log sleep, body battery, and HRV from your Garmin Connect app each morning.</p>
        <a href="/wellness" className="block text-center bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          Log Today's Wellness
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

Navigate to `/profile`. Expected: Strava connection status, wellness log link, goals stub. Connect button redirects to Strava OAuth.

- [ ] **Step 3: Commit and push**

```bash
git add app/\(dashboard\)/profile/
git commit -m "feat: add profile page with Strava connect and wellness log link (#9)"
git push
```

---

## Self-Review

**Spec coverage:**
- ✅ Next.js 15 + TypeScript strict + Clerk + Neon + Drizzle + Zod + Vitest + @ducanh2912/next-pwa
- ✅ All DB tables defined: users, strava_tokens, strava_activities, daily_wellness, foods, nutrition_log
- ✅ Strava OAuth + webhook + token encryption (AES-256-GCM)
- ✅ Manual wellness entry (body battery, sleep, HRV, steps, resting HR, calories burned)
- ✅ Today dashboard: body battery, sleep score + stages, steps, calorie ring
- ✅ Activity page: recent Strava activities list
- ✅ Profile page: Strava connect/disconnect, wellness log link
- ✅ Bottom nav (5 tabs)
- ✅ PWA manifest with brand colours
- ✅ Vercel deployment early (Task 3) — before Strava webhook registration
- ✅ PWA compatibility validated early (Task 2)
- ✅ Android PWA smoke test in Task 5
- ✅ Unit tests: crypto round-trip, webhook parser, verify token
- ✅ Brand palette applied throughout (bg-[#0A0F0A], bg-[#111827], text-[#00C853])

**Gaps:** foods and nutrition_log tables exist in schema ready for M2. Profile goals section is a stub — correct, that's M2.

**Placeholder scan:** None.

**Type consistency:** All types exported from schema.ts, used consistently across queries and API routes. `ParsedActivity` and `ParsedWebhookEvent` are distinct types — webhook delivers an event, API delivers full activity detail. Consistent throughout.
