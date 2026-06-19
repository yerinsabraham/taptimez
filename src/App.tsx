import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth.tsx'
import Nav from './components/Nav.tsx'
import Splash from './components/Splash.tsx'
import Home from './pages/Home.tsx'
import Play from './pages/Play.tsx'
import Leaderboard from './pages/Leaderboard.tsx'
import Profile from './pages/Profile.tsx'
import Login from './pages/Login.tsx'
import UsernameSetup from './pages/UsernameSetup.tsx'

export default function App() {
  const { user, profile, loadingAuth } = useAuth()

  // 1. Still resolving auth, or signed in but profile not yet loaded.
  if (loadingAuth || (user && profile === undefined)) return <Splash />

  // 2. Not signed in.
  if (!user) return <Login />

  // 3. Signed in but hasn't chosen a username yet.
  if (!profile) return <UsernameSetup />

  // 4. Fully set up — the real app.
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<Play />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Nav />
    </div>
  )
}
