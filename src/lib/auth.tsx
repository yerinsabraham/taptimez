import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase.ts'
import type { UserProfile } from './profile.ts'

type AuthState = {
  user: User | null
  // undefined = still loading the profile; null = signed in but no profile yet
  profile: UserProfile | null | undefined
  loadingAuth: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: undefined,
  loadingAuth: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined)
  const [loadingAuth, setLoadingAuth] = useState(true)

  // Track the signed-in user.
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoadingAuth(false)
    })
  }, [])

  // Live-subscribe to the user's profile doc whenever the user changes.
  useEffect(() => {
    setProfile(undefined) // reset to "loading" on every user change
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    return onSnapshot(
      ref,
      (snap) => setProfile(snap.exists() ? (snap.data() as UserProfile) : null),
      (err) => {
        console.error('profile subscription error', err)
        setProfile(null)
      },
    )
  }, [user])

  return (
    <AuthContext.Provider value={{ user, profile, loadingAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
