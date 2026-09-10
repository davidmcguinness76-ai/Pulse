import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/lib/db/queries/users'
import { getTodayLog } from '@/lib/db/queries/nutrition'
import { FoodSearch } from '@/components/nutrition/FoodSearch'

export default async function NutritionPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getUserByClerkId(clerkId)
  if (!user) redirect('/sign-in')

  const today = new Date().toISOString().split('T')[0]
  const groups = await getTodayLog(user.id, today)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Log Food</h1>
      <FoodSearch initialGroups={groups} />
    </div>
  )
}
