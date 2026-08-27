import { NextRequest, NextResponse } from 'next/server'
import { syncAllUsers } from '@/lib/intervals/sync'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await syncAllUsers()
  return NextResponse.json(result)
}
