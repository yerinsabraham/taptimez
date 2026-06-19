/**
 * A green 7-segment LED/LCD stopwatch readout (DSEG7 font).
 * 83930ms -> "01:23.93" (minutes:seconds.centiseconds), with faint unlit
 * segments behind.
 *  - `blank`: show the "off" LCD (faint ghost segments, no digits).
 *  - `hidden`: fully invisible, but its space is reserved (no layout shift).
 */
export default function Clock({
  ms,
  blank = false,
  hidden = false,
}: {
  ms: number
  blank?: boolean
  hidden?: boolean
}) {
  const totalCs = Math.max(0, Math.floor(ms / 10))
  const minutes = Math.floor(totalCs / 6000)
  const seconds = Math.floor((totalCs % 6000) / 100)
  const centis = totalCs % 100
  const pad = (n: number) => String(n).padStart(2, '0')
  const text = `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`

  return (
    <div
      className="clock"
      style={hidden ? { visibility: 'hidden' } : undefined}
      aria-hidden={hidden || blank || undefined}
      aria-label={hidden || blank ? undefined : `${(ms / 1000).toFixed(2)} seconds`}
    >
      {/* all-segments-on backdrop, like an unlit LCD */}
      <span className="clock__ghost" aria-hidden="true">
        88:88.88
      </span>
      {!blank && <span className="clock__value">{text}</span>}
    </div>
  )
}
