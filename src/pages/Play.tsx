import { useCallback, useRef, useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import TapButton from '../components/TapButton.tsx'
import { recordSoloAttempt } from '../lib/attempts.ts'
import { accuracyMessage, randomTargetMs, toSec } from '../lib/game.ts'

type Phase = 'ready' | 'running' | 'result'
type Result = { elapsed: number; errorMs: number; isBest: boolean }

export default function Play() {
  const { user } = useAuth()
  const [target, setTarget] = useState(randomTargetMs)
  const [phase, setPhase] = useState<Phase>('ready')
  const [result, setResult] = useState<Result | null>(null)
  const startRef = useRef(0)

  const onPress = useCallback(() => {
    if (phase === 'ready') {
      // Start: record the local high-resolution timestamp.
      startRef.current = performance.now()
      setPhase('running')
      return
    }
    if (phase === 'running') {
      // Stop: the elapsed time is measured entirely on this device.
      const elapsed = performance.now() - startRef.current
      const errorMs = Math.abs(Math.round(elapsed) - target)
      setResult({ elapsed, errorMs, isBest: false })
      setPhase('result')
      if (user) {
        recordSoloAttempt(user.uid, target, elapsed)
          .then((r) => setResult({ elapsed, errorMs: r.errorMs, isBest: r.isBest }))
          .catch((err) => console.error('failed to save attempt', err))
      }
    }
  }, [phase, target, user])

  const playAgain = () => {
    setTarget(randomTargetMs())
    setResult(null)
    setPhase('ready')
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      {phase === 'ready' && (
        <>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Your target</p>
            <p className="mt-1 text-6xl font-black tabular-nums text-indigo-300">
              {toSec(target)}
              <span className="text-2xl text-white/40">s</span>
            </p>
          </div>
          <TapButton label="START" onPress={onPress} />
          <p className="max-w-xs text-sm text-white/50">
            Tap <strong className="text-white/80">START</strong>, then tap{' '}
            <strong className="text-white/80">STOP</strong> when you feel {toSec(target)}s
            has passed. No clock!
          </p>
        </>
      )}

      {phase === 'running' && (
        <>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Target {toSec(target)}s
            </p>
            <p className="mt-1 text-2xl font-bold text-white/70">Feel the time…</p>
          </div>
          <TapButton label="STOP" onPress={onPress} />
          <p className="text-sm text-white/40">Tap when you think time's up.</p>
        </>
      )}

      {phase === 'result' && result && (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-black">{accuracyMessage(result.errorMs)}</p>
            {result.isBest && (
              <p className="text-sm font-semibold text-emerald-400">★ New personal best!</p>
            )}
          </div>

          <div className="grid w-full max-w-xs grid-cols-3 gap-2">
            <Stat label="Target" value={`${toSec(target)}s`} />
            <Stat label="You" value={`${toSec(result.elapsed)}s`} accent />
            <Stat label="Off by" value={`${toSec(result.errorMs)}s`} />
          </div>

          <button
            onClick={playAgain}
            className="rounded-full bg-indigo-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-500/30 transition active:scale-95"
          >
            Play again
          </button>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div
        className={`text-lg font-bold tabular-nums ${accent ? 'text-indigo-300' : 'text-white'}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  )
}
