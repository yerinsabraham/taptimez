import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import { useAuth } from '../lib/auth.tsx'
import Splash from '../components/Splash.tsx'
import type { UserProfile } from '../lib/profile.ts'

type Row = {
  id: string
  username: string
  perfectCount: number
  bestErrorMs: number | null
  flagged?: boolean
}

const MEDALS = ['🥇', '🥈', '🥉']

type LoadState = 'warming' | 'failed' | null

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<LoadState>(null)

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('perfectCount', 'desc'),
      orderBy('lastPerfectAt', 'asc'),
      limit(100),
    )
    getDocs(q)
      .then((snap) => {
        const list = snap.docs
          .map((d) => {
            const u = d.data() as UserProfile
            return {
              id: d.id,
              username: u.username,
              perfectCount: u.perfectCount ?? 0,
              bestErrorMs: u.bestErrorMs,
              flagged: (u as { flagged?: boolean }).flagged,
            }
          })
          .filter((r) => r.perfectCount > 0 && !r.flagged)
        setRows(list)
      })
      .catch((err: unknown) => {
        console.error('leaderboard error', err)
        const code = (err as { code?: string })?.code
        const msg = (err as { message?: string })?.message ?? ''
        const building = code === 'failed-precondition' || /index/i.test(msg)
        setError(building ? 'warming' : 'failed')
      })
  }, [])

  if (error === 'warming') {
    return (
      <CenteredHero
        emoji="⏳"
        title="Ranks are warming up"
        subtitle="The leaderboard is getting ready. Check back in a minute."
      />
    )
  }
  if (error === 'failed') {
    return (
      <CenteredHero
        emoji="⚠️"
        title="Couldn't load ranks"
        subtitle="Something went wrong. Please try again shortly."
      />
    )
  }
  if (!rows) return <Splash />

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8">
      <div className="text-center">
        <h2 className="text-2xl font-black">Ranks</h2>
        <p className="mt-1 text-sm text-white/50">Most perfect scores wins. Earliest breaks ties.</p>
      </div>

      {rows.length === 0 ? (
        <CenteredHero
          emoji="🎯"
          title="No ranks yet"
          subtitle="Nobody has a perfect score yet. Land one to claim the #1 spot!"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const isMe = r.id === user?.uid
            return (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                  i === 0
                    ? 'border-emerald-400/40 bg-emerald-400/10'
                    : 'border-white/10 bg-white/5'
                } ${isMe ? 'ring-1 ring-indigo-400/60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-black text-white/50">
                    {MEDALS[i] ?? i + 1}
                  </span>
                  <span className="font-semibold">
                    {r.username}
                    {isMe && <span className="ml-2 text-xs text-indigo-300">you</span>}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums text-emerald-400">{r.perfectCount}</div>
                  <div className="text-[10px] uppercase tracking-wide text-white/40">
                    perfect{r.perfectCount === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CenteredHero({
  emoji,
  title,
  subtitle,
}: {
  emoji: string
  title: string
  subtitle: string
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="text-5xl">{emoji}</div>
      <div className="text-xl font-black">{title}</div>
      <p className="max-w-xs text-sm text-white/50">{subtitle}</p>
    </div>
  )
}
