'use client'
import { useState } from 'react'
import type { MealGroup as MealGroupType } from '@/lib/db/queries/nutrition'

const LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }

export function MealGroup({ group, onDelete }: { group: MealGroupType; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState<string | null>(null)

  if (group.entries.length === 0) return null

  async function handleDelete(id: string) {
    setDeleting(id)
    await fetch(`/api/food/log/${id}`, { method: 'DELETE' })
    onDelete(id)
    setDeleting(null)
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline px-1">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{LABELS[group.category]}</span>
        <span className="text-xs text-gray-500">{group.totalCalories} kcal</span>
      </div>
      <div className="bg-[#111827] rounded-2xl divide-y divide-gray-800">
        {group.entries.map(entry => (
          <div key={entry.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{entry.foodName}</p>
              {entry.brand && <p className="text-xs text-gray-500 truncate">{entry.brand}</p>}
              <p className="text-xs text-gray-500">{entry.quantityG}g · {entry.calories} kcal</p>
            </div>
            <button
              onClick={() => handleDelete(entry.id)}
              disabled={deleting === entry.id}
              className="ml-3 text-gray-600 hover:text-red-400 transition-colors text-lg disabled:opacity-30"
              aria-label="Delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
