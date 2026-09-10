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
