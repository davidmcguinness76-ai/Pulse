import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0F0A]">
      <SignIn />
    </main>
  )
}
