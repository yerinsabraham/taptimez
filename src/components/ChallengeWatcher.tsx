import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { useMatch } from '../lib/match.tsx'
import { setChallengeStatus, subscribeIncoming, type Challenge } from '../lib/challenges.ts'
import { joinRoom } from '../lib/rooms.ts'

/** Shows an instant popup when someone challenges you (while you're not in a game). */
export default function ChallengeWatcher() {
  const { user, profile } = useAuth()
  const { match, enter } = useMatch()
  const [incoming, setIncoming] = useState<Challenge[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    return subscribeIncoming(user.uid, setIncoming)
  }, [user])

  // Don't interrupt an active game.
  if (match || !user || !profile) return null
  const c = incoming[0]
  if (!c) return null

  const accept = async () => {
    setBusy(true)
    try {
      await joinRoom(c.code, user.uid, profile.username, 'player')
      await setChallengeStatus(c.id, 'accepted')
      enter(c.code, 'player')
    } catch {
      await setChallengeStatus(c.id, 'declined').catch(() => {})
      setBusy(false)
    }
  }

  const decline = async () => {
    setBusy(true)
    await setChallengeStatus(c.id, 'declined').catch(() => {})
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#15151c] p-6 text-center shadow-2xl">
        <div className="text-4xl">⚔️</div>
        <h3 className="mt-3 text-xl font-black">{c.fromName} challenged you!</h3>
        <p className="mt-1 text-sm text-white/50">Accept to jump into a quick match.</p>
        <div className="mt-5 flex gap-3">
          <button
            disabled={busy}
            onClick={decline}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white/80 transition active:scale-[0.98] disabled:opacity-50"
          >
            Decline
          </button>
          <button
            disabled={busy}
            onClick={accept}
            className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'Joining…' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  )
}
