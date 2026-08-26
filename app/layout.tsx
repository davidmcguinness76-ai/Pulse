import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pulse',
  description: 'Fuel. Move. Thrive.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="manifest" href="/manifest.json" />
        </head>
        <body className="bg-[#0A0F0A] text-white">{children}</body>
      </html>
    </ClerkProvider>
  )
}
