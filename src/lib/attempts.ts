import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.ts'
import type { UserProfile } from './profile.ts'

export type AttemptResult = {
  errorMs: number
  isBest: boolean
}

/**
 * Atomically records a solo attempt and updates the player's profile:
 * - writes an immutable doc to `attempts`
 * - increments totalAttempts
 * - updates bestErrorMs / bestElapsedMs when this is a new personal best
 *
 * elapsedMs is measured on the player's own device (performance.now delta),
 * so the score is network-independent and fair.
 */
export async function recordSoloAttempt(
  uid: string,
  targetMs: number,
  elapsedMs: number,
): Promise<AttemptResult> {
  const elapsed = Math.round(elapsedMs)
  const errorMs = Math.abs(elapsed - targetMs)
  const attemptRef = doc(collection(db, 'attempts'))
  const userRef = doc(db, 'users', uid)

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists()) throw new Error('Profile missing')
    const data = snap.data() as UserProfile
    const isBest = data.bestErrorMs == null || errorMs < data.bestErrorMs

    tx.set(attemptRef, {
      uid,
      mode: 'solo',
      targetMs,
      elapsedMs: elapsed,
      errorMs,
      createdAt: serverTimestamp(),
    })

    tx.update(userRef, {
      totalAttempts: (data.totalAttempts ?? 0) + 1,
      ...(isBest ? { bestErrorMs: errorMs, bestElapsedMs: elapsed } : {}),
    })

    return { errorMs, isBest }
  })
}
