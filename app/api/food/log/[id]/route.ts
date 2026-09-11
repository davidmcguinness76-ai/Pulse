import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { deleteLogEntry, updateLogEntry } from '@/lib/db/queries/nutrition'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserByClerkId(clerkId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params
  const { quantityG, mealCategory, caloriesPer100g } = await req.json() as { quantityG: number; mealCategory: string; caloriesPer100g: number }
  await updateLogEntry(id, user.id, quantityG, mealCategory, caloriesPer100g)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await getUserByClerkId(clerkId)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params
  await deleteLogEntry(id, user.id)
  return NextResponse.json({ ok: true })
}
