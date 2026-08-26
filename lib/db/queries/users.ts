import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, type User } from '@/lib/db/schema'

export async function upsertUser(clerkId: string, email: string): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({ clerkId, email })
    .onConflictDoUpdate({ target: users.clerkId, set: { email } })
    .returning()
  return user
}

export async function getUserByClerkId(clerkId: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
}
