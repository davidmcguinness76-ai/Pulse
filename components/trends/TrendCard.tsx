'use client'
import { useState } from 'react'

export function TrendCard({
  title,
  summary,
  info,
  children,
}: {
  title: string
  summary: string
  info: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-[#111827] rounded-2xl overflow-hidden">
      <div className="flex justify-between items-baseline px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white">{title}</span>
          <button
            onClick={() => setOpen(o => !o)}
            className="text-gray-600 hover:text-gray-400 transition-colors text-xs leading-none"
            aria-label={`About ${title}`}
          >
            ⓘ
          </button>
        </div>
        <span className="text-xs text-gray-400">{summary}</span>
      </div>
      {open && (
        <p className="text-xs text-gray-400 px-4 pb-3 leading-relaxed">{info}</p>
      )}
      {children}
    </div>
  )
}
