'use client'
import { useState, useEffect } from 'react'

const SECRET = 'pulse-debug'
const FIELDS = 'code,product_name,brands,nutriments,serving_size'
const UA = 'Pulse/1.0 (davidmcguinness76@gmail.com)'

type RawProduct = Record<string, unknown>

type StratResult = {
  url: string
  status: number | null
  contentType: string
  rawCount: number
  namePassCount: number
  kcalPassCount: number
  products: { name: string; kcal: unknown; brand: string; namePass: boolean; kcalPass: boolean }[]
  error?: string
}

async function runStrategy(label: string, url: string, q: string): Promise<{ label: string } & StratResult> {
  const ql = q.toLowerCase()
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const contentType = res.headers.get('content-type') ?? ''
    let products: RawProduct[] = []
    if (res.ok && contentType.includes('json')) {
      const json = await res.json() as { products?: RawProduct[]; product?: RawProduct }
      products = json.products ?? (json.product ? [json.product] : [])
    }
    const mapped = products.map(p => {
      const n = p.nutriments as Record<string, unknown> | undefined
      const kcal = n?.['energy-kcal_100g']
      const name = typeof p.product_name === 'string' ? p.product_name : ''
      return {
        name,
        kcal,
        brand: typeof p.brands === 'string' ? p.brands.split(',')[0].trim() : '',
        namePass: name.toLowerCase().includes(ql),
        kcalPass: !!n && kcal != null && Number(kcal) > 0,
      }
    })
    return {
      label, url, status: res.status, contentType,
      rawCount: products.length,
      namePassCount: mapped.filter(p => p.namePass).length,
      kcalPassCount: mapped.filter(p => p.namePass && p.kcalPass).length,
      products: mapped,
    }
  } catch (e) {
    return { label, url, status: null, contentType: '', rawCount: 0, namePassCount: 0, kcalPassCount: 0, products: [], error: String(e) }
  }
}

function buildStrategies(q: string) {
  const enc = encodeURIComponent(q)
  return [
    {
      label: 'v2 search (current)',
      url: `https://world.openfoodfacts.org/api/v2/search?fields=${FIELDS}&search_terms=${enc}&page_size=50`,
    },
    {
      label: 'CGI search_simple=1',
      url: `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&fields=${FIELDS}&page_size=50`,
    },
    {
      label: 'CGI tag product_name',
      url: `https://world.openfoodfacts.org/cgi/search.pl?tagtype_0=product_name&tag_contains_0=contains&tag_0=${enc}&action=process&json=1&fields=${FIELDS}&page_size=50`,
    },
  ]
}

export default function DebugPage() {
  const [secret, setSecret] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<({ label: string } & StratResult)[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSecret(new URLSearchParams(window.location.search).get('secret') ?? '')
  }, [])

  if (secret === null) return null
  if (secret !== SECRET) {
    return <div className="p-8 text-white">Access denied. Add <code>?secret={SECRET}</code> to the URL.</div>
  }

  async function run() {
    if (!q.trim()) return
    setLoading(true)
    setResults([])
    const strats = buildStrategies(q.trim())
    const res = await Promise.all(strats.map(s => runStrategy(s.label, s.url, q.trim())))
    setResults(res)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white p-6 font-mono text-sm">
      <h1 className="text-lg font-bold mb-4 text-[#00C853]">OFF Search Debug</h1>
      <div className="flex gap-2 mb-6">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="Search term..."
          className="bg-[#111827] border border-gray-700 rounded px-3 py-2 w-64 text-white placeholder-gray-500 focus:outline-none focus:border-[#00C853]"
        />
        <button
          onClick={run}
          disabled={loading}
          className="bg-[#00C853] text-black px-4 py-2 rounded font-bold disabled:opacity-50"
        >
          {loading ? '...' : 'Run'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-8">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            {results.map(r => (
              <div key={r.label} className="bg-[#111827] rounded p-4 border border-gray-800">
                <div className="text-[#00C853] font-bold mb-2">{r.label}</div>
                <div className="text-gray-400 text-xs break-all mb-2">{r.url}</div>
                {r.error
                  ? <div className="text-red-400">{r.error}</div>
                  : <>
                    <div>HTTP: <span className={r.status === 200 ? 'text-green-400' : 'text-red-400'}>{r.status}</span></div>
                    <div>Content-Type: <span className="text-gray-300">{r.contentType.split(';')[0]}</span></div>
                    <div>Raw products: <span className="text-white font-bold">{r.rawCount}</span></div>
                    <div>Pass name filter: <span className="text-yellow-300 font-bold">{r.namePassCount}</span></div>
                    <div>Pass name+kcal: <span className="text-[#00C853] font-bold">{r.kcalPassCount}</span></div>
                  </>
                }
              </div>
            ))}
          </div>

          {/* Per-strategy product lists */}
          {results.map(r => (
            <div key={r.label}>
              <h2 className="text-[#00C853] font-bold mb-2">{r.label} — all {r.rawCount} products</h2>
              {r.products.length === 0
                ? <div className="text-gray-500">No products</div>
                : (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-800">
                        <th className="text-left py-1 pr-4">Name</th>
                        <th className="text-left py-1 pr-4">Brand</th>
                        <th className="text-right py-1 pr-4">kcal/100g</th>
                        <th className="text-center py-1 pr-2">Name?</th>
                        <th className="text-center py-1">Kcal?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.products.map((p, i) => (
                        <tr key={i} className={`border-b border-gray-900 ${p.namePass && p.kcalPass ? 'text-white' : 'text-gray-600'}`}>
                          <td className="py-1 pr-4 max-w-xs truncate">{p.name || <span className="italic">(empty)</span>}</td>
                          <td className="py-1 pr-4">{p.brand}</td>
                          <td className="py-1 pr-4 text-right">{p.kcal != null ? String(p.kcal) : '—'}</td>
                          <td className="py-1 pr-2 text-center">{p.namePass ? '✓' : '✗'}</td>
                          <td className="py-1 text-center">{p.kcalPass ? '✓' : '✗'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
