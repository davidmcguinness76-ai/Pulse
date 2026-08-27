import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { getRecentActivities } from '@/lib/db/queries/activities'

function fmtPace(sPerKm?: number | null) {
  if (!sPerKm) return '—'
  const m = Math.floor(sPerKm / 60)
  const s = Math.round(sPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

function fmtDuration(s?: number | null) {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDistance(m?: number | null) {
  if (!m) return '—'
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`
}

export default async function ActivityPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const user = await getUserByClerkId(clerkId)
  const activities = user ? await getRecentActivities(user.id, 20) : []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Activity</h1>
      {activities.length === 0 ? (
        <div className="bg-[#111827] rounded-2xl p-6 text-center text-gray-500">
          <p>No activities yet.</p>
          <p className="text-sm mt-1">Intervals.icu syncs automatically from your Garmin every 30 minutes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(a => (
            <div key={a.id} className="bg-[#111827] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{a.name ?? a.type}</span>
                <span className="text-gray-500 text-sm">{new Date(a.startedAt).toLocaleDateString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-center">
                <div><div className="text-white font-medium">{fmtDistance(a.distanceM)}</div><div className="text-gray-500 text-xs">distance</div></div>
                <div><div className="text-white font-medium">{fmtDuration(a.durationS)}</div><div className="text-gray-500 text-xs">duration</div></div>
                <div><div className="text-white font-medium">{fmtPace(a.avgPaceSPerKm)}</div><div className="text-gray-500 text-xs">pace</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
