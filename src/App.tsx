import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth.tsx'
import { MatchProvider, useMatch } from './lib/match.tsx'
import Nav from './components/Nav.tsx'
import Splash from './components/Splash.tsx'
import PresenceManager from './components/PresenceManager.tsx'
import ChallengeWatcher from './components/ChallengeWatcher.tsx'
import { RoomScreen } from './pages/Multiplayer.tsx'
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
    content = <Splash />
  } else if (!user) {
    content = <Login />
  } else if (!profile) {
    content = <UsernameSetup />
  } else {
    content = (
      <MatchProvider>
        <Authed />
      </MatchProvider>
    )
  }

  // Every screen lives in one centered, phone-width column.
  return <div className="mx-auto flex min-h-full w-full max-w-md flex-col">{content}</div>
}

/** Signed-in app: presence + challenge popup, then either a live room or the tabs. */
function Authed() {
  const { match } = useMatch()

  return (
    <>
      <PresenceManager />
      <ChallengeWatcher />
      {match ? (
        <RoomScreen />
      ) : (
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
      )}
    </>
  )
}
