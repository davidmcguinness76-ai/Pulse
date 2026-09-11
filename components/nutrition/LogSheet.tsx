'use client'
import { useState } from 'react'
import type { OFFResult } from '@/app/api/food/search/route'

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const
type Meal = typeof MEALS[number]
const MEAL_LABELS: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }

export function LogSheet({ food, suggestedMeal, initialQty, editId, caloriesPer100g: editKcal100, onLog, onClose }: {
  food: OFFResult
  suggestedMeal: Meal
  initialQty?: string
  editId?: string
  caloriesPer100g?: number
  onLog: (meal: Meal) => void
  onClose: () => void
}) {
  const [meal, setMeal] = useState<Meal>(suggestedMeal)
  const [qty, setQty] = useState(initialQty ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kcal100 = editKcal100 ?? food.caloriesPer100g
  const quantityG = parseFloat(qty) || 0
  const previewKcal = quantityG > 0 ? Math.round((quantityG / 100) * kcal100) : null

  async function handleSave() {
    if (quantityG <= 0) return
    setSaving(true)
    setError(null)

    if (editId) {
      const res = await fetch(`/api/food/log/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityG, mealCategory: meal, caloriesPer100g: kcal100 }),
      })
      setSaving(false)
      if (!res.ok) { setError('Failed to update. Please try again.'); return }
      onLog(meal)
      return
    }

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
          servingSizeG: food.servingSizeG ?? 100,
          source: 'open_food_facts',
        },
      }),
    })
    setSaving(false)
    if (!res.ok) { setError('Failed to log food. Please try again.'); return }
    onLog(meal)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full bg-[#111827] rounded-t-2xl p-5 space-y-4 max-w-lg mx-auto" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-lg font-semibold text-white">{food.name}</p>
          {food.brand && <p className="text-base text-gray-400">{food.brand}</p>}
          <p className="text-sm text-gray-500 mt-0.5">{kcal100} kcal / 100g</p>
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

        {/* Quantity — always grams in edit mode */}
        <div className="space-y-2">
          <label className="text-base text-gray-400">Quantity (grams)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder="grams"
              className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-white text-lg text-right focus:outline-none focus:ring-1 focus:ring-[#00C853]"
              autoFocus
            />
            <span className="text-gray-400 text-sm w-8">g</span>
          </div>
          {previewKcal !== null && (
            <p className="text-base text-[#00C853] text-right">{previewKcal} kcal</p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || quantityG <= 0}
          className="w-full bg-[#00C853] hover:bg-[#00E676] disabled:opacity-40 text-black font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? 'Saving...' : editId ? 'Update' : 'Log'}
        </button>
        {error && <p className="text-red-500 text-base mt-1">{error}</p>}
      </div>
    </div>
  )
}
