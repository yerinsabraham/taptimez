import {
  limitToFirst,
  onDisconnect,
  onValue,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  type Unsubscribe,
} from 'firebase/database'
import { rtdb } from './rtdb.ts'

export type PresenceStatus = 'online' | 'playing'

export type OnlineUser = {
  uid: string
  username: string
  status: PresenceStatus
  lastActive: number
}

/**
 * Mark this user online while connected. Returns an unsubscribe that stops
 * watching the connection; presence is also auto-removed on disconnect.
 */
export function goOnline(uid: string, username: string, status: PresenceStatus): Unsubscribe {
  const userRef = ref(rtdb, `presence/${uid}`)
  const connectedRef = ref(rtdb, '.info/connected')
  return onValue(connectedRef, (snap) => {
    if (snap.val() !== true) return
    onDisconnect(userRef).remove()
    void set(userRef, { username, status, lastActive: serverTimestamp() })
  })
}

export function setStatus(uid: string, username: string, status: PresenceStatus): Promise<void> {
  return set(ref(rtdb, `presence/${uid}`), { username, status, lastActive: serverTimestamp() })
}

export function goOffline(uid: string): Promise<void> {
  return remove(ref(rtdb, `presence/${uid}`))
}

export function subscribeOnline(cb: (users: OnlineUser[]) => void): Unsubscribe {
  // Cap the download so a huge online pool doesn't pull everyone to each client.
  // (A real matchmaking service would replace this; fine for current scale.)
  return onValue(query(ref(rtdb, 'presence'), limitToFirst(200)), (snap) => {
    const val = snap.val() as Record<
      string,
      { username: string; status: PresenceStatus; lastActive: number }
    > | null
    cb(val ? Object.entries(val).map(([uid, v]) => ({ uid, ...v })) : [])
  })
}
