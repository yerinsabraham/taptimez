import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth.tsx'
import { MatchProvider, useMatch } from './lib/match.tsx'
import Nav from './components/Nav.tsx'
import Splash from './components/Splash.tsx'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import UsernameSetup from './pages/UsernameSetup.tsx'

// Heavier screens load on demand to keep the initial bundle small.
const Play = lazy(() => import('./pages/Play.tsx'))
const Leaderboard = lazy(() => import('./pages/Leaderboard.tsx'))
const Profile = lazy(() => import('./pages/Profile.tsx'))
const RoomScreen = lazy(() =>
  import('./pages/Multiplayer.tsx').then((m) => ({ default: m.RoomScreen })),
)
// Presence + challenges pull in the Realtime Database SDK; defer past first paint.
const PresenceManager = lazy(() => import('./components/PresenceManager.tsx'))
const ChallengeWatcher = lazy(() => import('./components/ChallengeWatcher.tsx'))

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
      <Suspense fallback={null}>
        <PresenceManager />
        <ChallengeWatcher />
      </Suspense>
      {match ? (
        <Suspense fallback={<Splash />}>
          <RoomScreen />
        </Suspense>
      ) : (
        <>
          <main className="flex flex-1 flex-col">
            <Suspense fallback={<Splash />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/play" element={<Play />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <Nav />
        </>
      )}
    </>
  )
}
