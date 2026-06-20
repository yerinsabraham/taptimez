import { useState, type FormEvent } from 'react'
import { authErrorMessage, emailSignIn, emailSignUp, googleSignIn } from '../lib/auth-actions.ts'
import { track } from '../lib/analytics.ts'
import TapButton from '../components/TapButton.tsx'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') await emailSignIn(email, password)
      else await emailSignUp(email, password)
      track(mode === 'signin' ? 'login' : 'sign_up', { method: 'password' })
      // On success the auth listener takes over and re-renders the app.
    } catch (err) {
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setBusy(true)
    try {
      await googleSignIn()
      track('login', { method: 'google' })
    } catch (err) {
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-5 text-center">
        <TapButton size={92} pulsing />
        <div>
          <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl font-black tracking-tight text-transparent">
            TapTimez
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {mode === 'signin' ? 'Sign in to play' : 'Create your account'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-400"
        />
        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-400"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-white/30">
        <div className="h-px flex-1 bg-white/10" />
        OR
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={busy}
        className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        Continue with Google
      </button>

      <button
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin')
          setError(null)
        }}
        className="text-center text-sm text-white/50 hover:text-white/80"
      >
        {mode === 'signin'
          ? "Don't have an account? Sign up"
          : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
