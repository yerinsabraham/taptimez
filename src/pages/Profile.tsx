import { useAuth } from '../lib/auth.tsx'
import { logOut } from '../lib/auth-actions.ts'

function fmtMs(ms: number | null): string {
  return ms == null ? '—' : `${(ms / 1000).toFixed(3)}s`
}

export default function Profile() {
  const { user, profile } = useAuth()
  if (!profile) return null

  const stats = [
    { label: 'Best accuracy', value: profile.bestErrorMs == null ? '—' : `±${fmtMs(profile.bestErrorMs)}` },
    { label: 'Best stop', value: fmtMs(profile.bestElapsedMs) },
    { label: 'Attempts', value: String(profile.totalAttempts) },
    { label: 'Wins', value: String(profile.totalWins) },
  ]

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        {profile.photoURL ? (
          <img src={profile.photoURL} alt="" className="h-20 w-20 rounded-full" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-2xl font-black text-indigo-300">
            {profile.username.charAt(0).toUpperCase()}
          </div>
        )}
        <h2 className="text-2xl font-bold">{profile.username}</h2>
        <p className="text-sm text-white/40">{user?.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <div className="text-xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => logOut()}
        className="mt-auto rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white/80 transition active:scale-[0.98]"
      >
        Sign out
      </button>
    </div>
  )
}
