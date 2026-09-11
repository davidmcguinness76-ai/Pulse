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

type UsdaFood = {
  fdcId: number
  description: string
  brandOwner?: string
  brandName?: string
  servingSize?: number
  servingSizeUnit?: string
  foodNutrients: { nutrientId: number; value: number }[]
}

type UsdaResponse = { foods: UsdaFood[] }

function nutrient(food: UsdaFood, id: number): number {
  return food.foodNutrients.find(n => n.nutrientId === id)?.value ?? 0
}

function toResult(food: UsdaFood, ql: string): (OFFResult & { _score: number }) | null {
  const kcal = nutrient(food, 1008)
  if (!kcal) return null
  const name = food.description
  const nl = name.toLowerCase()
  if (!nl.includes(ql)) return null
  const servingG = food.servingSizeUnit?.toLowerCase() === 'g' ? (food.servingSize ?? 100) : 100
  return {
    _score: nl === ql ? 2 : nl.startsWith(ql) ? 1 : 0,
    offId: String(food.fdcId),
    name,
    brand: food.brandOwner ?? food.brandName,
    caloriesPer100g: Math.round(kcal),
    proteinPer100g: Math.round(nutrient(food, 1003) * 10) / 10,
    carbsPer100g: Math.round(nutrient(food, 1005) * 10) / 10,
    fatPer100g: Math.round(nutrient(food, 1004) * 10) / 10,
    fibrePer100g: Math.round(nutrient(food, 1079) * 10) / 10,
    servingSizeG: servingG,
  }
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

  const apiKey = process.env.USDA_API_KEY
  if (!apiKey) {
    console.error('[food/search] USDA_API_KEY not set')
    return NextResponse.json({ results: [] })
  }

  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(q)}&dataType=Branded,Foundation,SR%20Legacy&pageSize=50`
  const res = await fetch(url)
  console.log('[food/search] USDA status:', res.status, 'q:', q)

  if (!res.ok) return NextResponse.json({ results: [] })

  const data = await res.json() as UsdaResponse
  console.log('[food/search] USDA foods returned:', data.foods?.length ?? 0)

  const mapped = (data.foods ?? [])
    .map(f => toResult(f, ql))
    .filter((f): f is OFFResult & { _score: number } => f !== null)

  const seen = new Set<string>()
  const deduped = mapped.filter(f => {
    if (seen.has(f.offId)) return false
    seen.add(f.offId)
    return true
  })

  deduped.sort((a, b) => b._score - a._score)
  const results: OFFResult[] = deduped.slice(0, 8).map(({ _score: _, ...r }) => r)

  if (results.length > 0) cache.set(ql, { results, at: Date.now() })

  return NextResponse.json({ results })
}
