import { BottomNav } from '@/components/nav/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0F0A] text-white pb-24">
      <main className="max-w-lg mx-auto px-4 pt-6">{children}</main>
      <BottomNav />
    </div>
  )
}
