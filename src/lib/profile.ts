import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './firebase.ts'

/** A player's persistent profile, stored at users/{uid}. */
export type UserProfile = {
  username: string
  email: string | null
  photoURL: string | null
  createdAt: unknown
  // Best result = smallest gap from a round's target (lower is better). Null until first play.
  bestErrorMs: number | null
  bestElapsedMs: number | null
  totalAttempts: number
  totalWins: number
}

const USERNAME_RE = /^[a-z0-9_]{3,15}$/i

/** Returns the trimmed username if valid, else null. */
export function validateUsername(raw: string): string | null {
  const name = raw.trim()
  return USERNAME_RE.test(name) ? name : null
}

/** Quick pre-check (the transaction is the real guard against races). */
export async function isUsernameAvailable(name: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', name.toLowerCase()))
  return !snap.exists()
}

/**
 * Atomically claims a username and creates the user's profile.
 * Fails if the name is taken or the user already has a profile.
 */
export async function claimUsernameAndCreateProfile(
  user: User,
  rawUsername: string,
): Promise<void> {
  const username = validateUsername(rawUsername)
  if (!username) {
    throw new Error('Username must be 3 to 15 letters, numbers, or underscores.')
  }

  const usernameRef = doc(db, 'usernames', username.toLowerCase())
  const userRef = doc(db, 'users', user.uid)

  await runTransaction(db, async (tx) => {
    const [usernameSnap, userSnap] = await Promise.all([tx.get(usernameRef), tx.get(userRef)])
    if (usernameSnap.exists()) throw new Error('That username is already taken.')
    if (userSnap.exists()) throw new Error('You already have a profile.')

    tx.set(usernameRef, { uid: user.uid })
    tx.set(userRef, {
      username,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      bestErrorMs: null,
      bestElapsedMs: null,
      totalAttempts: 0,
      totalWins: 0,
    } satisfies UserProfile)
  })
}
