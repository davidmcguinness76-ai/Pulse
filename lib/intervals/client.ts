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
