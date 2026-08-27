import { BottomNav } from '@/components/nav/BottomNav'
import Image from 'next/image'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0F0A] text-white pb-24">
      <header className="max-w-lg mx-auto px-4 pt-4 pb-2">
        <Image src="/logo.png" alt="Pulse" width={72} height={48} priority />
      </header>
      <main className="max-w-lg mx-auto px-4 pt-2">{children}</main>
      <BottomNav />
    </div>
  )
}
