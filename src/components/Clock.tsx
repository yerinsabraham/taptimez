/**
 * A green 7-segment LED/LCD stopwatch readout (DSEG7 font).
 * 6930ms -> "06.43" (seconds.centiseconds), with faint unlit segments behind.
 */
export default function Clock({ ms }: { ms: number }) {
  const totalCs = Math.max(0, Math.floor(ms / 10))
  const seconds = Math.floor(totalCs / 100)
  const centis = totalCs % 100
  const text = `${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`

  return (
    <div className="clock" aria-label={`${(ms / 1000).toFixed(2)} seconds`}>
      {/* all-segments-on backdrop, like an unlit LCD */}
      <span className="clock__ghost" aria-hidden="true">
        88.88
      </span>
      <span className="clock__value">{text}</span>
    </div>
  )
}
