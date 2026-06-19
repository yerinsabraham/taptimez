import type { CSSProperties, ReactNode } from 'react'

type TapButtonProps = {
  /** Text/element shown in the center of the button. */
  label?: ReactNode
  /** Tap handler. Omit for a purely decorative (brand) button. */
  onPress?: () => void
  /** Animate the glowing pulse. Default true. */
  pulsing?: boolean
  disabled?: boolean
  /** Fixed diameter in px. Omit to use the responsive default. */
  size?: number
  /** Accessibility label (falls back to a string label). */
  ariaLabel?: string
}

/**
 * The arcade-style green buzzer — TapTimez's signature control.
 * Used as the Play CTA, an auth-screen brand mark, and (Phase 2) the in-game
 * tap target that starts/stops the timer.
 */
export default function TapButton({
  label,
  onPress,
  pulsing = true,
  disabled = false,
  size,
  ariaLabel,
}: TapButtonProps) {
  // size sets the housing diameter; the dome fills the rim-padded interior.
  const housingStyle: CSSProperties | undefined = size
    ? { width: size, height: size }
    : undefined

  const decorative = !onPress

  return (
    <div className="tap-buzzer" style={housingStyle}>
      <button
        type="button"
        onClick={onPress}
        disabled={disabled}
        aria-hidden={decorative || undefined}
        tabIndex={decorative ? -1 : undefined}
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : 'Tap')}
        className={`tap-button${pulsing ? ' tap-button--pulse' : ''}`}
      >
        {label != null && <span className="tap-button__label">{label}</span>}
      </button>
    </div>
  )
}
