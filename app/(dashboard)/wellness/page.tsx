'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WellnessPage() {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const toNum = (key: string) => { const v = form.get(key); return v ? Number(v) : undefined }
    const toSec = (h: string, m: string) => { const hv = toNum(h); const mv = toNum(m); return (hv || mv) ? ((hv ?? 0) * 3600 + (mv ?? 0) * 60) : undefined }

    await fetch('/api/wellness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        steps: toNum('steps'),
        restingHr: toNum('restingHr'),
        hrvRmssd: toNum('hrvRmssd'),
        sleepScore: toNum('sleepScore'),
        sleepDurationS: toSec('sleepDurationH', 'sleepDurationM'),
        weight: toNum('weight'),
        caloriesBurned: toNum('caloriesBurned'),
      }),
    })
    setSaving(false)
    router.push('/')
  }

  function Field({ label, name, unit, max }: { label: string; name: string; unit?: string; max?: number }) {
    return (
      <div className="flex items-center justify-between">
        <label className="text-gray-300 text-sm">{label}</label>
        <div className="flex items-center gap-1">
          <input name={name} type="number" min="0" max={max} className="w-20 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm text-right" />
          {unit && <span className="text-gray-500 text-sm w-8">{unit}</span>}
        </div>
      </div>
    )
  }

  function DurationField({ label, nameH, nameM }: { label: string; nameH: string; nameM: string }) {
    return (
      <div className="flex items-center justify-between">
        <label className="text-gray-300 text-sm">{label}</label>
        <div className="flex items-center gap-1">
          <input name={nameH} type="number" min="0" max="23" placeholder="0" className="w-14 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm text-right" />
          <span className="text-gray-500 text-sm">h</span>
          <input name={nameM} type="number" min="0" max="59" placeholder="0" className="w-14 bg-gray-800 rounded-lg px-2 py-1 text-white text-sm text-right" />
          <span className="text-gray-500 text-sm">m</span>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-2xl font-bold">Override Wellness</h1>
      <p className="text-gray-400 text-sm">Intervals.icu syncs automatically. Use this to correct today&apos;s values.</p>

      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Sleep</h2>
        <Field label="Sleep Score" name="sleepScore" unit="/100" max={100} />
        <DurationField label="Total Duration" nameH="sleepDurationH" nameM="sleepDurationM" />
      </section>

      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Heart &amp; Recovery</h2>
        <Field label="Resting HR" name="restingHr" unit="bpm" />
        <Field label="HRV" name="hrvRmssd" unit="ms" />
      </section>

      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Activity</h2>
        <Field label="Steps" name="steps" />
        <Field label="Calories Burned" name="caloriesBurned" unit="kcal" />
      </section>

      <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Body</h2>
        <Field label="Weight" name="weight" unit="kg" />
      </section>

      <button type="submit" disabled={saving} className="w-full bg-[#00C853] hover:bg-[#00E676] disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors">
        {saving ? 'Saving...' : 'Save Override'}
      </button>
    </form>
  )
}
