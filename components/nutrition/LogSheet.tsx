'use client'
import { useState } from 'react'
import type { OFFResult } from '@/app/api/food/search/route'

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const
type Meal = typeof MEALS[number]
const MEAL_LABELS: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }

function guessCurrentMeal(): Meal {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 14) return 'lunch'
  if (h < 20) return 'dinner'
  return 'snacks'
}

export function LogSheet({ food, onLog, onClose }: { food: OFFResult; onLog: () => void; onClose: () => void }) {
  const [meal, setMeal] = useState<Meal>(guessCurrentMeal())
  const [useCount, setUseCount] = useState(false)
  const [qty, setQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const servingSizeG = food.servingSizeG ?? 100
  const quantityG = useCount ? (parseFloat(qty) || 0) * servingSizeG : parseFloat(qty) || 0
  const previewKcal = quantityG > 0 ? Math.round((quantityG / 100) * food.caloriesPer100g) : null

  async function handleLog() {
    if (quantityG <= 0) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/food/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mealCategory: meal,
        date: new Date().toISOString().split('T')[0],
        quantityG,
        foodData: {
          name: food.name,
          brand: food.brand,
          offId: food.offId,
          caloriesPer100g: food.caloriesPer100g,
          proteinPer100g: food.proteinPer100g,
          carbsPer100g: food.carbsPer100g,
          fatPer100g: food.fatPer100g,
          fibrePer100g: food.fibrePer100g,
          servingSizeG,
          source: 'open_food_facts',
        },
      }),
    })
    setSaving(false)
    if (!res.ok) { setError('Failed to log food. Please try again.'); return }
    onLog()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full bg-[#111827] rounded-t-2xl p-5 space-y-4 max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
        <div>
          <p className="font-semibold text-white">{food.name}</p>
          {food.brand && <p className="text-sm text-gray-400">{food.brand}</p>}
          <p className="text-xs text-gray-500 mt-0.5">{food.caloriesPer100g} kcal / 100g</p>
        </div>

        {/* Meal picker */}
        <div className="grid grid-cols-4 gap-1">
          {MEALS.map(m => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${meal === m ? 'bg-[#00C853] text-black' : 'bg-gray-800 text-gray-400'}`}
            >
              {MEAL_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Quantity</label>
            <button
              onClick={() => { setUseCount(c => !c); setQty('') }}
              className="text-xs text-[#00C853]"
            >
              Switch to {useCount ? 'grams' : 'count'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder={useCount ? 'count' : 'grams'}
              className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-white text-lg text-right focus:outline-none focus:ring-1 focus:ring-[#00C853]"
              autoFocus
            />
            <span className="text-gray-400 text-sm w-8">{useCount ? '×' : 'g'}</span>
          </div>
          {previewKcal !== null && (
            <p className="text-sm text-[#00C853] text-right">{previewKcal} kcal</p>
          )}
        </div>

        <button
          onClick={handleLog}
          disabled={saving || quantityG <= 0}
          className="w-full bg-[#00C853] hover:bg-[#00E676] disabled:opacity-40 text-black font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? 'Logging...' : 'Log'}
        </button>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    </div>
  )
}
