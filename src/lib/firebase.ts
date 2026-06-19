import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'

// Firebase web config. These values are NOT secret (they ship in the client
// bundle by design); real protection comes from Firebase Auth + Security Rules.
// Values are injected at build time from .env.local via Vite.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

export const app = initializeApp(firebaseConfig)

// Auth — email/password + Google (configured in Phase 1)
export const auth = getAuth(app)

// Cloud Firestore — persistent data: profiles, attempts, leaderboard
export const db = getFirestore(app)

// Realtime Database — live multiplayer rooms (Phase 4)
export const rtdb = getDatabase(app)

/** True only when every required Firebase env var is present. */
export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)
