/** Game constants and pure helpers shared across modes. */

export const MIN_TARGET_SEC = 3
export const MAX_TARGET_SEC = 12

/**
 * A round's target duration. Varies per round (NOT fixed) — a random whole
 * number of seconds in [MIN_TARGET_SEC, MAX_TARGET_SEC], matching the TikTok
 * "stop at N seconds" format.
 */
export function randomTargetMs(): number {
  const span = MAX_TARGET_SEC - MIN_TARGET_SEC + 1
  const sec = MIN_TARGET_SEC + Math.floor(Math.random() * span)
  return sec * 1000
}

/** Format milliseconds as seconds with 2 decimals, e.g. 6930 -> "6.93". */
export function toSec(ms: number): string {
  return (ms / 1000).toFixed(2)
}

/** Friendly target label: "5s" under a minute, "1:30" at/over a minute. */
export function fmtTarget(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Within this gap from the target counts as a "perfect" hit (a true bullseye). */
export const PERFECT_MS = 20

export function isPerfect(errorMs: number): boolean {
  return errorMs <= PERFECT_MS
}

/** A short reaction based on how far off the stop was from the target. */
export function accuracyMessage(errorMs: number): string {
  if (errorMs <= 20) return '🎯 Perfect!'
  if (errorMs <= 80) return '🔥 So close!'
  if (errorMs <= 250) return 'Nice!'
  if (errorMs <= 700) return 'Not bad'
  return 'Keep practicing'
}
