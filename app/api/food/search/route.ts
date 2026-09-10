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

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=30&fields=code,product_name,brands,nutriments,serving_size`
  const res = await fetch(url, { headers: { 'User-Agent': 'Pulse/1.0 (davidmcguinness76@gmail.com)' } })
  if (!res.ok) return NextResponse.json({ results: [] })

  const data = await res.json() as { products?: Record<string, unknown>[] }
  const ql = q.toLowerCase()
  const mapped: (OFFResult & { _score: number })[] = (data.products ?? [])
    .filter((p): p is Record<string, unknown> => {
      const n = p.nutriments as Record<string, unknown> | undefined
      return typeof p.product_name === 'string' && p.product_name.length > 0 && n != null && typeof n['energy-kcal_100g'] === 'number'
    })
    .map(p => {
      const n = p.nutriments as Record<string, unknown>
      const servingRaw = typeof p.serving_size === 'string' ? parseFloat(p.serving_size) : NaN
      const name = String(p.product_name)
      const nl = name.toLowerCase()
      // exact match scores highest, starts-with next, contains last
      const _score = nl === ql ? 2 : nl.startsWith(ql) ? 1 : 0
      return {
        _score,
        offId: p.code ? String(p.code) : name,
        name,
        brand: typeof p.brands === 'string' ? p.brands.split(',')[0].trim() : undefined,
        caloriesPer100g: Math.round(Number(n['energy-kcal_100g'])),
        proteinPer100g: Math.round(Number(n['proteins_100g'] ?? 0) * 10) / 10,
        carbsPer100g: Math.round(Number(n['carbohydrates_100g'] ?? 0) * 10) / 10,
        fatPer100g: Math.round(Number(n['fat_100g'] ?? 0) * 10) / 10,
        fibrePer100g: Math.round(Number(n['fiber_100g'] ?? 0) * 10) / 10,
        servingSizeG: isNaN(servingRaw) ? 100 : servingRaw,
      }
    })
  mapped.sort((a, b) => b._score - a._score)
  const results: OFFResult[] = mapped.slice(0, 8).map(({ _score: _, ...r }) => r)

  return NextResponse.json({ results })
}
