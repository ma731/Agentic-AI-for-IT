import { useEffect, useRef, useState } from 'react'

// Counts toward the target with a soft ease-out, always starting from whatever is
// currently on screen — so it handles both discrete jumps (0→5) and fast live ticks
// (the downtime €) without snapping or stutter. Honours prefers-reduced-motion.
export default function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString(), duration = 850, className }) {
  const [display, setDisplay] = useState(0)   // start at 0 so KPIs count up on first paint
  const dispRef = useRef(0)                    // live mirror of what's painted
  const rafRef = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = dispRef.current
    const to = value
    if (reduce || Math.abs(to - from) < 0.5) { dispRef.current = to; setDisplay(to); return }

    cancelAnimationFrame(rafRef.current)
    let start = 0
    const ease = (t) => 1 - Math.pow(1 - t, 3) // ease-out-cubic
    const tick = (ts) => {
      if (!start) start = ts
      const t = Math.min((ts - start) / duration, 1)
      const v = from + (to - from) * ease(t)
      dispRef.current = v
      setDisplay(v)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else { dispRef.current = to; setDisplay(to) }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>{format(display)}</span>
}
