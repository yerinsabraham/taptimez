import { fmtTarget } from '../lib/game.ts'

export const MIN_TARGET = 1000
export const MAX_TARGET = 600000 // 10:00

/** A control for choosing a target duration (1s – 10:00) with quick steps. */
export default function TargetStepper({
  targetMs,
  onChange,
}: {
  targetMs: number
  onChange: (ms: number) => void
}) {
  const set = (ms: number) => onChange(Math.min(MAX_TARGET, Math.max(MIN_TARGET, ms)))
  const bump = (delta: number) => set(targetMs + delta)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-5">
        <StepBtn label="−" onClick={() => bump(-1000)} disabled={targetMs <= MIN_TARGET} />
        <p className="w-28 text-4xl font-black tabular-nums text-emerald-400">{fmtTarget(targetMs)}</p>
        <StepBtn label="+" onClick={() => bump(1000)} disabled={targetMs >= MAX_TARGET} />
      </div>
      <div className="flex gap-2">
        <QuickBtn label="−10s" onClick={() => bump(-10000)} disabled={targetMs <= MIN_TARGET} />
        <QuickBtn label="+10s" onClick={() => bump(10000)} disabled={targetMs >= MAX_TARGET} />
        <QuickBtn label="+1m" onClick={() => bump(60000)} disabled={targetMs >= MAX_TARGET} />
      </div>
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

function QuickBtn({
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
      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition active:scale-95 disabled:opacity-30"
    >
      {label}
    </button>
  )
}
