import { useEffect } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { useMatch } from '../lib/match.tsx'
import { goOffline, goOnline, setStatus } from '../lib/presence.ts'

/** Keeps this user's online presence in sync while the app is open. */
export default function PresenceManager() {
  const { user, profile } = useAuth()
  const { match } = useMatch()
  const uid = user?.uid
  const username = profile?.username

  useEffect(() => {
    if (!uid || !username) return
    const unsub = goOnline(uid, username, 'online')
    return () => {
      unsub()
      goOffline(uid).catch(() => {})
    }
  }, [uid, username])

  // Reflect whether we're currently in a game.
  useEffect(() => {
    if (!uid || !username) return
    setStatus(uid, username, match ? 'playing' : 'online').catch(() => {})
  }, [match, uid, username])

  return null
}
