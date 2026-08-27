'use client'
import { useRouter } from 'next/navigation'

type Props = { date: string; isToday: boolean }

function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatLabel(iso: string, isToday: boolean): string {
  if (isToday) return 'Today'
  const d = new Date(iso + 'T12:00:00') // noon avoids DST shift
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function DayNav({ date, isToday }: Props) {
  const router = useRouter()

  function go(n: number) {
    const next = addDays(date, n)
    const today = new Date().toISOString().split('T')[0]
    if (next > today) return
    router.push(next === today ? '/' : `/?date=${next}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => go(-1)}
        className="text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors text-lg leading-none"
        aria-label="Previous day"
      >
        ‹
      </button>
      <span className="text-2xl font-bold flex-1">{formatLabel(date, isToday)}</span>
      <button
        onClick={() => go(1)}
        disabled={isToday}
        className="text-gray-400 hover:text-white disabled:opacity-30 px-2 py-1 rounded-lg hover:bg-gray-800 disabled:hover:bg-transparent transition-colors text-lg leading-none"
        aria-label="Next day"
      >
        ›
      </button>
    </div>
  )
}
