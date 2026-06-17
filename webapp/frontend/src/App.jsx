import { useState, useRef, useEffect, useCallback } from 'react'
import { ALERT, SCENARIOS, RESOLUTIONS } from './cascade.js'

const AGENTS = [
  { id: 'reliability', name: 'Reliability', chal: 'CH-1 · Predictive Maintenance' },
  { id: 'supply_chain', name: 'Supply Chain', chal: 'CH-2 · Sourcing & Risk' },
  { id: 'production', name: 'Production · Human-Robot', chal: 'CH-3 · Scheduling' },
  { id: 'quality', name: 'Quality · Traceability', chal: 'CH-4 · Defect Correlation' },
  { id: 'compliance_safety', name: 'Compliance · Safety', chal: 'CH-5 · OSHA Gate' },
]
const AGENT_MAP = Object.fromEntries(AGENTS.map((a) => [a.id, a]))
const RATE_PER_S = 162000 / 86400 // €/second of downtime exposure

const FRESH_STATUS = () => Object.fromEntries(AGENTS.map((a) => [a.id, 'idle']))

export default function App() {
  const [scenario, setScenario] = useState('happy')
  const [mode, setMode] = useState('replay') // 'replay' | 'live'
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)

  const [timeline, setTimeline] = useState([])
  const [agentStatus, setAgentStatus] = useState(FRESH_STATUS)
  const [runStatus, setRunStatus] = useState('Standing by')
  const [risk, setRisk] = useState('PENDING')
  const [approval, setApproval] = useState(null)
  const [plan, setPlan] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [clock, setClock] = useState('')

  const queueRef = useRef([])
  const timerRef = useRef(null)
  const esRef = useRef(null)
  const idRef = useRef(0)
  const streamEndRef = useRef(null)

  const nextId = () => ++idRef.current

  // wall clock
  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString('en-GB')), 1000)
    setClock(new Date().toLocaleTimeString('en-GB'))
    return () => clearInterval(id)
  }, [])

  // downtime-exposure ticker while a run is in flight
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed((e) => e + 0.2), 200)
    return () => clearInterval(id)
  }, [running])

  // keep the transcript scrolled to the newest entry
  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [timeline, plan, approval])

  const pushItem = useCallback((item) => {
    setTimeline((prev) => [...prev, { id: nextId(), ...item }])
  }, [])

  const updateActiveBlock = (prev, agent, fn) => {
    let idx = -1
    for (let i = prev.length - 1; i >= 0; i--) {
      if (prev[i].kind === 'block' && prev[i].agent === agent && prev[i].status === 'active') { idx = i; break }
    }
    if (idx === -1) return prev
    const copy = prev.slice()
    copy[idx] = fn(copy[idx])
    return copy
  }

  const applyEvent = useCallback((ev) => {
    switch (ev.type) {
      case 'perception':
        pushItem({ kind: 'system', text: ev.message })
        setRunStatus('Perceiving alert')
        break
      case 'route':
        setAgentStatus((s) => ({ ...s, [ev.to]: 'active' }))
        setRunStatus(`Routing → ${AGENT_MAP[ev.to]?.name || ev.to}`)
        pushItem({ kind: 'block', agent: ev.to, tools: [], report: null, status: 'active' })
        break
      case 'tool_call':
        setTimeline((prev) => updateActiveBlock(prev, ev.agent, (b) => ({ ...b, tools: [...b.tools, ev] })))
        break
      case 'agent_report':
        setTimeline((prev) => updateActiveBlock(prev, ev.agent, (b) => ({ ...b, report: ev.report, status: 'done' })))
        setAgentStatus((s) => ({ ...s, [ev.agent]: 'done' }))
        if (ev.risk) setRisk(ev.risk)
        setRunStatus(`${AGENT_MAP[ev.agent]?.name || ev.agent} reported`)
        break
      case 'agent_error':
        setTimeline((prev) => updateActiveBlock(prev, ev.agent, (b) => ({ ...b, report: ev.error, status: 'error' })))
        setAgentStatus((s) => ({ ...s, [ev.agent]: 'error' }))
        break
      case 'decision':
      case 'escalation':
        pushItem({ kind: 'note', text: ev.message })
        break
      case 'approval_request':
        setApproval(ev)
        setRunStatus('Awaiting human approval')
        break
      case 'human_decision':
        pushItem({ kind: 'human', text: `Human decision — ${ev.decision}${ev.by ? ' · ' + ev.by : ''}` })
        setApproval(null)
        break
      case 'plan':
        setPlan({ status: ev.status || 'complete', lines: ev.lines || [], roi: ev.roi, text: ev.text })
        if (ev.status === 'escalated') setRisk((r) => (r === 'PENDING' ? 'ESCALATE' : r))
        setRunStatus(ev.status === 'complete' ? 'Plan complete' : ev.status === 'halted' ? 'Plan halted' : 'Escalated to human')
        setRunning(false)
        setCompleted(true)
        break
      default:
        break
    }
  }, [pushItem])

  const reset = useCallback(() => {
    clearTimeout(timerRef.current)
    esRef.current?.close()
    queueRef.current = []
    idRef.current = 0
    setTimeline([])
    setAgentStatus(FRESH_STATUS())
    setRisk('PENDING')
    setApproval(null)
    setPlan(null)
    setElapsed(0)
    setCompleted(false)
  }, [])

  // ---- replay engine (no backend / no key / no cost) ----
  const pump = useCallback(() => {
    if (!queueRef.current.length) return
    const ev = queueRef.current.shift()
    timerRef.current = setTimeout(() => {
      applyEvent(ev)
      if (ev.type === 'approval_request') return // wait for the human
      pump()
    }, ev.t ?? 400)
  }, [applyEvent])

  // ---- live engine (FastAPI SSE) ----
  const runLive = useCallback(() => {
    const es = new EventSource(`/api/run?scenario=${scenario}`)
    esRef.current = es
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data)
        applyEvent(ev)
        if (ev.type === 'plan') es.close()
      } catch { /* ignore keep-alives */ }
    }
    es.onerror = () => {
      es.close()
      setRunStatus('Live backend unavailable — switch to Replay')
      setRunning(false)
    }
  }, [scenario, applyEvent])

  const run = () => {
    reset()
    setRunning(true)
    if (mode === 'live') {
      runLive()
    } else {
      queueRef.current = SCENARIOS[scenario].map((e) => ({ ...e }))
      pump()
    }
  }

  const resolve = (choice) => {
    if (mode === 'live') {
      setApproval(null)
      fetch('/api/decision', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: choice }),
      }).catch(() => {})
      return
    }
    queueRef.current = RESOLUTIONS[choice].map((e) => ({ ...e }))
    setApproval(null)
    pump()
  }

  useEffect(() => () => { clearTimeout(timerRef.current); esRef.current?.close() }, [])

  const doneCount = AGENTS.filter((a) => agentStatus[a.id] === 'done').length
  const exposure = Math.round(elapsed * RATE_PER_S)
  const neutralized = completed && plan?.status === 'complete'

  return (
    <div className="app">
      <Topbar
        scenario={scenario} setScenario={setScenario}
        mode={mode} setMode={setMode}
        running={running} onRun={run} clock={clock}
      />

      <div className="main">
        {/* ---- left: agent spine ---- */}
        <div className="col">
          <div className="col-head"><span>Agent Network</span><span>{doneCount}/{AGENTS.length}</span></div>
          <div className="spine">
            <div className="supervisor-tag"><span>◆</span> Orchestrator <b>· Supervisor</b> · guided routing</div>
            {AGENTS.map((a) => <AgentNode key={a.id} agent={a} status={agentStatus[a.id]} />)}
          </div>
        </div>

        {/* ---- center: reasoning stream ---- */}
        <div className="col">
          <div className="col-head">
            <span>Live Reasoning · {ALERT.machine_id}</span>
            <span className={`mode-pill ${mode === 'live' ? 'live' : ''}`}>{mode === 'live' ? '● live' : 'replay'}</span>
          </div>
          {timeline.length === 0 && !running ? (
            <Idle />
          ) : (
            <div className="stream">
              {timeline.map((it) => <Entry key={it.id} item={it} />)}
              {plan && <ActionPlan plan={plan} />}
              <div ref={streamEndRef} />
            </div>
          )}
        </div>

        {/* ---- right: status rail ---- */}
        <div className="col">
          <div className="col-head"><span>Operations Status</span></div>
          <div className="rail">
            <div className="stat">
              <div className="label">Run State</div>
              <div className="runstate">
                {running && <span className="spin" />}
                {runStatus}
              </div>
            </div>

            <div className="stat">
              <div className="label">Failure Risk</div>
              <div className={`risk-badge risk-${risk}`}>
                <span className="blip" />{risk}
              </div>
            </div>

            <div className={`stat cost ${neutralized ? 'safe' : ''}`}>
              <div className="label">{neutralized ? 'Exposure Neutralized' : 'Downtime Exposure'}</div>
              <div className="big">€{exposure.toLocaleString()}</div>
              <div className="unit">€162,000 / day · €6,750 / h</div>
            </div>

            <div className="stat">
              <div className="label">Challenge Coverage</div>
              <div className="coverage">
                {AGENTS.map((a) => (
                  <span key={a.id} className={`cov-pip ${agentStatus[a.id] === 'done' ? 'on' : ''}`} />
                ))}
              </div>
              <div className="unit">{doneCount} of 5 TMC challenges addressed</div>
            </div>

            <div className="stat">
              <div className="label">Alert</div>
              <div className="unit" style={{ marginTop: 0, lineHeight: 1.7 }}>
                {ALERT.alert_id} · {ALERT.plant_name}<br />
                {ALERT.sensor} {ALERT.value} {ALERT.unit} (thr {ALERT.threshold})<br />
                trend {ALERT.trend} from {ALERT.baseline} / {ALERT.trend_window}
              </div>
            </div>
          </div>
        </div>
      </div>

      {approval && <ApprovalModal req={approval} onApprove={() => resolve('approve')} onReject={() => resolve('reject')} />}
    </div>
  )
}

function Topbar({ scenario, setScenario, mode, setMode, running, onRun, clock }) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="mark">T</div>
        <div>
          <div className="title">Titan Operations Sentinel</div>
          <div className="sub">Multi-agent operations brain</div>
        </div>
      </div>
      <div className="spacer" />
      <div className="controls">
        <div className="seg">
          {[['happy', 'Cascade'], ['edge', 'Edge'], ['escalation', 'Escalation']].map(([k, label]) => (
            <button key={k} className={scenario === k ? 'on' : ''} disabled={running} onClick={() => setScenario(k)}>{label}</button>
          ))}
        </div>
        <div className="seg">
          {[['replay', 'Replay'], ['live', 'Live']].map(([k, label]) => (
            <button key={k} className={mode === k ? 'on' : ''} disabled={running} onClick={() => setMode(k)}>{label}</button>
          ))}
        </div>
      </div>
      <span className="clock">{clock}</span>
      <button className="run-btn" onClick={onRun} disabled={running}>
        {running ? 'Running…' : '▶ Run Scenario'}
      </button>
    </div>
  )
}

function AgentNode({ agent, status }) {
  return (
    <div className={`agent-node ${status}`} style={{ '--ac': `var(--c-${agent.id})` }}>
      <div className="agent-row">
        <span className="agent-dot" />
        <div className="agent-meta">
          <div className="agent-name">{agent.name}</div>
          <div className="agent-chal">{agent.chal}</div>
        </div>
        <span className="agent-state">{status}</span>
      </div>
    </div>
  )
}

function Entry({ item }) {
  if (item.kind === 'system') return <div className="entry system">▸ {item.text}</div>
  if (item.kind === 'note') return <div className="entry note">◈ {item.text}</div>
  if (item.kind === 'human') return <div className="entry human">✓ {item.text}</div>
  // agent block
  const a = AGENT_MAP[item.agent] || { name: item.agent }
  const tag = item.status === 'active' ? 'reasoning…' : item.status === 'error' ? 'degraded' : 'reported'
  return (
    <div className={`entry block ${item.status === 'active' ? 'active' : ''}`} style={{ '--ac': `var(--c-${item.agent})` }}>
      <div className="block-head">
        <span className="ico" />
        <span className="who">{a.name}</span>
        <span className={`tag ${item.status === 'active' ? 'live' : ''}`}>{tag}</span>
      </div>
      {item.tools.length > 0 && (
        <div className="tools">
          {item.tools.map((t, i) => (
            <span className="tool-chip" key={i}><span className="dot" /><b>{t.tool}</b></span>
          ))}
        </div>
      )}
      {item.report
        ? <div className={`report ${item.status === 'error' ? 'err' : ''}`}>{item.report}</div>
        : item.status === 'active' && <div className="report" style={{ color: 'var(--text-mute)' }}>analyzing<span className="cursor" /></div>}
    </div>
  )
}

function ApprovalModal({ req, onApprove, onReject }) {
  return (
    <div className="scrim">
      <div className="modal">
        <div className="bar" />
        <div className="body">
          <div className="kicker">◈ Human-in-the-loop · approval required</div>
          <h2>{req.question}</h2>
          <p>This spend exceeds the agent's autonomous authority. It cannot self-approve — a human must decide.</p>
          <div className="figure">€{(req.amount_eur ?? 0).toLocaleString()}</div>
          <div className="ceiling">€{req.ceiling_eur} autonomous ceiling · routed to Plant Manager</div>
          <div className="actions">
            <button className="btn approve" onClick={onApprove}>✓ Approve</button>
            <button className="btn reject" onClick={onReject}>✕ Reject</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionPlan({ plan }) {
  return (
    <div className="plan-wrap">
      <div className="plan">
        <div className="ph">
          <span className="t">Action Plan</span>
          <span className={`v ${plan.status}`}>{plan.status}</span>
        </div>
        <div className="pb">
          {plan.lines.length > 0
            ? plan.lines.map((l, i) => (
                <div className="plan-line" key={i}>
                  <span className={`tier ${l.tier}`}>{l.tier}</span>
                  <span className="txt">{l.txt}</span>
                </div>
              ))
            : <div className="report" style={{ whiteSpace: 'pre-wrap' }}>{plan.text}</div>}
        </div>
        {plan.roi && (
          <div className="plan-foot">
            <span className="roi-l">Return on action</span>
            <span className="roi">{plan.roi}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Idle() {
  return (
    <div className="idle">
      <div className="ring"><span>T</span></div>
      <h3>Awaiting the Friday Cascade</h3>
      <p>Press “Run Scenario” to watch six agents perceive a sensor alert, reason across five domains, and converge on one costed, safety-gated action plan — with a human in the loop.</p>
    </div>
  )
}
