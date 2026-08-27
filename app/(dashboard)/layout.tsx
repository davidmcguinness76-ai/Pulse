import { BottomNav } from '@/components/nav/BottomNav'
import { SyncButton } from '@/components/SyncButton'
import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId } from '@/lib/db/queries/users'
import Image from 'next/image'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId: clerkId } = await auth()
  const user = clerkId ? await getUserByClerkId(clerkId) : null

  return (
    <div className="min-h-screen bg-[#0A0F0A] text-white pb-24">
      <header className="bg-white px-4 py-2 flex items-center justify-between">
        <Image src="/logo.png" alt="Pulse" width={108} height={72} priority />
        <SyncButton lastSyncedAt={user?.lastSyncedAt ?? null} compact />
      </header>
      <main className="max-w-lg mx-auto px-4 pt-4">{children}</main>
      <BottomNav />
    </div>
  )
}
