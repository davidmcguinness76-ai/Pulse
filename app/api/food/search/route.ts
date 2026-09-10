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

  const headers = { 'User-Agent': 'Pulse/1.0 (davidmcguinness76@gmail.com)' }
  const ql = q.toLowerCase()
  const fields = 'code,product_name,brands,nutriments,serving_size'

  // Broad search — fetch 50, post-filter to product name contains query, re-rank
  const broadUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=50&fields=${fields}`
  const rawRes = await fetch(broadUrl, { headers })
  console.log('[food/search] OFF status:', rawRes.status, 'q:', q)
  const broadRes = rawRes.ok ? await rawRes.json() as { products?: Record<string, unknown>[] } : { products: [] }
  console.log('[food/search] OFF products returned:', broadRes.products?.length ?? 0)

  const seen = new Set<string>()
  const mapped: (OFFResult & { _score: number })[] = []
  for (const p of (broadRes.products ?? [])) {
    const n = p.nutriments as Record<string, unknown> | undefined
    const kcal = n?.['energy-kcal_100g']
    const name = typeof p.product_name === 'string' ? p.product_name : ''
    const nl = name.toLowerCase()
    const passesName = nl.includes(ql)
    const passesKcal = !!n && kcal != null && Number(kcal) > 0
    console.log(`[food/search]  "${name}" | kcal=${kcal} | nameMatch=${passesName} | kcalOk=${passesKcal}`)
    if (!name) continue
    if (!passesKcal) continue
    if (!passesName) continue
    const offId = p.code ? String(p.code) : name
    if (seen.has(offId)) continue
    seen.add(offId)
    const _score = nl === ql ? 2 : nl.startsWith(ql) ? 1 : 0
    const servingRaw = typeof p.serving_size === 'string' ? parseFloat(p.serving_size) : NaN
    mapped.push({
      _score,
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

  return NextResponse.json({ results })
}
