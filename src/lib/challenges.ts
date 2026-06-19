import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase.ts'

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export type Challenge = {
  id: string
  fromUid: string
  fromName: string
  toUid: string
  toName: string
  code: string
  status: ChallengeStatus
  createdAt: unknown
}

/** A challenges another player to the room identified by `code`. Returns the challenge id. */
export async function sendChallenge(input: {
  fromUid: string
  fromName: string
  toUid: string
  toName: string
  code: string
}): Promise<string> {
  const ref = await addDoc(collection(db, 'challenges'), {
    ...input,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function setChallengeStatus(id: string, status: ChallengeStatus): Promise<void> {
  return updateDoc(doc(db, 'challenges', id), { status })
}

/** Live list of pending challenges sent TO this user. */
export function subscribeIncoming(uid: string, cb: (list: Challenge[]) => void): Unsubscribe {
  const q = query(collection(db, 'challenges'), where('toUid', '==', uid))
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Challenge, 'id'>) }))
      .filter((c) => c.status === 'pending')
    cb(list)
  })
}

/** Live status of a single challenge (used by the challenger to see accept/decline). */
export function subscribeChallenge(id: string, cb: (c: Challenge | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'challenges', id), (snap) =>
    cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Challenge, 'id'>) }) : null),
  )
}
