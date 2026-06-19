import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase.ts'
import { useAuth } from '../lib/auth.tsx'
import Splash from '../components/Splash.tsx'
import type { UserProfile } from '../lib/profile.ts'

type Row = { id: string; username: string; perfectCount: number; bestErrorMs: number | null }

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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
            }
          })
          .filter((r) => r.perfectCount > 0)
        setRows(list)
      })
      .catch((err) => {
        console.error('leaderboard error', err)
        setError('Could not load the leaderboard. Try again in a moment.')
      })
  }, [])

  if (error) {
    return <Centered>{error}</Centered>
  }
  if (!rows) return <Splash />

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-8">
      <div className="text-center">
        <h2 className="text-2xl font-black">Ranks</h2>
        <p className="mt-1 text-sm text-white/50">Most perfect scores wins. Earliest breaks ties.</p>
      </div>

      {rows.length === 0 ? (
        <Centered>No perfect scores yet. Be the first to nail one!</Centered>
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-sm text-white/50">
      {children}
    </div>
  )
}
