/** A green digital stopwatch readout, e.g. 6930ms -> "06.43" (seconds.centis). */
export default function Clock({ ms }: { ms: number }) {
  const totalCs = Math.max(0, Math.floor(ms / 10))
  const seconds = Math.floor(totalCs / 100)
  const centis = totalCs % 100
  const text = `${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
  return (
    <div className="clock" aria-label={`${(ms / 1000).toFixed(2)} seconds`}>
      {text}
    </div>
  )
}
