import { useCallback, useRef, useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import TapButton from '../components/TapButton.tsx'
import Clock from '../components/Clock.tsx'
import TargetStepper from '../components/TargetStepper.tsx'
import { recordSoloAttempt } from '../lib/attempts.ts'
import { accuracyMessage, fmtTarget, toSec } from '../lib/game.ts'

type Phase = 'ready' | 'running' | 'result'
type Result = { elapsed: number; errorMs: number; isBest: boolean }

export default function SinglePlayer({ onBack }: { onBack: () => void }) {
  const { user } = useAuth()
  const [target, setTarget] = useState(5000)
  const [phase, setPhase] = useState<Phase>('ready')
  const [result, setResult] = useState<Result | null>(null)
  const startRef = useRef(0)

  const onPress = useCallback(() => {
    if (phase === 'ready') {
      startRef.current = performance.now()
      setPhase('running')
    } else if (phase === 'running') {
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
    setResult(null)
    setPhase('ready')
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6 text-center">
      <button onClick={onBack} className="self-start text-sm text-white/40 transition hover:text-white/70">
        ‹ Back
      </button>

      {phase === 'ready' ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Set your target</p>
          <TargetStepper targetMs={target} onChange={setTarget} />
        </div>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Target</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-emerald-400">{fmtTarget(target)}</p>
        </div>
      )}

      {phase !== 'result' ? (
        <>
          {/* No clock — this is the real skill challenge. */}
          <Clock ms={0} blank />
          <TapButton label={phase === 'ready' ? 'START' : 'STOP'} onPress={onPress} />
          <p className="text-sm text-white/40">
            {phase === 'ready'
              ? 'No clock. Tap START, then STOP at your target.'
              : 'Feel the time — tap STOP at your target.'}
          </p>
        </>
      ) : (
        result && (
          <>
            <Clock ms={result.elapsed} />
            <div className="flex flex-col gap-1">
              <p className="text-2xl font-black">{accuracyMessage(result.errorMs)}</p>
              {result.isBest && (
                <p className="text-sm font-semibold text-emerald-400">★ New personal best!</p>
              )}
              <p className="text-sm text-white/50">
                Stopped at{' '}
                <span className="font-semibold text-white/80">{toSec(result.elapsed)}s</span> — off
                by <span className="font-semibold text-white/80">{toSec(result.errorMs)}s</span>
              </p>
            </div>
            <button
              onClick={playAgain}
              className="rounded-full bg-indigo-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-500/30 transition active:scale-95"
            >
              Play again
            </button>
          </>
        )
      )}
    </div>
  )
}
