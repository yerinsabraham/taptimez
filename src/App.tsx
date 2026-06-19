import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav.tsx'
import Home from './pages/Home.tsx'
import Play from './pages/Play.tsx'
import Leaderboard from './pages/Leaderboard.tsx'
import Profile from './pages/Profile.tsx'

export default function App() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<Play />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <Nav />
    </div>
  )
}
