import { useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { shareResult } from '../lib/share.ts'

/** A "Share" button that builds a result card image and shares (or downloads) it. */
export default function ShareButton({
  targetMs,
  elapsedMs,
  errorMs,
}: {
  targetMs: number
  elapsedMs: number
  errorMs: number
}) {
  const { profile } = useAuth()
  const [label, setLabel] = useState('Share result')
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    if (!profile) return
    setBusy(true)
    setLabel('Preparing…')
    const outcome = await shareResult({
      username: profile.username,
      targetMs,
      elapsedMs,
      errorMs,
    })
    setLabel(
      outcome === 'downloaded'
        ? 'Image saved'
        : outcome === 'failed'
          ? 'Could not share'
          : outcome === 'shared'
            ? 'Shared!'
            : 'Share result',
    )
    setBusy(false)
    setTimeout(() => setLabel('Share result'), 2200)
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-3 font-semibold text-white/80 transition active:scale-95 disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
      {label}
    </button>
  )
}
