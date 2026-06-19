import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { logOut } from '../lib/auth-actions.ts'
import { claimUsernameAndCreateProfile, validateUsername } from '../lib/profile.ts'

export default function UsernameSetup() {
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const valid = validateUsername(username) !== null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setBusy(true)
    try {
      await claimUsernameAndCreateProfile(user, username)
      // Profile subscription will pick up the new doc and advance the app.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save username.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center gap-8 px-6 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-tight">Pick a username</h1>
        <p className="mt-2 text-sm text-white/50">This is how you'll show up on the leaderboard.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg text-white outline-none focus:border-indigo-400"
        />
        <p className="text-center text-xs text-white/30">3 to 15 letters, numbers, or underscores</p>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={!valid || busy}
          className="rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </form>

      <button
        onClick={() => logOut()}
        className="text-center text-sm text-white/40 hover:text-white/70"
      >
        Sign out
      </button>
    </div>
  )
}
