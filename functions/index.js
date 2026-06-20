const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

initializeApp()
const db = getFirestore()

/**
 * Anti-cheat auditor. Runs server-side after each attempt is written.
 *
 * It can't verify the *true* elapsed time (the game is client-timed), but it
 * can catch tampering and impossible play:
 *  - re-validates the attempt's shape/consistency/bounds (defense in depth)
 *  - flags users with a statistically impossible perfect rate
 *
 * A flagged user is hidden from the leaderboard (the client filters them out).
 * Clients cannot clear `flagged` themselves (the security rules forbid it);
 * only this function (admin) writes it.
 */
exports.auditAttempt = onDocumentCreated('attempts/{id}', async (event) => {
  const a = event.data && event.data.data()
  if (!a || !a.uid) return

  const { uid, targetMs, elapsedMs, errorMs } = a

  const consistent =
    typeof targetMs === 'number' &&
    typeof elapsedMs === 'number' &&
    typeof errorMs === 'number' &&
    errorMs === Math.abs(elapsedMs - targetMs) &&
    targetMs >= 1000 &&
    targetMs <= 600000 &&
    elapsedMs >= 0 &&
    elapsedMs <= 3600000

  const userRef = db.doc(`users/${uid}`)
  const snap = await userRef.get()
  if (!snap.exists) return
  const u = snap.data() || {}

  const attempts = u.totalAttempts || 0
  const perfects = u.perfectCount || 0

  // Hitting a <=0.02s bullseye blind more than half the time is not humanly
  // possible; treat a high sustained perfect rate as cheating.
  const impossibleRate = attempts >= 20 && perfects / attempts > 0.5

  if (!consistent || impossibleRate) {
    await userRef.set({ flagged: true }, { merge: true })
  }
})
