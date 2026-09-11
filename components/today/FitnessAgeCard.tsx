export function FitnessAgeCard({
  fitnessAge,
  actualAge,
}: {
  fitnessAge: number
  actualAge: number
}) {
  const diff = actualAge - fitnessAge
  const label = diff > 0 ? `${diff} yrs younger` : diff < 0 ? `${Math.abs(diff)} yrs older` : 'same as actual'
  const colour = diff > 0 ? '#00C853' : diff < 0 ? '#f59e0b' : '#00BCD4'

  return (
    <div className="bg-[#111827] rounded-2xl p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400 mb-0.5">Fitness Age</p>
        <p className="text-4xl font-bold text-white">{fitnessAge}</p>
        <p className="text-sm mt-0.5" style={{ color: colour }}>{label}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-500">Based on VO2 Max</p>
        <p className="text-sm text-gray-500">vs age-group norms</p>
      </div>
    </div>
  )
}
