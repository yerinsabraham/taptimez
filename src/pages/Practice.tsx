import { useCallback, useEffect, useRef, useState } from 'react'
import TapButton from '../components/TapButton.tsx'
import Clock from '../components/Clock.tsx'
import EyeToggle from '../components/EyeToggle.tsx'
import TargetStepper from '../components/TargetStepper.tsx'
import { accuracyMessage, toSec } from '../lib/game.ts'

type Phase = 'ready' | 'running' | 'result'

export default function Practice({ onBack }: { onBack: () => void }) {
  const [target, setTarget] = useState(5000)
  const [phase, setPhase] = useState<Phase>('ready')
  const [displayMs, setDisplayMs] = useState(0)
  const [showClock, setShowClock] = useState(true)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const finalRef = useRef(0)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const onPress = useCallback(() => {
    if (phase === 'ready') {
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
      setDisplayMs(elapsed)
      setPhase('result')
    }
  }, [phase])

  const playAgain = () => {
    setDisplayMs(0)
    setPhase('ready')
  }

  const errorMs = Math.abs(Math.round(finalRef.current) - target)
  // Hide the live countdown while practicing blind; always reveal the final time.
  const clockBlank = !showClock && phase !== 'result'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6 text-center">
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
          <p className="mt-1 text-3xl font-black tabular-nums text-emerald-400">
            {toSec(target)}
            <span className="text-lg text-white/40">s</span>
          </p>
        </div>
      )}

      <Clock ms={displayMs} blank={clockBlank} />

      {phase !== 'result' ? (
        <>
          <TapButton label={phase === 'ready' ? 'START' : 'STOP'} onPress={onPress} />
          <p className="text-sm text-white/40">
            {phase === 'ready'
              ? 'Tap START, then STOP at your target.'
              : showClock
                ? 'Tap STOP when the clock reaches your target.'
                : 'Feel the time — tap STOP at your target.'}
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-black">{accuracyMessage(errorMs)}</p>
            <p className="text-sm text-white/50">
              You stopped at{' '}
              <span className="font-semibold text-white/80">{toSec(finalRef.current)}s</span> —
              off by <span className="font-semibold text-white/80">{toSec(errorMs)}s</span>
            </p>
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
