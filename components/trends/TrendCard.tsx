export function TrendCard({
  title,
  summary,
  children,
}: {
  title: string
  summary: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#111827] rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-xs text-gray-400">{summary}</span>
      </div>
      {children}
    </div>
  )
}
