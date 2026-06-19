import { useCallback, useEffect, useRef, useState } from 'react'
import TapButton from '../components/TapButton.tsx'
import Clock from '../components/Clock.tsx'
import { accuracyMessage, toSec } from '../lib/game.ts'

type Mode = 'practice' | 'player' | 'timekeeper'

export default function Play() {
  const [mode, setMode] = useState<Mode | null>(null)

  if (mode === 'practice') return <PracticeGame onBack={() => setMode(null)} />
  return <ModeSelect onPick={setMode} />
}

/* ---------------- Mode select ---------------- */

function ModeSelect({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <h2 className="text-2xl font-black">Choose a mode</h2>
        <p className="mt-1 text-sm text-white/50">How do you want to play?</p>
      </div>

      <div className="flex flex-col gap-3">
        <ModeCard
          title="Practice"
          desc="Pick a target and train with the clock visible."
          onClick={() => onPick('practice')}
        />
        <ModeCard
          title="Player"
          desc="Single or multiplayer — tap to stop with no clock."
          soon
        />
        <ModeCard
          title="Timekeeper"
          desc="Host a game and watch the clock while players stop it."
          soon
        />
      </div>
    </div>
  )
}

function ModeCard({
  title,
  desc,
  onClick,
  soon,
}: {
  title: string
  desc: string
  onClick?: () => void
  soon?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={soon}
      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition active:scale-[0.99] disabled:opacity-40"
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{title}</span>
          {soon && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
              Soon
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-white/50">{desc}</p>
      </div>
      <span className="text-xl text-white/30">›</span>
    </button>
  )
}

/* ---------------- Practice mode ---------------- */

type Phase = 'ready' | 'running' | 'result'

const MIN_TARGET = 1000
const MAX_TARGET = 60000
const STEP = 1000

function PracticeGame({ onBack }: { onBack: () => void }) {
  const [target, setTarget] = useState(5000) // player-chosen target
  const [phase, setPhase] = useState<Phase>('ready')
  const [displayMs, setDisplayMs] = useState(0)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const finalRef = useRef(0)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const adjust = (delta: number) =>
    setTarget((t) => Math.min(MAX_TARGET, Math.max(MIN_TARGET, t + delta)))

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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 py-6 text-center">
      <button
        onClick={onBack}
        className="self-start text-sm text-white/40 transition hover:text-white/70"
      >
        ‹ Modes
      </button>

      {phase === 'ready' ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Set your target</p>
          <div className="flex items-center gap-5">
            <StepBtn label="−" onClick={() => adjust(-STEP)} disabled={target <= MIN_TARGET} />
            <p className="w-28 text-4xl font-black tabular-nums text-emerald-400">
              {toSec(target)}
              <span className="text-xl text-white/40">s</span>
            </p>
            <StepBtn label="+" onClick={() => adjust(STEP)} disabled={target >= MAX_TARGET} />
          </div>
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

      <Clock ms={displayMs} />

      {phase !== 'result' ? (
        <>
          <TapButton label={phase === 'ready' ? 'START' : 'STOP'} onPress={onPress} />
          <p className="text-sm text-white/40">
            {phase === 'ready'
              ? 'Tap START, then STOP at your target.'
              : 'Tap STOP when the clock reaches your target.'}
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

function StepBtn({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-2xl font-bold text-white transition active:scale-95 disabled:opacity-30"
    >
      {label}
    </button>
  )
}
