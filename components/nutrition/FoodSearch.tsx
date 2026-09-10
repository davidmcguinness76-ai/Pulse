'use client'
import { useState, useCallback, useRef } from 'react'
import type { OFFResult } from '@/app/api/food/search/route'
import type { MealGroup as MealGroupType } from '@/lib/db/queries/nutrition'
import { MealGroup } from '@/components/nutrition/MealGroup'
import { LogSheet } from '@/components/nutrition/LogSheet'

export function FoodSearch({ initialGroups }: { initialGroups: MealGroupType[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OFFResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<OFFResult | null>(null)
  const [groups, setGroups] = useState<MealGroupType[]>(initialGroups)
  const abortRef = useRef<AbortController | null>(null)

  const search = useCallback(async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setSearching(true)
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}`, { signal: abortRef.current.signal })
      if (!res.ok) { setResults([]); setSearching(false); return }
      const data = await res.json() as { results: OFFResult[] }
      setResults(data.results)
      setSearching(false)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setResults([])
      setSearching(false)
    }
  }, [])

  async function refreshLog() {
    const date = new Date().toISOString().split('T')[0]
    const res = await fetch(`/api/food/log?date=${date}`)
    const data = await res.json() as { groups: MealGroupType[] }
    setGroups(data.groups)
  }

  function handleDelete(id: string) {
    setGroups(prev => prev.map(g => ({
      ...g,
      entries: g.entries.filter(e => e.id !== id),
      totalCalories: g.entries.filter(e => e.id !== id).reduce((s, e) => s + e.calories, 0),
    })))
  }

  const totalConsumed = groups.reduce((s, g) => s + g.totalCalories, 0)
  const hasEntries = groups.some(g => g.entries.length > 0)

  return (
    <div className="space-y-4">
      {/* Search box */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search foods..."
          className="w-full bg-[#111827] rounded-2xl px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00C853]"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-3 top-3 text-gray-500 hover:text-white text-xl leading-none"
            aria-label="Clear search"
          >×</button>
        )}
        {searching && (
          <span className="absolute right-10 top-3.5 text-gray-500 text-sm">...</span>
        )}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="bg-[#111827] rounded-2xl divide-y divide-gray-800">
          {results.map(r => (
            <button
              key={r.offId}
              onClick={() => { setSelected(r); setQuery(''); setResults([]) }}
              className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors"
            >
              <p className="text-sm font-medium text-white">{r.name}</p>
              {r.brand && <p className="text-xs text-gray-500">{r.brand}</p>}
              <p className="text-xs text-gray-500">{r.caloriesPer100g} kcal / 100g</p>
            </button>
          ))}
        </div>
      )}
      {!searching && query.length >= 2 && results.length === 0 && (
        <p className="text-sm text-gray-500 px-1">No results for &ldquo;{query}&rdquo;</p>
      )}

      {/* Today's calorie total */}
      {hasEntries && (
        <div className="flex justify-between items-center px-1">
          <span className="text-sm text-gray-400">Today</span>
          <span className="text-sm font-semibold text-white">{totalConsumed} kcal consumed</span>
        </div>
      )}

      {/* Meal groups */}
      <div className="space-y-4">
        {groups.map(g => (
          <MealGroup key={g.category} group={g} onDelete={handleDelete} />
        ))}
      </div>

      {!hasEntries && results.length === 0 && !query && (
        <div className="bg-[#111827] rounded-2xl p-6 text-center text-gray-500 text-sm">
          Search for a food above to start logging.
        </div>
      )}

      {/* Log sheet */}
      {selected && (
        <LogSheet
          food={selected}
          onLog={async () => { setSelected(null); await refreshLog() }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
