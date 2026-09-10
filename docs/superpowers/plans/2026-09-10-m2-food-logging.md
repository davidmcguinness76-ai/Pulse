# M2 Food Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a food logging flow — search Open Food Facts, log by grams or count to a meal category, show today's log grouped by meal on the Food page, and wire consumed calories into the CalorieRing on Today.

**Architecture:** Open Food Facts is queried server-side via an API route to avoid CORS. First log of a food seeds it into the local `foods` table. `nutrition_log` rows snapshot calories at log time. The Food page is a client component (needs search interactivity); Today page stays server-rendered and reads the consumed total from the DB.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Neon Postgres, Open Food Facts REST API (no auth required), TypeScript strict, Tailwind CSS.

## Global Constraints

- All DB access via Drizzle queries in `lib/db/queries/` — no raw SQL in pages or API routes
- All API routes behind Clerk auth (`auth()` check, return 401 if no clerkId)
- Nutrients snapshotted at log time — do not reference `foods` table for historical calorie totals
- Mobile-first UI — thumb-friendly tap targets, no hover-only interactions
- Meal categories fixed: `breakfast | lunch | dinner | snacks`
- Default quantity input is grams; count mode available as a toggle per food item
- TypeScript strict — no `any`, no `!` assertions except where value is guaranteed non-null by prior guard
- Commit format: `feat: description (#7)` or `fix: description (#7)`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/db/schema.ts` | Modify | Add `mealCategoryEnum`; `nutrition_log` already has meal_category col — add it |
| `lib/db/queries/nutrition.ts` | Create | `logFood`, `getTodayLog`, `getTodayConsumedCalories` |
| `app/api/food/search/route.ts` | Create | Proxy Open Food Facts search, return cleaned results |
| `app/api/food/log/route.ts` | Create | POST to write a `nutrition_log` row |
| `app/api/food/log/[id]/route.ts` | Create | DELETE to remove a `nutrition_log` row |
| `app/api/food/log/route.ts` | Create | GET today's log (grouped) |
| `app/(dashboard)/nutrition/page.tsx` | Modify | Replace "Coming in M2" with full Food page |
| `components/nutrition/FoodSearch.tsx` | Create | Search input + results list (client component) |
| `components/nutrition/LogSheet.tsx` | Create | Quantity/category picker bottom sheet (client component) |
| `components/nutrition/MealGroup.tsx` | Create | One meal section with items + subtotal |
| `app/(dashboard)/page.tsx` | Modify | Pass real consumed calories to CalorieRing |

---

## Task 1: DB schema — add meal_category to nutrition_log

**Files:**
- Modify: `lib/db/schema.ts`

**Interfaces:**
- Produces: `mealCategoryEnum`, updated `nutritionLog` table type with `mealCategory` column, `NewNutritionLog` and `NutritionLog` types

- [ ] **Step 1: Add enum and column to schema**

In `lib/db/schema.ts`, add after the existing enum declarations:

```ts
export const mealCategoryEnum = pgEnum('meal_category', ['breakfast', 'lunch', 'dinner', 'snacks'])
```

Then add `mealCategory` to the `nutritionLog` table definition after `loggedAt`:

```ts
  mealCategory: mealCategoryEnum('meal_category').notNull().default('snacks'),
```

Also add at the bottom of the file:

```ts
export type NutritionLog = typeof nutritionLog.$inferSelect
export type NewNutritionLog = typeof nutritionLog.$inferInsert
```

- [ ] **Step 2: Push schema to DB**

```powershell
npx dotenv -e .env.local -- npx drizzle-kit push
```

Expected: "Changes applied" with the new enum and column listed. If `dotenv-cli` isn't installed: `npm install -D dotenv-cli` first.

- [ ] **Step 3: Commit**

```powershell
git add lib/db/schema.ts
git commit -m "feat: add meal_category to nutrition_log schema (#7)"
```

---

## Task 2: Nutrition DB queries

**Files:**
- Create: `lib/db/queries/nutrition.ts`

**Interfaces:**
- Consumes: `db`, `foods`, `nutritionLog`, `mealCategoryEnum`, `NutritionLog`, `NewNutritionLog` from schema
- Produces:
  - `logFood(data: LogFoodParams): Promise<void>`
  - `getTodayLog(userId: string, date: string): Promise<MealGroup[]>`
  - `getTodayConsumedCalories(userId: string, date: string): Promise<number>`
  - `deleteLogEntry(id: string, userId: string): Promise<void>`

```ts
// LogFoodParams shape:
type LogFoodParams = {
  userId: string
  date: string             // 'YYYY-MM-DD'
  mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  // food identity — either existing foodId or full food data to seed
  foodId?: string
  foodData?: {
    name: string
    brand?: string
    caloriesPer100g: number
    proteinPer100g: number
    carbsPer100g: number
    fatPer100g: number
    fibrePer100g: number
    servingSizeG: number   // used when logging by count
    source: 'open_food_facts' | 'manual'
    offId?: string         // Open Food Facts barcode/id
  }
  quantityG: number
}

// MealGroup shape (returned by getTodayLog):
type LogEntry = {
  id: string
  foodName: string
  brand?: string | null
  quantityG: number
  calories: number
}
type MealGroup = {
  category: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  entries: LogEntry[]
  totalCalories: number
}
```

- [ ] **Step 1: Write the query file**

Create `lib/db/queries/nutrition.ts`:

```ts
import { eq, and, sum } from 'drizzle-orm'
import { db } from '@/lib/db'
import { foods, nutritionLog } from '@/lib/db/schema'

export type LogFoodParams = {
  userId: string
  date: string
  mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  foodId?: string
  foodData?: {
    name: string
    brand?: string
    caloriesPer100g: number
    proteinPer100g: number
    carbsPer100g: number
    fatPer100g: number
    fibrePer100g: number
    servingSizeG: number
    source: 'open_food_facts' | 'manual'
  }
  quantityG: number
}

export type LogEntry = {
  id: string
  foodName: string
  brand: string | null
  quantityG: number
  calories: number
}

export type MealGroup = {
  category: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  entries: LogEntry[]
  totalCalories: number
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks'] as const

export async function logFood(params: LogFoodParams): Promise<void> {
  let foodId = params.foodId

  if (!foodId && params.foodData) {
    const fd = params.foodData
    const [inserted] = await db
      .insert(foods)
      .values({
        name: fd.name,
        brand: fd.brand,
        calories: fd.caloriesPer100g,
        proteinG: fd.proteinPer100g,
        carbsG: fd.carbsPer100g,
        fatG: fd.fatPer100g,
        fibreG: fd.fibrePer100g,
        servingSizeG: fd.servingSizeG,
        servingUnit: 'g',
        source: fd.source,
        verifiedByUser: false,
      })
      .onConflictDoNothing()
      .returning({ id: foods.id })

    if (inserted) {
      foodId = inserted.id
    } else {
      // food already existed (race) — look it up
      const existing = await db.query.foods.findFirst({ where: eq(foods.name, fd.name) })
      foodId = existing!.id
    }
  }

  if (!foodId) throw new Error('logFood: no foodId and no foodData provided')

  const food = await db.query.foods.findFirst({ where: eq(foods.id, foodId) })
  if (!food) throw new Error(`logFood: food ${foodId} not found`)

  const caloriesPer100g = food.calories ?? 0
  const calories = Math.round((params.quantityG / 100) * caloriesPer100g)
  const proteinG = food.proteinG ? Math.round((params.quantityG / 100) * food.proteinG * 10) / 10 : null
  const carbsG = food.carbsG ? Math.round((params.quantityG / 100) * food.carbsG * 10) / 10 : null
  const fatG = food.fatG ? Math.round((params.quantityG / 100) * food.fatG * 10) / 10 : null
  const fibreG = food.fibreG ? Math.round((params.quantityG / 100) * food.fibreG * 10) / 10 : null

  await db.insert(nutritionLog).values({
    userId: params.userId,
    foodId,
    loggedAt: params.date,
    mealCategory: params.mealCategory,
    quantityG: params.quantityG,
    calories,
    proteinG,
    carbsG,
    fatG,
    fibreG,
  })
}

export async function getTodayLog(userId: string, date: string): Promise<MealGroup[]> {
  const rows = await db
    .select({
      id: nutritionLog.id,
      mealCategory: nutritionLog.mealCategory,
      quantityG: nutritionLog.quantityG,
      calories: nutritionLog.calories,
      foodName: foods.name,
      brand: foods.brand,
    })
    .from(nutritionLog)
    .innerJoin(foods, eq(nutritionLog.foodId, foods.id))
    .where(and(eq(nutritionLog.userId, userId), eq(nutritionLog.loggedAt, date)))

  const grouped = new Map<string, LogEntry[]>()
  for (const cat of MEAL_ORDER) grouped.set(cat, [])

  for (const row of rows) {
    const cat = row.mealCategory ?? 'snacks'
    grouped.get(cat)!.push({
      id: row.id,
      foodName: row.foodName,
      brand: row.brand,
      quantityG: row.quantityG ?? 0,
      calories: row.calories ?? 0,
    })
  }

  return MEAL_ORDER.map(cat => {
    const entries = grouped.get(cat)!
    return {
      category: cat,
      entries,
      totalCalories: entries.reduce((s, e) => s + e.calories, 0),
    }
  })
}

export async function getTodayConsumedCalories(userId: string, date: string): Promise<number> {
  const result = await db
    .select({ total: sum(nutritionLog.calories) })
    .from(nutritionLog)
    .where(and(eq(nutritionLog.userId, userId), eq(nutritionLog.loggedAt, date)))
  return Number(result[0]?.total ?? 0)
}

export async function deleteLogEntry(id: string, userId: string): Promise<void> {
  await db
    .delete(nutritionLog)
    .where(and(eq(nutritionLog.id, id), eq(nutritionLog.userId, userId)))
}
```

- [ ] **Step 2: Commit**

```powershell
git add lib/db/queries/nutrition.ts
git commit -m "feat: nutrition DB queries — logFood, getTodayLog, getTodayConsumedCalories (#7)"
```

---

## Task 3: Open Food Facts search API route

**Files:**
- Create: `app/api/food/search/route.ts`

**Interfaces:**
- Produces: `GET /api/food/search?q=<query>` → `{ results: OFFResult[] }`

```ts
type OFFResult = {
  offId: string       // barcode or OFF id
  name: string
  brand?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fibrePer100g: number
  servingSizeG: number  // defaults to 100 if not provided
}
```

- [ ] **Step 1: Create the route**

Create `app/api/food/search/route.ts`:

```ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export type OFFResult = {
  offId: string
  name: string
  brand?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fibrePer100g: number
  servingSizeG: number
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=code,product_name,brands,nutriments,serving_size`
  const res = await fetch(url, { headers: { 'User-Agent': 'Pulse/1.0 (davidmcguinness76@gmail.com)' } })
  if (!res.ok) return NextResponse.json({ results: [] })

  const data = await res.json() as { products?: Record<string, unknown>[] }
  const results: OFFResult[] = (data.products ?? [])
    .filter((p): p is Record<string, unknown> => {
      const n = p.nutriments as Record<string, unknown> | undefined
      return typeof p.product_name === 'string' && p.product_name.length > 0 && n != null && typeof n['energy-kcal_100g'] === 'number'
    })
    .map(p => {
      const n = p.nutriments as Record<string, unknown>
      const servingRaw = typeof p.serving_size === 'string' ? parseFloat(p.serving_size) : NaN
      return {
        offId: String(p.code ?? ''),
        name: String(p.product_name),
        brand: typeof p.brands === 'string' ? p.brands.split(',')[0].trim() : undefined,
        caloriesPer100g: Math.round(Number(n['energy-kcal_100g'])),
        proteinPer100g: Math.round(Number(n['proteins_100g'] ?? 0) * 10) / 10,
        carbsPer100g: Math.round(Number(n['carbohydrates_100g'] ?? 0) * 10) / 10,
        fatPer100g: Math.round(Number(n['fat_100g'] ?? 0) * 10) / 10,
        fibrePer100g: Math.round(Number(n['fiber_100g'] ?? 0) * 10) / 10,
        servingSizeG: isNaN(servingRaw) ? 100 : servingRaw,
      }
    })
    .slice(0, 8)

  return NextResponse.json({ results })
}
```

- [ ] **Step 2: Commit**

```powershell
git add app/api/food/search/route.ts
git commit -m "feat: Open Food Facts search API route (#7)"
```

---

## Task 4: Log and delete API routes

**Files:**
- Create: `app/api/food/log/route.ts`
- Create: `app/api/food/log/[id]/route.ts`

**Interfaces:**
- Consumes: `logFood`, `getTodayLog`, `deleteLogEntry` from `lib/db/queries/nutrition`
- Produces:
  - `POST /api/food/log` body: `{ mealCategory, foodData, quantityG, date }` → `{ ok: true }`
  - `GET /api/food/log?date=YYYY-MM-DD` → `{ groups: MealGroup[] }`
  - `DELETE /api/food/log/:id` → `{ ok: true }`

- [ ] **Step 1: Create POST/GET route**

Create `app/api/food/log/route.ts`:

```ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { logFood, getTodayLog, type LogFoodParams } from '@/lib/db/queries/nutrition'

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserByClerkId(clerkId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json() as Omit<LogFoodParams, 'userId'>
  await logFood({ ...body, userId: user.id })
  return NextResponse.json({ ok: true })
}

export async function GET(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserByClerkId(clerkId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const date = new URL(req.url).searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const groups = await getTodayLog(user.id, date)
  return NextResponse.json({ groups })
}
```

- [ ] **Step 2: Create DELETE route**

Create `app/api/food/log/[id]/route.ts`:

```ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { deleteLogEntry } from '@/lib/db/queries/nutrition'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserByClerkId(clerkId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params
  await deleteLogEntry(id, user.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```powershell
git add app/api/food/log/route.ts "app/api/food/log/[id]/route.ts"
git commit -m "feat: food log POST/GET/DELETE API routes (#7)"
```

---

## Task 5: MealGroup display component

**Files:**
- Create: `components/nutrition/MealGroup.tsx`

**Interfaces:**
- Consumes: `MealGroup` type from `lib/db/queries/nutrition`
- Produces: `<MealGroup group={MealGroup} onDelete={(id) => void} />` client component

- [ ] **Step 1: Create component**

Create `components/nutrition/MealGroup.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { MealGroup as MealGroupType } from '@/lib/db/queries/nutrition'

const LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }

export function MealGroup({ group, onDelete }: { group: MealGroupType; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState<string | null>(null)

  if (group.entries.length === 0) return null

  async function handleDelete(id: string) {
    setDeleting(id)
    await fetch(`/api/food/log/${id}`, { method: 'DELETE' })
    onDelete(id)
    setDeleting(null)
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline px-1">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{LABELS[group.category]}</span>
        <span className="text-xs text-gray-500">{group.totalCalories} kcal</span>
      </div>
      <div className="bg-[#111827] rounded-2xl divide-y divide-gray-800">
        {group.entries.map(entry => (
          <div key={entry.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{entry.foodName}</p>
              {entry.brand && <p className="text-xs text-gray-500 truncate">{entry.brand}</p>}
              <p className="text-xs text-gray-500">{entry.quantityG}g · {entry.calories} kcal</p>
            </div>
            <button
              onClick={() => handleDelete(entry.id)}
              disabled={deleting === entry.id}
              className="ml-3 text-gray-600 hover:text-red-400 transition-colors text-lg disabled:opacity-30"
              aria-label="Delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
git add components/nutrition/MealGroup.tsx
git commit -m "feat: MealGroup display component with delete (#7)"
```

---

## Task 6: LogSheet — quantity and category picker

**Files:**
- Create: `components/nutrition/LogSheet.tsx`

**Interfaces:**
- Consumes: `OFFResult` from `app/api/food/search/route`
- Produces: `<LogSheet food={OFFResult} onLog={() => void} onClose={() => void} />` client component

- [ ] **Step 1: Create component**

Create `components/nutrition/LogSheet.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { OFFResult } from '@/app/api/food/search/route'

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const
type Meal = typeof MEALS[number]
const MEAL_LABELS: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }

function guessCurrentMeal(): Meal {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 14) return 'lunch'
  if (h < 20) return 'dinner'
  return 'snacks'
}

export function LogSheet({ food, onLog, onClose }: { food: OFFResult; onLog: () => void; onClose: () => void }) {
  const [meal, setMeal] = useState<Meal>(guessCurrentMeal())
  const [useCount, setUseCount] = useState(false)
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)

  const servingSizeG = food.servingSizeG ?? 100
  const quantityG = useCount ? (parseFloat(qty) || 0) * servingSizeG : parseFloat(qty) || 0
  const previewKcal = quantityG > 0 ? Math.round((quantityG / 100) * food.caloriesPer100g) : null

  async function handleLog() {
    if (quantityG <= 0) return
    setSaving(true)
    await fetch('/api/food/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mealCategory: meal,
        date: new Date().toISOString().split('T')[0],
        quantityG,
        foodData: {
          name: food.name,
          brand: food.brand,
          caloriesPer100g: food.caloriesPer100g,
          proteinPer100g: food.proteinPer100g,
          carbsPer100g: food.carbsPer100g,
          fatPer100g: food.fatPer100g,
          fibrePer100g: food.fibrePer100g,
          servingSizeG,
          source: 'open_food_facts',
        },
      }),
    })
    setSaving(false)
    onLog()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full bg-[#111827] rounded-t-2xl p-5 space-y-4 max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
        <div>
          <p className="font-semibold text-white">{food.name}</p>
          {food.brand && <p className="text-sm text-gray-400">{food.brand}</p>}
          <p className="text-xs text-gray-500 mt-0.5">{food.caloriesPer100g} kcal / 100g</p>
        </div>

        {/* Meal picker */}
        <div className="grid grid-cols-4 gap-1">
          {MEALS.map(m => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${meal === m ? 'bg-[#00C853] text-black' : 'bg-gray-800 text-gray-400'}`}
            >
              {MEAL_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Quantity</label>
            <button
              onClick={() => { setUseCount(c => !c); setQty('') }}
              className="text-xs text-[#00C853]"
            >
              Switch to {useCount ? 'grams' : 'count'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder={useCount ? 'count' : 'grams'}
              className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-white text-lg text-right focus:outline-none focus:ring-1 focus:ring-[#00C853]"
              autoFocus
            />
            <span className="text-gray-400 text-sm w-8">{useCount ? '×' : 'g'}</span>
          </div>
          {previewKcal !== null && (
            <p className="text-sm text-[#00C853] text-right">{previewKcal} kcal</p>
          )}
        </div>

        <button
          onClick={handleLog}
          disabled={saving || quantityG <= 0}
          className="w-full bg-[#00C853] hover:bg-[#00E676] disabled:opacity-40 text-black font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? 'Logging...' : 'Log'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
git add components/nutrition/LogSheet.tsx
git commit -m "feat: LogSheet quantity and meal category picker (#7)"
```

---

## Task 7: FoodSearch component

**Files:**
- Create: `components/nutrition/FoodSearch.tsx`

**Interfaces:**
- Consumes: `OFFResult` from `app/api/food/search/route`, `LogSheet`, `MealGroup`
- Produces: `<FoodSearch initialGroups={MealGroup[]} />` — self-contained client component managing search + log state

- [ ] **Step 1: Create component**

Create `components/nutrition/FoodSearch.tsx`:

```tsx
'use client'
import { useState, useCallback } from 'react'
import type { OFFResult } from '@/app/api/food/search/route'
import type { MealGroup as MealGroupType } from '@/lib/db/queries/nutrition'
import { MealGroup } from '@/components/nutrition/MealGroup'
import { LogSheet } from '@/components/nutrition/LogSheet'

export function FoodSearch({ initialGroups }: { initialGroups: MealGroupType[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OFFResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<OFFResult | null>(null)
  const [groups, setGroups] = useState<MealGroupType[]>(initialGroups)

  const search = useCallback(async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}`)
    const data = await res.json() as { results: OFFResult[] }
    setResults(data.results)
    setSearching(false)
  }, [])

  async function refreshLog() {
    const date = new Date().toISOString().split('T')[0]
    const res = await fetch(`/api/food/log?date=${date}`)
    const data = await res.json() as { groups: MealGroupType[] }
    setGroups(data.groups)
  }

  function handleDelete(id: string) {
    setGroups(prev => prev.map(g => ({
      ...g,
      entries: g.entries.filter(e => e.id !== id),
      totalCalories: g.entries.filter(e => e.id !== id).reduce((s, e) => s + e.calories, 0),
    })))
  }

  const totalConsumed = groups.reduce((s, g) => s + g.totalCalories, 0)
  const hasEntries = groups.some(g => g.entries.length > 0)

  return (
    <div className="space-y-4">
      {/* Search box */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search foods..."
          className="w-full bg-[#111827] rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00C853]"
        />
        {searching && (
          <span className="absolute right-4 top-3.5 text-gray-500 text-sm">...</span>
        )}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="bg-[#111827] rounded-2xl divide-y divide-gray-800">
          {results.map(r => (
            <button
              key={r.offId}
              onClick={() => { setSelected(r); setQuery(''); setResults([]) }}
              className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors"
            >
              <p className="text-sm font-medium text-white">{r.name}</p>
              {r.brand && <p className="text-xs text-gray-500">{r.brand}</p>}
              <p className="text-xs text-gray-500">{r.caloriesPer100g} kcal / 100g</p>
            </button>
          ))}
        </div>
      )}

      {/* Today's calorie total */}
      {hasEntries && (
        <div className="flex justify-between items-center px-1">
          <span className="text-sm text-gray-400">Today</span>
          <span className="text-sm font-semibold text-white">{totalConsumed} kcal consumed</span>
        </div>
      )}

      {/* Meal groups */}
      <div className="space-y-4">
        {groups.map(g => (
          <MealGroup key={g.category} group={g} onDelete={handleDelete} />
        ))}
      </div>

      {!hasEntries && results.length === 0 && !query && (
        <div className="bg-[#111827] rounded-2xl p-6 text-center text-gray-500 text-sm">
          Search for a food above to start logging.
        </div>
      )}

      {/* Log sheet */}
      {selected && (
        <LogSheet
          food={selected}
          onLog={async () => { setSelected(null); await refreshLog() }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
git add components/nutrition/FoodSearch.tsx
git commit -m "feat: FoodSearch client component with search results and today log (#7)"
```

---

## Task 8: Wire up Nutrition page

**Files:**
- Modify: `app/(dashboard)/nutrition/page.tsx`

**Interfaces:**
- Consumes: `FoodSearch`, `getTodayLog`, `auth`, `getUserByClerkId`, `redirect`

- [ ] **Step 1: Replace the placeholder page**

Replace entire contents of `app/(dashboard)/nutrition/page.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { getTodayLog } from '@/lib/db/queries/nutrition'
import { FoodSearch } from '@/components/nutrition/FoodSearch'

export default async function NutritionPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getUserByClerkId(clerkId)
  if (!user) redirect('/sign-in')

  const today = new Date().toISOString().split('T')[0]
  const groups = await getTodayLog(user.id, today)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Log Food</h1>
      <FoodSearch initialGroups={groups} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
git add "app/(dashboard)/nutrition/page.tsx"
git commit -m "feat: wire up Nutrition page with food search and today log (#7)"
```

---

## Task 9: Wire consumed calories into Today page

**Files:**
- Modify: `app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `getTodayConsumedCalories` from `lib/db/queries/nutrition`

- [ ] **Step 1: Add consumed calories query**

In `app/(dashboard)/page.tsx`, add the import:

```ts
import { getTodayConsumedCalories } from '@/lib/db/queries/nutrition'
```

Then extend the `Promise.all` to include the consumed total:

```ts
  const [wellness, activitySummary, consumed] = await Promise.all([
    getTodayWellness(user.id, date),
    getDayActivitySummary(user.id, date),
    getTodayConsumedCalories(user.id, date),
  ])
```

Then update the `CalorieRing` call to pass the real value (replacing `consumed={0}`):

```tsx
      <CalorieRing
        consumed={consumed}
        goal={user.calorieGoal ?? 2300}
        burned={burned}
        breakdown={breakdown ?? undefined}
      />
```

- [ ] **Step 2: Commit**

```powershell
git add "app/(dashboard)/page.tsx"
git commit -m "feat: wire real consumed calories into CalorieRing on Today page (#7)"
```

---

## Task 10: Close ticket and verify

- [ ] **Step 1: Check the app works end to end**

Open https://pulse-livid-two.vercel.app/nutrition — search "banana", tap a result, enter 62g for Breakfast, tap Log. Confirm it appears in the Breakfast group with correct kcal. Tap × to delete. Confirm it disappears.

Open https://pulse-livid-two.vercel.app — confirm CalorieRing shows the logged calories in "eaten".

- [ ] **Step 2: Close ticket**

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" issue close 7 --repo davidmcguinness76-ai/Pulse --comment "M2 food logging shipped: OFf search, log by grams/count, meal categories, delete, consumed calories wired into CalorieRing."
```
