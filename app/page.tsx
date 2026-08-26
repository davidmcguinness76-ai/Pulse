import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold text-brand-green">Pulse — signed in</h1>
    </main>
  )
}
