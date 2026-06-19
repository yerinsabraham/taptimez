import { toSec } from '../lib/game.ts'

export const MIN_TARGET = 1000
export const MAX_TARGET = 60000
const STEP = 1000

/** A − value + control for choosing a target duration (1–60s). */
export default function TargetStepper({
  targetMs,
  onChange,
}: {
  targetMs: number
  onChange: (ms: number) => void
}) {
  const adjust = (delta: number) =>
    onChange(Math.min(MAX_TARGET, Math.max(MIN_TARGET, targetMs + delta)))

  return (
    <div className="flex items-center gap-5">
      <StepBtn label="−" onClick={() => adjust(-STEP)} disabled={targetMs <= MIN_TARGET} />
      <p className="w-28 text-4xl font-black tabular-nums text-emerald-400">
        {toSec(targetMs)}
        <span className="text-xl text-white/40">s</span>
      </p>
      <StepBtn label="+" onClick={() => adjust(STEP)} disabled={targetMs >= MAX_TARGET} />
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
