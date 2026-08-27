import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { getTodayWellness } from '@/lib/db/queries/wellness'
import { UserButton } from '@clerk/nextjs'

export default async function ProfilePage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const user = await getUserByClerkId(clerkId)
  const today = new Date().toISOString().split('T')[0]
  const wellness = user ? await getTodayWellness(user.id, today) : null
  const lastSync = wellness ? new Date(wellness.date).toLocaleDateString() : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Intervals.icu Sync</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Connected via Garmin</p>
            <p className="text-gray-500 text-sm">
              {lastSync ? `Last data: ${lastSync}` : 'Syncs every 30 minutes automatically'}
            </p>
          </div>
          <span className="text-[#00C853] text-sm">Active</span>
        </div>
      </section>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Daily Wellness</h2>
        <p className="text-gray-500 text-sm">Intervals.icu syncs sleep, HRV, steps and resting HR automatically. Override values if needed.</p>
        <a href="/wellness" className="block text-center bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          Override Today's Wellness
        </a>
      </section>

      <section className="bg-[#111827] rounded-2xl p-4">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Goals</h2>
        <p className="text-gray-500 text-sm">Calorie and nutrient goals — coming in M2</p>
      </section>
    </div>
  )
}
