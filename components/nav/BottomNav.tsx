'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Today', icon: '⚡' },
  { href: '/nutrition', label: 'Food', icon: '🥗' },
  { href: '/activity', label: 'Activity', icon: '🏃' },
  { href: '/trends', label: 'Trends', icon: '📈' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111827] border-t border-gray-800 flex safe-area-pb">
      {links.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${pathname === href ? 'text-[#00C853]' : 'text-gray-500'}`}
        >
          <span className="text-xl">{icon}</span>
          {label}
        </Link>
      ))}
    </nav>
  )
}
