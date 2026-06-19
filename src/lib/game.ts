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

/** A short reaction based on how far off the stop was from the target. */
export function accuracyMessage(errorMs: number): string {
  if (errorMs <= 50) return '🎯 Perfect!'
  if (errorMs <= 150) return '🔥 Incredible!'
  if (errorMs <= 400) return 'Nice!'
  if (errorMs <= 900) return 'Not bad'
  return 'Keep practicing'
}
