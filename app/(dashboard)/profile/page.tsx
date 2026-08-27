import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { UserButton } from '@clerk/nextjs'
import { SyncButton } from '@/components/SyncButton'
import { CalorieGoalForm } from '@/components/CalorieGoalForm'

export default async function ProfilePage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null

  const user = await getUserByClerkId(clerkId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Intervals.icu Sync</h2>
        <SyncButton lastSyncedAt={user?.lastSyncedAt ?? null} />
      </section>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Daily Wellness</h2>
        <p className="text-gray-500 text-sm">Intervals.icu syncs sleep, HRV, steps and resting HR automatically. Override values if needed.</p>
        <a href="/wellness" className="block text-center bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          Override Today&apos;s Wellness
        </a>
      </section>

      <section className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <h2 className="text-gray-400 text-xs font-medium uppercase tracking-wide">Goals</h2>
        <CalorieGoalForm current={user?.calorieGoal ?? 2300} />
      </section>
    </div>
  )
}
