'use client'
import { useState } from 'react'

export function CalorieGoalForm({ current }: { current: number }) {
  const [value, setValue] = useState(current)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calorieGoal: value }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <label className="text-gray-300 text-sm flex-1">Daily calorie goal</label>
      <input
        type="number"
        min={500}
        max={10000}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        className="w-24 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm text-right"
      />
      <span className="text-gray-500 text-sm">kcal</span>
      <button
        type="submit"
        disabled={saving}
        className="bg-[#00C853] hover:bg-[#00E676] disabled:opacity-50 text-black text-sm font-semibold px-3 py-1 rounded-lg transition-colors"
      >
        {saved ? '✓' : saving ? '...' : 'Save'}
      </button>
    </form>
  )
}
