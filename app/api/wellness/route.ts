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
  const { userId: clerkId, sessionClaims } = await auth.protect()
  const body = await req.json()
  const parsed = WellnessSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  let user = await getUserByClerkId(clerkId)
  if (!user) user = await upsertUser(clerkId, sessionClaims?.email as string ?? '')

  await upsertWellness({ userId: user.id, source: 'manual', ...parsed.data })
  return NextResponse.json({ ok: true })
}
