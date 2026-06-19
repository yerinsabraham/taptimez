import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.ts'
import { isPerfect } from './game.ts'
import type { UserProfile } from './profile.ts'

export type AttemptMode = 'single' | 'versus'

export type AttemptResult = {
  errorMs: number
  isBest: boolean
  perfect: boolean
}

/**
 * Atomically records a "blind" ranked attempt (no clock) and updates the
 * player's profile:
 * - writes an immutable doc to `attempts`
 * - increments totalAttempts
 * - updates bestErrorMs / bestElapsedMs on a new personal best
 * - on a perfect score, increments perfectCount and stamps lastPerfectAt
 *   (the leaderboard ranks by perfectCount desc, then lastPerfectAt asc)
 *
 * elapsedMs is measured on the player's own device, so the score is
 * network-independent and fair.
 */
export async function recordRankedAttempt(
  uid: string,
  targetMs: number,
  elapsedMs: number,
  mode: AttemptMode,
): Promise<AttemptResult> {
  const elapsed = Math.round(elapsedMs)
  const errorMs = Math.abs(elapsed - targetMs)
  const perfect = isPerfect(errorMs)
  const attemptRef = doc(collection(db, 'attempts'))
  const userRef = doc(db, 'users', uid)

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists()) throw new Error('Profile missing')
    const data = snap.data() as UserProfile
    const isBest = data.bestErrorMs == null || errorMs < data.bestErrorMs

    tx.set(attemptRef, {
      uid,
      mode,
      targetMs,
      elapsedMs: elapsed,
      errorMs,
      createdAt: serverTimestamp(),
    })

    const update: Record<string, unknown> = {
      totalAttempts: (data.totalAttempts ?? 0) + 1,
    }
    if (isBest) {
      update.bestErrorMs = errorMs
      update.bestElapsedMs = elapsed
    }
    if (perfect) {
      update.perfectCount = (data.perfectCount ?? 0) + 1
      update.lastPerfectAt = serverTimestamp()
    }
    tx.update(userRef, update)

    return { errorMs, isBest, perfect }
  })
}
