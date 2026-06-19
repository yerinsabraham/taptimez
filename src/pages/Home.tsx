import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'

export default function Home() {
  const { profile } = useAuth()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black tracking-tight text-transparent">
          TapTimez
        </h1>
        <p className="mt-3 text-white/60">
          Predict the time. Tap to start, tap to stop,
          <br />
          and land as close to the target as you can — no clock.
        </p>
      </div>

      {profile && <p className="text-sm text-white/40">Welcome, {profile.username} 👋</p>}

      <Link
        to="/play"
        className="rounded-full bg-indigo-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-500/30 transition active:scale-95"
      >
        Play
      </Link>
    </div>
  )
}
