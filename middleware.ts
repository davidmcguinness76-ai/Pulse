import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/api/cron/sync-intervals',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth.protect()
  // Prevent PWA service worker from caching auth-gated pages
  const res = NextResponse.next()
  res.headers.set('Cache-Control', 'no-store')
  return res
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
