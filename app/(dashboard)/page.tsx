import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, upsertUser } from '@/lib/db/queries/users'
import { getTodayWellness } from '@/lib/db/queries/wellness'
import { getTodayCaloriesBurned } from '@/lib/db/queries/activities'
import { SleepCard } from '@/components/today/SleepCard'
import { StepsCard } from '@/components/today/StepsCard'
import { HrvCard } from '@/components/today/HrvCard'
import { CalorieRing } from '@/components/today/CalorieRing'
import Link from 'next/link'

export default async function TodayPage() {
  const { userId: clerkId, sessionClaims } = await auth()
  if (!clerkId) return null

  let user = await getUserByClerkId(clerkId)
  if (!user) user = await upsertUser(clerkId, (sessionClaims?.email as string) ?? '')

  const today = new Date().toISOString().split('T')[0]
  const [wellness, burned] = await Promise.all([
    getTodayWellness(user.id, today),
    getTodayCaloriesBurned(user.id, today),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Today</h1>
        <Link href="/wellness" className="text-sm text-[#00C853]">Override</Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StepsCard steps={wellness?.steps} goal={10000} />
        <HrvCard hrv={wellness?.hrvRmssd} restingHr={wellness?.restingHr} />
      </div>

      <SleepCard
        score={wellness?.sleepScore}
        durationS={wellness?.sleepDurationS}
        quality={wellness?.sleepQuality}
      />

      <CalorieRing
        consumed={0}
        goal={user.calorieGoal ?? 2300}
        burned={burned}
      />
    </div>
  )
}
