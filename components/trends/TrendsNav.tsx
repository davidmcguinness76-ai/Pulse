'use client'
import { useRouter } from 'next/navigation'

function addWeeks(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n * 7)
  return d.toISOString().split('T')[0]
}

function fmtRange(weekStart: string, view: 'week' | 'month'): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const start = new Date((view === 'month' ? addWeeks(weekStart, -3) : weekStart) + 'T12:00:00Z')
  const end = new Date(addWeeks(weekStart, 0) + 'T12:00:00Z')
  end.setUTCDate(end.getUTCDate() + 6)
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`
}

export function TrendsNav({
  weekStart,
  view,
  isCurrentWeek,
}: {
  weekStart: string
  view: 'week' | 'month'
  isCurrentWeek: boolean
}) {
  const router = useRouter()

  function go(delta: number) {
    const next = addWeeks(weekStart, view === 'month' ? delta * 4 : delta)
    router.push(`/trends?week=${next}&view=${view}`)
  }

  function toggleView() {
    router.push(`/trends?week=${weekStart}&view=${view === 'week' ? 'month' : 'week'}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          className="text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors text-xl leading-none"
          aria-label="Previous period"
        >
          ‹
        </button>
        <span className="text-sm text-gray-300 font-medium">{fmtRange(weekStart, view)}</span>
        <button
          onClick={() => go(1)}
          disabled={isCurrentWeek}
          className="text-gray-400 hover:text-white disabled:opacity-30 px-2 py-1 rounded-lg hover:bg-gray-800 disabled:hover:bg-transparent transition-colors text-xl leading-none"
          aria-label="Next period"
        >
          ›
        </button>
      </div>

      <div className="flex rounded-xl bg-[#1f2937] p-0.5">
        <button
          onClick={() => view !== 'week' && toggleView()}
          className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
            view === 'week' ? 'bg-[#111827] text-white' : 'text-gray-500'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => view !== 'month' && toggleView()}
          className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
            view === 'month' ? 'bg-[#111827] text-white' : 'text-gray-500'
          }`}
        >
          Month
        </button>
      </div>
    </div>
  )
}
