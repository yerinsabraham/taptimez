import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
  type Unsubscribe,
} from 'firebase/database'
import { rtdb } from './firebase.ts'

export type Role = 'player' | 'timekeeper'
export type RoomStatus = 'lobby' | 'playing' | 'done'
export type PlayerState = 'idle' | 'running' | 'stopped'

export type RoomPlayer = {
  name: string
  state: PlayerState
  startedAt: number | null
  resultMs: number | null
  errorMs: number | null
}

export type Participant = { name: string; role: Role }

export type Room = {
  meta: { hostUid: string; targetMs: number; status: RoomStatus; createdAt: number }
  participants?: Record<string, Participant>
  players?: Record<string, RoomPlayer>
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars

function genCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

function freshPlayer(name: string): RoomPlayer {
  return { name, state: 'idle', startedAt: null, resultMs: null, errorMs: null }
}

/** Remove our presence automatically if the connection drops. */
function attachPresence(code: string, uid: string) {
  onDisconnect(ref(rtdb, `rooms/${code}/participants/${uid}`)).remove()
  onDisconnect(ref(rtdb, `rooms/${code}/players/${uid}`)).remove()
}

/** Create a new room (the creator is the host) and return its code. */
export async function createRoom(
  uid: string,
  name: string,
  role: Role,
  targetMs: number,
): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = genCode()
    const roomRef = ref(rtdb, `rooms/${code}`)
    const snap = await get(roomRef)
    if (snap.exists()) continue
    await set(roomRef, {
      meta: { hostUid: uid, targetMs, status: 'lobby', createdAt: serverTimestamp() },
      participants: { [uid]: { name, role } },
      ...(role === 'player' ? { players: { [uid]: freshPlayer(name) } } : {}),
    })
    attachPresence(code, uid)
    return code
  }
  throw new Error('Could not create a room. Please try again.')
}

/** Join an existing room by code in the given role. */
export async function joinRoom(
  code: string,
  uid: string,
  name: string,
  role: Role,
): Promise<void> {
  const roomRef = ref(rtdb, `rooms/${code}`)
  const snap = await get(roomRef)
  if (!snap.exists()) throw new Error('No game found with that code.')
  const updates: Record<string, unknown> = {
    [`participants/${uid}`]: { name, role },
  }
  if (role === 'player') updates[`players/${uid}`] = freshPlayer(name)
  await update(roomRef, updates)
  attachPresence(code, uid)
}

export async function leaveRoom(code: string, uid: string): Promise<void> {
  await remove(ref(rtdb, `rooms/${code}/participants/${uid}`))
  await remove(ref(rtdb, `rooms/${code}/players/${uid}`))
}

export async function startGame(code: string): Promise<void> {
  await update(ref(rtdb, `rooms/${code}/meta`), { status: 'playing' })
}

export async function endGame(code: string): Promise<void> {
  await update(ref(rtdb, `rooms/${code}/meta`), { status: 'done' })
}

/** Reset every player and start a fresh round. */
export async function rematch(code: string): Promise<void> {
  const playersSnap = await get(ref(rtdb, `rooms/${code}/players`))
  const updates: Record<string, unknown> = { 'meta/status': 'playing' }
  playersSnap.forEach((child) => {
    updates[`players/${child.key}/state`] = 'idle'
    updates[`players/${child.key}/startedAt`] = null
    updates[`players/${child.key}/resultMs`] = null
    updates[`players/${child.key}/errorMs`] = null
  })
  await update(ref(rtdb, `rooms/${code}`), updates)
}

export async function playerStart(code: string, uid: string): Promise<void> {
  await update(ref(rtdb, `rooms/${code}/players/${uid}`), {
    state: 'running',
    startedAt: serverTimestamp(),
    resultMs: null,
    errorMs: null,
  })
}

export async function playerStop(
  code: string,
  uid: string,
  resultMs: number,
  errorMs: number,
): Promise<void> {
  await update(ref(rtdb, `rooms/${code}/players/${uid}`), {
    state: 'stopped',
    resultMs,
    errorMs,
  })
}

export function subscribeRoom(code: string, cb: (room: Room | null) => void): Unsubscribe {
  return onValue(ref(rtdb, `rooms/${code}`), (snap) =>
    cb(snap.exists() ? (snap.val() as Room) : null),
  )
}

/** Clock offset between this device and the Firebase server, for synced timing. */
export function subscribeServerOffset(cb: (offsetMs: number) => void): Unsubscribe {
  return onValue(ref(rtdb, '.info/serverTimeOffset'), (snap) => cb((snap.val() as number) ?? 0))
}
