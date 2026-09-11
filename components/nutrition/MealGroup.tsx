'use client'
import { useState } from 'react'
import type { LogEntry, MealGroup as MealGroupType } from '@/lib/db/queries/nutrition'

const LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }

export function MealGroup({ group, onDelete, onEdit }: {
  group: MealGroupType
  onDelete: (id: string) => void
  onEdit: (entry: LogEntry, currentMeal: MealGroupType['category']) => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  if (group.entries.length === 0) return null

  async function confirmDelete(id: string) {
    setConfirming(null)
    setDeleting(id)
    await fetch(`/api/food/log/${id}`, { method: 'DELETE' })
    onDelete(id)
    setDeleting(null)
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline px-1">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">{LABELS[group.category]}</span>
        <span className="text-sm text-gray-500">{group.totalCalories} kcal</span>
      </div>
      <div className="bg-[#111827] rounded-2xl divide-y divide-gray-800">
        {group.entries.map(entry => (
          <div key={entry.id} className="flex items-center justify-between px-4 py-3">
            <button
              className="flex-1 min-w-0 text-left"
              onClick={() => { setConfirming(null); onEdit(entry, group.category) }}
            >
              <p className="text-base font-medium text-white truncate">{entry.foodName}</p>
              {entry.brand && <p className="text-sm text-gray-500 truncate">{entry.brand}</p>}
              <p className="text-sm text-gray-500">{entry.quantityG}g · {entry.calories} kcal</p>
            </button>
            {confirming === entry.id ? (
              <div className="ml-3 flex items-center gap-2">
                <button onClick={() => setConfirming(null)} className="text-sm text-gray-500">Cancel</button>
                <button onClick={() => confirmDelete(entry.id)} className="text-sm text-red-400 font-medium">Delete</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(entry.id)}
                disabled={deleting === entry.id}
                className="ml-3 text-gray-600 hover:text-red-400 transition-colors text-lg disabled:opacity-30"
                aria-label="Delete"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
