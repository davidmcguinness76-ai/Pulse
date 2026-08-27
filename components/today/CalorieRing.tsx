'use client'
import { useState } from 'react'

type Breakdown = {
  bmrPassive: number
  activity: number
  nonActivitySteps: number
}

type Props = { consumed: number; goal: number; burned: number; breakdown?: Breakdown }

export function CalorieRing({ consumed, goal, burned, breakdown }: Props) {
  const [open, setOpen] = useState(false)
  const net = goal - consumed
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0
  const r = 48
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-4">
        <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke="#00C853" strokeWidth="10"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
          <text x="60" y="56" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">{consumed}</text>
          <text x="60" y="70" textAnchor="middle" fill="#6b7280" fontSize="9">eaten</text>
        </svg>
        <div className="space-y-2 text-sm flex-1">
          <div><span className="text-gray-500">Goal </span><span className="text-white font-medium">{goal} kcal</span></div>
          <div>
            <span className="text-gray-500">Burned </span>
            <button
              onClick={() => breakdown && setOpen(o => !o)}
              className={`font-medium ${breakdown ? 'text-[#00C853] underline decoration-dotted underline-offset-2' : 'text-[#00C853]'}`}
            >
              +{burned}
            </button>
          </div>
          <div><span className="text-gray-500">Remaining </span><span className={`font-semibold ${net >= 0 ? 'text-white' : 'text-red-400'}`}>{net} kcal</span></div>
        </div>
      </div>

      {open && breakdown && (
        <div className="border-t border-gray-800 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Passive (BMR)</span>
            <span className="text-white">{breakdown.bmrPassive} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Activities</span>
            <span className="text-white">{breakdown.activity} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Non-activity steps</span>
            <span className="text-white">{breakdown.nonActivitySteps} kcal</span>
          </div>
          <div className="flex justify-between border-t border-gray-800 pt-1 font-medium">
            <span className="text-gray-400">Total burned</span>
            <span className="text-[#00C853]">{burned} kcal</span>
          </div>
        </div>
      )}
    </div>
  )
}
