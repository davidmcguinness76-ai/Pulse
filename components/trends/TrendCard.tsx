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
    <div className="bg-[#111827] rounded-2xl overflow-hidden">
      <div className="flex justify-between items-baseline px-4 pt-4 pb-2">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-xs text-gray-400">{summary}</span>
      </div>
      {children}
    </div>
  )
}
