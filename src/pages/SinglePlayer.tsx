import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import TapButton from '../components/TapButton.tsx'
import Clock from '../components/Clock.tsx'
import TargetStepper from '../components/TargetStepper.tsx'
import PerfectBurst from '../components/PerfectBurst.tsx'
import ShareButton from '../components/ShareButton.tsx'
import { recordRankedAttempt } from '../lib/attempts.ts'
import { accuracyMessage, fmtTarget, isPerfect, toSec } from '../lib/game.ts'
import { feedbackPerfect, feedbackStart, feedbackStop, startTone, stopTone } from '../lib/sound.ts'

type Phase = 'ready' | 'running' | 'result'
type Result = { elapsed: number; errorMs: number; isBest: boolean }

export default function SinglePlayer({ onBack }: { onBack: () => void }) {
  const { user } = useAuth()
  const [target, setTarget] = useState(5000)
  const [phase, setPhase] = useState<Phase>('ready')
  const [result, setResult] = useState<Result | null>(null)
  const [showPerfect, setShowPerfect] = useState(false)
  const [restartReady, setRestartReady] = useState(false)
  const [history, setHistory] = useState<{ target: number; elapsed: number; errorMs: number }[]>([])
  const startRef = useRef(0)
  const lastTapRef = useRef(0)

  // Sustained tone while the timer runs.
  useEffect(() => {
    if (phase === 'running') startTone()
    else stopTone()
  }, [phase])
  useEffect(() => () => stopTone(), [])

  // Cooldown so an accidental tap right after stopping can't skip the result.
  useEffect(() => {
    if (phase !== 'result') return
    setRestartReady(false)
    const t = setTimeout(() => setRestartReady(true), 1500)
    return () => clearTimeout(t)
  }, [phase])

  const onPress = useCallback(() => {
    const now = performance.now()
    if (now - lastTapRef.current < 350) return
    lastTapRef.current = now

    if (phase === 'ready') {
      feedbackStart()
      startRef.current = performance.now()
      setPhase('running')
    } else if (phase === 'running') {
      const elapsed = performance.now() - startRef.current
      const errorMs = Math.abs(Math.round(elapsed) - target)
      setResult({ elapsed, errorMs, isBest: false })
      setHistory((h) => [{ target, elapsed, errorMs }, ...h])
      setPhase('result')
      if (isPerfect(errorMs)) {
        feedbackPerfect()
        setShowPerfect(true)
      } else {
        feedbackStop()
      }
      if (user) {
        recordRankedAttempt(user.uid, target, elapsed, 'single')
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
      {showPerfect && <PerfectBurst onDone={() => setShowPerfect(false)} />}
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
          {/* No clock for the player — this is the real skill challenge. */}
          <Clock ms={0} hidden />
          <TapButton label={phase === 'ready' ? 'START' : 'STOP'} onPress={onPress} />
          <p className="text-sm text-white/40">
            {phase === 'ready'
              ? 'No clock. Tap START, then STOP at your target.'
              : 'Feel the time. Tap STOP at your target.'}
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
                <span className="font-semibold text-white/80">{toSec(result.elapsed)}s</span>, off
                by <span className="font-semibold text-white/80">{toSec(result.errorMs)}s</span>
              </p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2">
              <button
                onClick={playAgain}
                disabled={!restartReady}
                className="rounded-full bg-indigo-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-500/30 transition active:scale-95 disabled:opacity-40 disabled:active:scale-100"
              >
                {restartReady ? 'Play again' : 'Read your score…'}
              </button>
              <ShareButton targetMs={target} elapsedMs={result.elapsed} errorMs={result.errorMs} />
            </div>
            {history.length > 1 && <SessionHistory history={history} />}
          </>
        )
      )}
    </div>
  )
}

function SessionHistory({
  history,
}: {
  history: { target: number; elapsed: number; errorMs: number }[]
}) {
  const perfects = history.filter((h) => isPerfect(h.errorMs)).length
  const best = Math.min(...history.map((h) => h.errorMs))
  return (
    <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">This session</p>
        <p className="text-[11px] text-white/40">
          {history.length} rounds · {perfects} perfect · best ±{toSec(best)}s
        </p>
      </div>
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {history.map((h, i) => {
          const perfect = isPerfect(h.errorMs)
          return (
            <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-5 text-center text-xs font-black text-white/40">
                  {history.length - i}
                </span>
                <span className="tabular-nums">{toSec(h.elapsed)}s</span>
                <span className="text-xs text-white/30">to {fmtTarget(h.target)}</span>
              </span>
              <span
                className={`text-xs tabular-nums ${perfect ? 'font-bold text-emerald-400' : 'text-white/50'}`}
              >
                {perfect ? '🎯 perfect' : `±${toSec(h.errorMs)}s`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
