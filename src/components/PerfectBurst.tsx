import { useEffect, useMemo } from 'react'

const COLORS = ['#34d36a', '#ffffff', '#fde047', '#38bdf8', '#fb7185', '#a78bfa']

/**
 * A brief full-screen celebration for a perfect score: a confetti burst plus a
 * popping "PERFECT!" title. Auto-dismisses after ~2.4s.
 */
export default function PerfectBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400)
    return () => clearTimeout(t)
  }, [onDone])

  const pieces = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.4
      const dist = 120 + Math.random() * 160
      return {
        dx: `${Math.cos(angle) * dist}px`,
        dy: `${Math.sin(angle) * dist + 120}px`, // a little gravity
        rot: `${Math.random() * 720 - 360}deg`,
        color: COLORS[i % COLORS.length],
        delay: `${Math.random() * 0.12}s`,
      }
    })
  }, [])

  return (
    <div className="perfect-overlay" aria-hidden="true">
      <div className="perfect-pieces">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="confetti"
            style={
              {
                '--dx': p.dx,
                '--dy': p.dy,
                '--rot': p.rot,
                background: p.color,
                animationDelay: p.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="perfect-title">PERFECT!</div>
    </div>
  )
}
