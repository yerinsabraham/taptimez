import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)

// Auth — email/password + Google (configured in Phase 1)
export const auth = getAuth(app)

// Cloud Firestore — persistent data: profiles, attempts, leaderboard
export const db = getFirestore(app)

// Realtime Database lives in ./rtdb.ts so its SDK is only bundled with the
// multiplayer/presence code (kept out of the initial load).

/** True only when every required Firebase env var is present. */
export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)
