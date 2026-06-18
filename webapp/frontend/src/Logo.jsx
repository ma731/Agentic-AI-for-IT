// Operations Sentinel brandmark — a hexagonal "sentinel" enclosing the orchestration
// graph (a central supervisor node radiating to its agents). Scalable SVG, themeable:
// the frame uses currentColor; the core uses `accent`. Industrial / brutalist geometry.
const HEX = '16,2.5 27.7,9.25 27.7,22.75 16,29.5 4.3,22.75 4.3,9.25'
const SAT = [
  [16, 2.5], [27.7, 9.25], [27.7, 22.75], [16, 29.5], [4.3, 22.75], [4.3, 9.25],
]

export default function Logo({ size = 28, accent = '#14e8a0' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" role="img">
      <polygon points={HEX} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" opacity="0.85" />
      {SAT.map(([x, y], i) => (
        <line key={i} x1="16" y1="16" x2={x} y2={y} stroke="currentColor" strokeWidth="1" opacity="0.32" />
      ))}
      {SAT.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.7" fill="currentColor" opacity="0.7" />
      ))}
      <circle cx="16" cy="16" r="4.6" fill={accent} />
      <circle cx="16" cy="16" r="4.6" fill={accent} opacity="0.35">
        <animate attributeName="r" values="4.6;6.4;4.6" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0;0.35" dur="2.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}
