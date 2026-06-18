import { AGENTS } from './agentsMeta.js'

// radial layout: supervisor at centre, 5 specialists evenly around it
const CX = 380, CY = 222, R = 170
const COL = {
  reliability: '#4d9bff', supply_chain: '#14e8a0', production: '#a78bfa',
  quality: '#ffb84d', compliance_safety: '#ff6b81',
}
const NODES = AGENTS.map((a, i) => {
  const ang = (-90 + i * 72) * Math.PI / 180
  return { ...a, x: CX + R * Math.cos(ang), y: CY + R * Math.sin(ang), col: COL[a.id] }
})

export default function AgentGraph({ agentStatus = {}, running, risk }) {
  const anyActive = Object.values(agentStatus).includes('active')
  return (
    <div className="ag-stage">
      <div className="ag-aurora a1" />
      <div className="ag-aurora a2" />
      <div className="ag-aurora a3" />
      <div className="ag-stars" />

      <div className="ag-cap">
        <span className="ag-cap-t">Live Orchestration</span>
        <span className="ag-cap-s">{running ? (anyActive ? 'supervisor routing…' : 'engaging agents…') : 'standing by'}</span>
      </div>

      <svg className="ag-svg" viewBox="0 0 760 444" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="ag-orch" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#fff4d6" />
            <stop offset="45%" stopColor="#ffd479" />
            <stop offset="100%" stopColor="#15c98c" />
          </radialGradient>
          <filter id="ag-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="ag-glow-lg" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="13" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* edges */}
        {NODES.map((n) => {
          const st = agentStatus[n.id]
          const lit = st === 'active' || st === 'done'
          const d = `M${CX},${CY} L${n.x},${n.y}`
          return (
            <g key={`e-${n.id}`}>
              <path id={`ag-edge-${n.id}`} d={d} fill="none"
                stroke={lit ? n.col : 'rgba(255,255,255,0.10)'} strokeWidth={lit ? 2.4 : 1.4}
                strokeLinecap="round"
                className={st === 'active' ? 'ag-edge-live' : ''}
                style={st === 'active' ? { filter: 'url(#ag-glow)' } : undefined} />
              {st === 'active' && (
                <circle r="4.5" fill={n.col} filter="url(#ag-glow)">
                  <animateMotion dur="1.25s" repeatCount="indefinite" rotate="auto">
                    <mpath href={`#ag-edge-${n.id}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          )
        })}

        {/* orchestrator */}
        <g filter="url(#ag-glow-lg)">
          <circle cx={CX} cy={CY} r="46" fill="none" stroke="rgba(255,212,121,0.5)" strokeWidth="1.3"
            strokeDasharray="5 9" className="ag-orch-ring" />
          <circle cx={CX} cy={CY} r="34" fill="url(#ag-orch)" className={running ? 'ag-orch-core live' : 'ag-orch-core'} />
        </g>
        <text x={CX} y={CY - 1} textAnchor="middle" className="ag-orch-label">SUP</text>
        <text x={CX} y={CY + 11} textAnchor="middle" className="ag-orch-sub">ORCHESTRATOR</text>

        {/* agent nodes */}
        {NODES.map((n) => {
          const st = agentStatus[n.id] || 'idle'
          return (
            <g key={`n-${n.id}`} className={`ag-node ${st}`} style={{ '--nc': n.col }}>
              {(st === 'active' || st === 'done') && (
                <circle cx={n.x} cy={n.y} r="30" fill="none" stroke={n.col} strokeWidth="1.2"
                  opacity={st === 'active' ? 0.9 : 0.4} className={st === 'active' ? 'ag-halo' : ''} />
              )}
              <circle cx={n.x} cy={n.y} r="21"
                fill={st === 'idle' ? 'rgba(255,255,255,0.05)' : n.col}
                stroke={st === 'idle' ? 'rgba(255,255,255,0.16)' : n.col}
                strokeWidth="1.5"
                filter={st === 'active' || st === 'done' ? 'url(#ag-glow)' : undefined}
                className={st === 'active' ? 'ag-core-live' : ''} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" className="ag-node-ic">{n.name[0]}</text>
              <text x={n.x} y={n.y + 40} textAnchor="middle" className="ag-node-label">{n.name}</text>
              {st !== 'idle' && (
                <text x={n.x} y={n.y + 53} textAnchor="middle" className="ag-node-state" fill={st === 'done' ? '#14e8a0' : n.col}>
                  {st === 'active' ? 'reasoning' : st === 'done' ? 'done' : st}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
