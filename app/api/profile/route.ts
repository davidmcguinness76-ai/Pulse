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
