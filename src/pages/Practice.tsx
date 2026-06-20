import { useCallback, useEffect, useRef, useState } from 'react'
import TapButton from '../components/TapButton.tsx'
import Clock from '../components/Clock.tsx'
import EyeToggle from '../components/EyeToggle.tsx'
import TargetStepper from '../components/TargetStepper.tsx'
import PerfectBurst from '../components/PerfectBurst.tsx'
import ShareButton from '../components/ShareButton.tsx'
import { accuracyMessage, fmtTarget, isPerfect, toSec } from '../lib/game.ts'
import { feedbackPerfect, feedbackStart, feedbackStop, startTone, stopTone } from '../lib/sound.ts'

type Phase = 'ready' | 'running' | 'result'

export default function Practice({ onBack }: { onBack: () => void }) {
  const [target, setTarget] = useState(5000)
  const [phase, setPhase] = useState<Phase>('ready')
  const [displayMs, setDisplayMs] = useState(0)
  const [showClock, setShowClock] = useState(true)
  const [showPerfect, setShowPerfect] = useState(false)
  const [restartReady, setRestartReady] = useState(false)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const finalRef = useRef(0)
  const lastTapRef = useRef(0)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Cooldown so an accidental tap right after stopping can't skip the result.
  useEffect(() => {
    if (phase !== 'result') return
    setRestartReady(false)
    const t = setTimeout(() => setRestartReady(true), 1500)
    return () => clearTimeout(t)
  }, [phase])

  // Sustained tone while the timer runs.
  useEffect(() => {
    if (phase === 'running') startTone()
    else stopTone()
  }, [phase])
  useEffect(() => () => stopTone(), [])

  const onPress = useCallback(() => {
    // Ignore an accidental quick double-tap (e.g. a shaky finger).
    const now = performance.now()
    if (now - lastTapRef.current < 350) return
    lastTapRef.current = now

    if (phase === 'ready') {
      feedbackStart()
      startRef.current = performance.now()
      setDisplayMs(0)
      setPhase('running')
      const tick = () => {
        setDisplayMs(performance.now() - startRef.current)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } else if (phase === 'running') {
      cancelAnimationFrame(rafRef.current)
      const elapsed = performance.now() - startRef.current
      finalRef.current = elapsed
      const err = Math.abs(Math.round(elapsed) - target)
      setDisplayMs(elapsed)
      setPhase('result')
      if (isPerfect(err)) {
        feedbackPerfect()
        setShowPerfect(true)
      } else {
        feedbackStop()
      }
    }
  }, [phase, target])

  const playAgain = () => {
    setDisplayMs(0)
    setPhase('ready')
  }

  const errorMs = Math.abs(Math.round(finalRef.current) - target)
  // Fully hide the live countdown while practicing blind; always reveal the final time.
  const clockHidden = !showClock && phase !== 'result'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6 text-center">
      {showPerfect && <PerfectBurst onDone={() => setShowPerfect(false)} />}
      <div className="flex w-full items-center justify-between">
        <button onClick={onBack} className="text-sm text-white/40 transition hover:text-white/70">
          ‹ Modes
        </button>
        {phase !== 'result' && <EyeToggle on={showClock} onToggle={() => setShowClock((s) => !s)} />}
      </div>

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

      <Clock ms={displayMs} hidden={clockHidden} />

      {phase !== 'result' ? (
        <>
          <TapButton label={phase === 'ready' ? 'START' : 'STOP'} onPress={onPress} />
          <p className="text-sm text-white/40">
            {phase === 'ready'
              ? 'Tap START, then STOP at your target.'
              : showClock
                ? 'Tap STOP when the clock reaches your target.'
                : 'Feel the time. Tap STOP at your target.'}
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-black">{accuracyMessage(errorMs)}</p>
            <p className="text-sm text-white/50">
              You stopped at{' '}
              <span className="font-semibold text-white/80">{toSec(finalRef.current)}s</span>, off
              by <span className="font-semibold text-white/80">{toSec(errorMs)}s</span>
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
            <ShareButton targetMs={target} elapsedMs={finalRef.current} errorMs={errorMs} />
          </div>
        </>
      )}
    </div>
  )
}
