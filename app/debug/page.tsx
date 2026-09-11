'use client'
import { useState, useEffect } from 'react'

const SECRET = 'pulse-debug'

type Product = { name: string; kcal: unknown; brand: string; namePass: boolean; kcalPass: boolean }

type StratResult = {
  label: string
  url: string
  status: number | null
  contentType: string
  products: Product[]
  rawCount: number
  namePassCount: number
  kcalPassCount: number
  error: string | null
}

type RawStratResult = {
  label: string
  url: string
  status: number | null
  contentType: string
  products: Record<string, unknown>[]
  error: string | null
}

type ApiResponse = {
  q: string
  results: RawStratResult[]
}

export default function DebugPage() {
  const [secret, setSecret] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<StratResult[]>([])
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
    const res = await fetch(`/api/food/debug?q=${encodeURIComponent(q.trim())}`)
    const data = await res.json() as ApiResponse
    const ql = q.trim().toLowerCase()
    const mapped: StratResult[] = data.results.map(r => {
      const products: Product[] = r.products.map(p => {
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
        ...r,
        products,
        rawCount: products.length,
        namePassCount: products.filter(p => p.namePass).length,
        kcalPassCount: products.filter(p => p.namePass && p.kcalPass).length,
      }
    })
    setResults(mapped)
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
