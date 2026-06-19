import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
import TapButton from '../components/TapButton.tsx'

export default function Home() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 text-center">
      <div>
        <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black tracking-tight text-transparent">
          TapTimez
        </h1>
        <p className="mt-3 text-white/60">
          Predict the time. Tap to start, tap to stop,
          <br />
          and land as close to the target as you can — no clock.
        </p>
        {profile && (
          <p className="mt-3 text-sm text-white/40">Welcome, {profile.username} 👋</p>
        )}
      </div>

      <TapButton label="PLAY" onPress={() => navigate('/play')} />
    </div>
  )
}
