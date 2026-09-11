# Task 3 Brief: Profile Form — Height, Age, Sex

**Plan:** 2026-08-27-burn-breakdown-and-day-nav.md  
**Repo:** C:\Users\david\Documents\GitHub\Pulse  
**Base commit:** 08e1955

## Context

The `users` table already has `heightCm`, `age`, `sex`, `weightKg`, and `calorieGoal` columns. They are not yet exposed in the profile UI or API. This task:
1. Extends the profile API to accept all bio fields
2. Replaces `CalorieGoalForm` with a new `ProfileForm` that covers all fields
3. Updates the profile page to use `ProfileForm`
4. Deletes `components/CalorieGoalForm.tsx`

## File 1: `app/api/profile/route.ts` — replace entire file

```ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const ProfileSchema = z.object({
  calorieGoal: z.number().int().min(500).max(10000).optional(),
  heightCm: z.number().min(50).max(300).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  age: z.number().int().min(10).max(120).optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
})

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUserByClerkId(clerkId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const parsed = ProfileSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await db.update(users).set(parsed.data).where(eq(users.id, user.id))
  return NextResponse.json({ ok: true })
}
```

## File 2: `components/ProfileForm.tsx` — create new file

```tsx
'use client'
import { useState } from 'react'

type Props = {
  calorieGoal: number
  heightCm: number | null
  weightKg: number | null
  age: number | null
  sex: 'male' | 'female' | 'other' | null
}

export function ProfileForm({ calorieGoal, heightCm, weightKg, age, sex }: Props) {
  const [form, setForm] = useState({
    calorieGoal,
    heightCm: heightCm ?? '',
    weightKg: weightKg ?? '',
    age: age ?? '',
    sex: sex ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body: Record<string, unknown> = {}
    if (form.calorieGoal) body.calorieGoal = Number(form.calorieGoal)
    if (form.heightCm !== '') body.heightCm = Number(form.heightCm)
    if (form.weightKg !== '') body.weightKg = Number(form.weightKg)
    if (form.age !== '') body.age = Number(form.age)
    if (form.sex) body.sex = form.sex
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const row = (label: string, key: string, type: 'number' | 'text', unit?: string) => (
    <div className="flex items-center gap-3">
      <label className="text-gray-300 text-sm flex-1">{label}</label>
      <input
        type={type}
        value={form[key as keyof typeof form]}
        onChange={e => set(key, e.target.value)}
        className="w-24 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm text-right"
      />
      {unit && <span className="text-gray-500 text-sm w-6">{unit}</span>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {row('Daily calorie goal', 'calorieGoal', 'number', 'kcal')}
      {row('Height', 'heightCm', 'number', 'cm')}
      {row('Weight', 'weightKg', 'number', 'kg')}
      {row('Age', 'age', 'number', 'yrs')}
      <div className="flex items-center gap-3">
        <label className="text-gray-300 text-sm flex-1">Sex</label>
        <select
          value={form.sex}
          onChange={e => set('sex', e.target.value)}
          className="w-28 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm"
        >
          <option value="">—</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="pt-1">
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#00C853] hover:bg-[#00E676] disabled:opacity-50 text-black text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
```

## File 3: `app/(dashboard)/profile/page.tsx` — replace entire file

```tsx
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { UserButton } from '@clerk/nextjs'
import { SyncButton } from '@/components/SyncButton'
import { ProfileForm } from '@/components/ProfileForm'

export default async function ProfilePage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const user = await getUserByClerkId(clerkId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Intervals.icu Sync</h2>
        <SyncButton lastSyncedAt={user?.lastSyncedAt ?? null} />
      </section>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Daily Wellness</h2>
        <p className="text-gray-500 text-sm">Intervals.icu syncs sleep, HRV, steps and resting HR automatically. Override values if needed.</p>
        <a href="/wellness" className="block text-center bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          Override Today&apos;s Wellness
        </a>
      </section>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Goals &amp; Body</h2>
        <ProfileForm
          calorieGoal={user?.calorieGoal ?? 2300}
          heightCm={user?.heightCm ?? null}
          weightKg={user?.weightKg ?? null}
          age={user?.age ?? null}
          sex={user?.sex ?? null}
        />
      </section>
    </div>
  )
}
```

## File 4: Delete `components/CalorieGoalForm.tsx`

Run: `git rm components/CalorieGoalForm.tsx`

## Steps

- [ ] Read `app/api/profile/route.ts` then replace it
- [ ] Read `components/CalorieGoalForm.tsx` to confirm it exists, then `git rm` it
- [ ] Create `components/ProfileForm.tsx`
- [ ] Read `app/(dashboard)/profile/page.tsx` then replace it
- [ ] Run `npx tsc --noEmit` — fix any type errors
- [ ] Commit: `git add app/api/profile/route.ts components/ProfileForm.tsx app/(dashboard)/profile/page.tsx && git commit -m "feat: add height/age/sex to profile form and API (#5)"`

## Report

Write your full report to: `docs/superpowers/plans/burn-task-3-report.md`

Return only:
- Status: DONE / BLOCKED / NEEDS_CONTEXT
- Commit hash
- One-line test summary
- Any concerns
