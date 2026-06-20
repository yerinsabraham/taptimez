import { getDatabase } from 'firebase/database'
import { app } from './firebase.ts'

/**
 * Realtime Database instance, isolated here so the (sizable) RTDB SDK is only
 * pulled into the multiplayer / presence chunks, not the initial bundle.
 */
export const rtdb = getDatabase(app)
