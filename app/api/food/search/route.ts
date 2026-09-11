import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// ponytail: module-level cache, resets on cold start; upgrade to KV/Redis if cold starts become frequent
const cache = new Map<string, { results: OFFResult[]; at: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

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

  const ql = q.toLowerCase()

  const cached = cache.get(ql)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    console.log('[food/search] cache hit:', ql)
    return NextResponse.json({ results: cached.results })
  }

  const user = process.env.OFF_USER
  const pass = process.env.OFF_PASS
  const fields = 'code,product_name,brands,nutriments,serving_size'
  const headers = { 'User-Agent': `Pulse/1.0 (${user ?? 'davidmcguinness76@gmail.com'})` }

  // Authenticated CGI search — credentials exempt from anonymous IP rate limits
  function buildUrl(term: string) {
    const base = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&fields=${fields}&page_size=50`
    return user && pass ? `${base}&user_id=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}` : base
  }

  async function cgiSearch(term: string) {
    const res = await fetch(buildUrl(term), { headers })
    console.log('[food/search] OFF status:', res.status, 'q:', term)
    const ct = res.headers.get('content-type') ?? ''
    if (!res.ok || !ct.includes('json')) return []
    const json = await res.json() as { products?: Record<string, unknown>[] }
    return json.products ?? []
  }

  let products = await cgiSearch(q)
  if (products.length === 0 && q.endsWith('s') && q.length > 3) {
    console.log('[food/search] 0 results, retrying singular')
    products = await cgiSearch(q.slice(0, -1))
  }
  console.log('[food/search] products returned:', products.length)

  // Split query into words; each word must appear in name or brand (case-insensitive)
  const words = ql.split(/\s+/).filter(Boolean)

  const seen = new Set<string>()
  const mapped: (OFFResult & { _score: number })[] = []
  for (const p of products) {
    const n = p.nutriments as Record<string, unknown> | undefined
    const kcal = n?.['energy-kcal_100g']
    const name = typeof p.product_name === 'string' ? p.product_name : ''
    const nl = name.toLowerCase()
    const brandl = (typeof p.brands === 'string' ? p.brands.split(',')[0].trim() : '').toLowerCase()
    const combined = `${nl} ${brandl}`
    if (!name) continue
    if (!n || kcal == null || Number(kcal) <= 0) continue
    if (!words.every(w => combined.includes(w))) continue
    const offId = p.code ? String(p.code) : name
    if (seen.has(offId)) continue
    seen.add(offId)
    const servingRaw = typeof p.serving_size === 'string' ? parseFloat(p.serving_size) : NaN
    mapped.push({
      _score: nl === ql ? 2 : nl.startsWith(words[0]) ? 1 : 0,
      offId,
      name,
      brand: typeof p.brands === 'string' ? p.brands.split(',')[0].trim() : undefined,
      caloriesPer100g: Math.round(Number(kcal)),
      proteinPer100g: Math.round(Number(n['proteins_100g'] ?? 0) * 10) / 10,
      carbsPer100g: Math.round(Number(n['carbohydrates_100g'] ?? 0) * 10) / 10,
      fatPer100g: Math.round(Number(n['fat_100g'] ?? 0) * 10) / 10,
      fibrePer100g: Math.round(Number(n['fiber_100g'] ?? 0) * 10) / 10,
      servingSizeG: isNaN(servingRaw) ? 100 : servingRaw,
    })
  }

  mapped.sort((a, b) => b._score - a._score)
  const results: OFFResult[] = mapped.slice(0, 8).map(({ _score: _, ...r }) => r)

  if (results.length > 0) cache.set(ql, { results, at: Date.now() })

  return NextResponse.json({ results })
}
