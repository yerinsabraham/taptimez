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

  let content
  if (loadingAuth || (user && profile === undefined)) {
    // Resolving auth, or signed in but profile not yet loaded.
    content = <Splash />
  } else if (!user) {
    content = <Login />
  } else if (!profile) {
    // Signed in but hasn't chosen a username yet.
    content = <UsernameSetup />
  } else {
    // Fully set up — the real app.
    content = (
      <>
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
      </>
    )
  }

  // Every screen (auth + app) lives in one centered, phone-width column so the
  // desktop layout is a tidy centered column instead of full-bleed inputs.
  return <div className="mx-auto flex min-h-full w-full max-w-md flex-col">{content}</div>
}
