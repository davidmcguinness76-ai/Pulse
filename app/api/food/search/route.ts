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

  // Two parallel requests:
  // 1. Tag search — product_name field only (exact name-field match, finds raw/generic foods)
  // 2. Broad search — all fields, large page, we post-filter to name-contains
  const tagUrl = `https://world.openfoodfacts.org/cgi/search.pl?tagtype_0=product_name&tag_contains_0=contains&tag_0=${encodeURIComponent(q)}&action=process&json=1&page_size=30&fields=${fields}`
  const broadUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=50&fields=${fields}`

  const [tagRes, broadRes] = await Promise.all([
    fetch(tagUrl, { headers }).then(r => r.ok ? r.json() as Promise<{ products?: Record<string, unknown>[] }> : { products: [] }),
    fetch(broadUrl, { headers }).then(r => r.ok ? r.json() as Promise<{ products?: Record<string, unknown>[] }> : { products: [] }),
  ])

  // Merge: tag results first (higher quality), then broad, dedupe by offId
  const allProducts = [...(tagRes.products ?? []), ...(broadRes.products ?? [])]

  function toResult(p: Record<string, unknown>, bonus: number): (OFFResult & { _score: number }) | null {
    const n = p.nutriments as Record<string, unknown> | undefined
    const kcal = n?.['energy-kcal_100g']
    if (typeof p.product_name !== 'string' || !p.product_name) return null
    if (!n || !kcal || Number(kcal) <= 0) return null
    const name = p.product_name
    const nl = name.toLowerCase()
    if (!nl.includes(ql)) return null  // post-filter: name must contain query
    const _score = bonus + (nl === ql ? 2 : nl.startsWith(ql) ? 1 : 0)
    const servingRaw = typeof p.serving_size === 'string' ? parseFloat(p.serving_size) : NaN
    return {
      _score,
      offId: p.code ? String(p.code) : name,
      name,
      brand: typeof p.brands === 'string' ? p.brands.split(',')[0].trim() : undefined,
      caloriesPer100g: Math.round(Number(kcal)),
      proteinPer100g: Math.round(Number(n['proteins_100g'] ?? 0) * 10) / 10,
      carbsPer100g: Math.round(Number(n['carbohydrates_100g'] ?? 0) * 10) / 10,
      fatPer100g: Math.round(Number(n['fat_100g'] ?? 0) * 10) / 10,
      fibrePer100g: Math.round(Number(n['fiber_100g'] ?? 0) * 10) / 10,
      servingSizeG: isNaN(servingRaw) ? 100 : servingRaw,
    }
  }

  const seen = new Set<string>()
  const mapped: (OFFResult & { _score: number })[] = []
  // Tag results get +3 bonus so they sort above broad results with same name match
  const tagCount = (tagRes.products ?? []).length
  for (let i = 0; i < allProducts.length; i++) {
    const bonus = i < tagCount ? 3 : 0
    const r = toResult(allProducts[i], bonus)
    if (!r) continue
    if (seen.has(r.offId)) continue
    seen.add(r.offId)
    mapped.push(r)
  }

  mapped.sort((a, b) => b._score - a._score)
  const results: OFFResult[] = mapped.slice(0, 8).map(({ _score: _, ...r }) => r)

  return NextResponse.json({ results })
}
