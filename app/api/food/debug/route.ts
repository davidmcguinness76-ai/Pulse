import { NextResponse } from 'next/server'

const FIELDS = 'code,product_name,brands,nutriments,serving_size'
const UA = 'Pulse/1.0 (davidmcguinness76@gmail.com)'

type RawProduct = Record<string, unknown>

async function fetchStrategy(url: string) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const contentType = res.headers.get('content-type') ?? ''
    let products: RawProduct[] = []
    if (res.ok && contentType.includes('json')) {
      const json = await res.json() as { products?: RawProduct[] }
      products = json.products ?? []
    }
    return { status: res.status, contentType, products, error: null }
  } catch (e) {
    return { status: null, contentType: '', products: [] as RawProduct[], error: String(e) }
  }
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'missing q' }, { status: 400 })

  const enc = encodeURIComponent(q)
  const strategies = [
    { label: 'v2 search (current)', url: `https://world.openfoodfacts.org/api/v2/search?fields=${FIELDS}&search_terms=${enc}&page_size=50` },
    { label: 'CGI search_simple=1', url: `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&fields=${FIELDS}&page_size=50` },
    { label: 'CGI tag product_name', url: `https://world.openfoodfacts.org/cgi/search.pl?tagtype_0=product_name&tag_contains_0=contains&tag_0=${enc}&action=process&json=1&fields=${FIELDS}&page_size=50` },
  ]

  const results = await Promise.all(strategies.map(async s => {
    const r = await fetchStrategy(s.url)
    return { label: s.label, url: s.url, ...r }
  }))

  return NextResponse.json({ q, results })
}
