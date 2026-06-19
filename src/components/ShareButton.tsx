import { useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { resultShareText, shareResult, type ShareCardData } from '../lib/share.ts'

/** Share a result card image, plus a "Copy link" that copies a pasteable text link. */
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
  const [shareLabel, setShareLabel] = useState('Share result')
  const [copyLabel, setCopyLabel] = useState('Copy link')
  const [busy, setBusy] = useState(false)

  if (!profile) return null
  const data: ShareCardData = { username: profile.username, targetMs, elapsedMs, errorMs }

  const onShare = async () => {
    setBusy(true)
    setShareLabel('Preparing…')
    const outcome = await shareResult(data)
    setShareLabel(
      outcome === 'downloaded'
        ? 'Image saved'
        : outcome === 'failed'
          ? 'Could not share'
          : outcome === 'shared'
            ? 'Shared!'
            : 'Share result',
    )
    setBusy(false)
    setTimeout(() => setShareLabel('Share result'), 2200)
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(resultShareText(data))
      setCopyLabel('Link copied!')
    } catch {
      setCopyLabel('Copy failed')
    }
    setTimeout(() => setCopyLabel('Copy link'), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onShare}
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-3 font-semibold text-white/80 transition active:scale-95 disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        {shareLabel}
      </button>

      <button
        onClick={onCopy}
        className="flex items-center justify-center gap-2 text-sm font-medium text-white/50 transition hover:text-white/80"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copyLabel}
      </button>
    </div>
  )
}
