'use client'
import { useState } from 'react'

type Props = {
  calorieGoal: number
  heightCm: number | null
  weightKg: number | null
  age: number | null
  sex: 'male' | 'female' | 'other' | null
}

export function ProfileForm({ calorieGoal, heightCm, weightKg, age, sex }: Props) {
  const [form, setForm] = useState({
    calorieGoal,
    heightCm: heightCm ?? '',
    weightKg: weightKg ?? '',
    age: age ?? '',
    sex: sex ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body: Record<string, unknown> = {}
    if (form.calorieGoal) body.calorieGoal = Number(form.calorieGoal)
    if (form.heightCm !== '') body.heightCm = Number(form.heightCm)
    if (form.weightKg !== '') body.weightKg = Number(form.weightKg)
    if (form.age !== '') body.age = Number(form.age)
    if (form.sex) body.sex = form.sex
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const row = (label: string, key: string, type: 'number' | 'text', unit?: string) => (
    <div className="flex items-center gap-3">
      <label className="text-gray-300 text-sm flex-1">{label}</label>
      <input
        type={type}
        value={form[key as keyof typeof form]}
        onChange={e => set(key, e.target.value)}
        className="w-24 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm text-right"
      />
      {unit && <span className="text-gray-500 text-sm w-6">{unit}</span>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {row('Daily calorie goal', 'calorieGoal', 'number', 'kcal')}
      {row('Height', 'heightCm', 'number', 'cm')}
      {row('Weight', 'weightKg', 'number', 'kg')}
      {row('Age', 'age', 'number', 'yrs')}
      <div className="flex items-center gap-3">
        <label className="text-gray-300 text-sm flex-1">Sex</label>
        <select
          value={form.sex}
          onChange={e => set('sex', e.target.value)}
          className="w-28 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm"
        >
          <option value="">—</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="pt-1">
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#00C853] hover:bg-[#00E676] disabled:opacity-50 text-black text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
