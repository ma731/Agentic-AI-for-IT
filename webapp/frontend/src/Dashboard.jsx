import { useState } from 'react'
import { AGENTS, AGENT_MAP } from './agentsMeta.js'
import AgentGraph from './AgentGraph.jsx'

const TINT = { blue: '#3b82f6', green: '#16b364', purple: '#8b5cf6', orange: '#f59e0b', red: '#ef4444' }
const NAV = [
  { id: 'dashboard', ic: '▦', label: 'Dashboard' },
  { id: 'reliability', ic: '◔', label: 'Reliability' },
  { id: 'supply_chain', ic: '⇄', label: 'Supply Chain' },
  { id: 'production', ic: '⚙', label: 'Production' },
  { id: 'quality', ic: '✓', label: 'Quality' },
  { id: 'compliance_safety', ic: '⚠', label: 'Compliance' },
]
const WORKFLOW_NAV = [
  { id: 'scenarios', ic: '◇', label: 'Scenarios' },
  { id: 'audit', ic: '≣', label: 'Audit Log' },
  { id: 'plan', ic: '◈', label: 'Action Plan' },
]
const SCENARIOS = [
  { id: 'happy', label: 'Cascade', desc: 'Full team → costed plan → human approval' },
  { id: 'edge', label: 'Edge', desc: 'Cross-plant adaptation when local supply is disrupted' },
  { id: 'escalation', label: 'Escalation', desc: 'Telemetry dropout → insufficient data → human review' },
]

export default function Dashboard(props) {
  const {
    scenario, setScenario, running, completed, timeline, agentStatus, runStatus, risk,
    plan, exposure, doneCount, onRun, onStop, onBack, alert: ALERT,
  } = props
  const [nav, setNav] = useState('dashboard')

  const blocks = timeline.filter((t) => t.kind === 'block')
  const focusAgent = AGENT_MAP[nav] ? nav : null
  const shownBlocks = focusAgent ? blocks.filter((b) => b.agent === focusAgent) : blocks

  return (
    <div className="dash">
      <header className="dash-top">
        <div className="dash-brand"><span className="logo" onClick={onBack} title="Back to showcase">✦</span> Operations Sentinel</div>
        <span className="sp" />
        <span className="status-pill"><i />{running ? 'Running' : 'Online'}</span>
        <button className="icon-btn" title="Notifications">◔</button>
        <span className="avatar" />
      </header>

      <div className="dash-body">
        {/* ---------------- sidebar ---------------- */}
        <aside className="dash-side">
          {NAV.map((n) => (
            <button key={n.id} className={`nav-item ${nav === n.id ? 'on' : ''}`} onClick={() => setNav(n.id)}>
              <span className="ic">{n.ic}</span>{n.label}
              {AGENT_MAP[n.id] && agentStatus[n.id] === 'done' && <span style={{ marginLeft: 'auto', color: '#16b364' }}>●</span>}
              {AGENT_MAP[n.id] && agentStatus[n.id] === 'active' && <span style={{ marginLeft: 'auto', color: '#f59e0b' }}>●</span>}
            </button>
          ))}
          <div className="nav-label">Workflow</div>
          {WORKFLOW_NAV.map((n) => (
            <button key={n.id} className={`nav-item ${nav === n.id ? 'on' : ''}`} onClick={() => setNav(n.id)}>
              <span className="ic">{n.ic}</span>{n.label}
            </button>
          ))}

          <div className="side-foot">
            <div className="op-card">
              <span className="av" />
              <div>
                <div className="who">Plant Manager</div>
                <div className="st"><span className="d" />{running ? 'Run active' : 'Standing by'}</div>
              </div>
            </div>
            <div className="run-ctrls">
              <button className="go" onClick={() => onRun(scenario)} disabled={running}>▶ Run {SCENARIOS.find((s) => s.id === scenario)?.label}</button>
              <button className="stop" onClick={onStop} disabled={!running} title="Stop">■</button>
            </div>
          </div>
        </aside>

        {/* ---------------- center ---------------- */}
        <main className="dash-main">
          {nav === 'scenarios' ? (
            <ScenariosView scenario={scenario} setScenario={setScenario} onRun={onRun} running={running} />
          ) : nav === 'audit' ? (
            <AuditView timeline={timeline} />
          ) : nav === 'plan' ? (
            <PlanView plan={plan} />
          ) : (
            <>
              <div className="dash-h">{focusAgent ? `${AGENT_MAP[focusAgent].name} · ${AGENT_MAP[focusAgent].chal}` : 'Operations Dashboard'}</div>

              {!focusAgent && <AgentGraph agentStatus={agentStatus} running={running} risk={risk} />}

              <div className="dash-tabs">
                {SCENARIOS.map((s) => (
                  <button key={s.id} className={`dash-tab ${scenario === s.id ? 'on' : ''}`} disabled={running} onClick={() => setScenario(s.id)}>{s.label}</button>
                ))}
              </div>

              <div className="stat-row">
                <Stat lbl="Active Alert" chip="blue" ic="◉" val="1" sub="ALT-22847 · CNC-07-LEI" />
                <Stat lbl="Failure Risk" chip="red" ic="⚠" val={risk} valClass={`risk-${risk}`} sub="from reliability triage" />
                <Stat lbl="Challenge Coverage" chip="green" ic="✓" val={`${doneCount}/5`} sub="TMC challenges addressed" deltaUp />
                <Stat lbl="Downtime Exposure" chip="orange" ic="€" val={`€${(exposure || 0).toLocaleString()}`} sub="€6,750 / h accruing" />
              </div>

              <div className="panel">
                <div className="panel-h"><span className="t">Agent Activity</span><span className="sub">{runStatus}</span></div>
                {shownBlocks.length === 0
                  ? <div className="empty-note">Press “Run {SCENARIOS.find((s) => s.id === scenario)?.label}” to dispatch the agents.</div>
                  : shownBlocks.map((b, i) => <ActivityRow key={i} b={b} />)}
              </div>

              {plan && (
                <div className="panel">
                  <div className="panel-h"><span className="t">Action Plan</span><span className="sub">{plan.status}</span></div>
                  {(plan.lines || []).map((l, i) => (
                    <div className="pl" key={i}><span className={`tier ${l.tier}`}>{l.tier}</span><span className="tx">{l.txt}</span></div>
                  ))}
                  {plan.text && !plan.lines?.length && <div className="tx" style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{plan.text}</div>}
                  {plan.roi && <div className="pl"><span className="tier AUTO">ROI</span><span className="tx" style={{ fontWeight: 700 }}>{plan.roi}</span></div>}
                </div>
              )}
            </>
          )}
        </main>

        {/* ---------------- right info ---------------- */}
        <aside className="dash-info">
          <div className="info-h">Asset Information</div>
          <div className="asset">
            <span className="ic">⚙</span>
            <div><div className="nm">{ALERT.machine_id}</div><div className="sub">{ALERT.plant_name}</div></div>
          </div>
          <div className="kv">
            <div><div className="k">Sensor</div><div className="v">{ALERT.sensor} {ALERT.value} {ALERT.unit}</div></div>
            <div><div className="k">Threshold</div><div className="v">{ALERT.threshold} {ALERT.unit}</div></div>
            <div><div className="k">Trend</div><div className="v">{ALERT.trend} (from {ALERT.baseline})</div></div>
            <div><div className="k">Window</div><div className="v">{ALERT.trend_window}</div></div>
          </div>
          <button className="info-btn">View Full Asset Profile</button>

          <div className="info-h mt">Run History</div>
          {timeline.filter((t) => t.kind === 'human' || (t.kind === 'block' && t.status === 'done')).slice(-4).map((t, i) => (
            <div className="hist" key={i}>
              <span className="ic" style={{ background: '#e9f1fe', color: '#3b82f6' }}>{t.kind === 'human' ? '✓' : '◉'}</span>
              <div><div className="t">{t.kind === 'human' ? 'Human decision' : AGENT_MAP[t.agent]?.name || t.agent}</div><div className="s">{t.kind === 'human' ? t.text : 'Assessment reported'}</div></div>
            </div>
          ))}
          {timeline.length === 0 && <div className="s" style={{ color: 'var(--muted)', fontSize: 12 }}>No activity yet.</div>}

          <div className="info-h mt">AI Suggestions</div>
          {plan
            ? <>
                <div className="sugg amber"><span className="si">💡</span><span>{plan.status === 'escalated' ? 'Insufficient data — route to on-call reliability engineer for manual inspection.' : 'Emergency Schaeffler expedite recommended — €3,200, inside the 52h window.'}</span></div>
                <div className="sugg green"><span className="si">✅</span><span>{plan.status === 'complete' ? 'Plan signed off by Compliance. Throttle + reroute can execute automatically.' : 'Keep the alert open and re-run once clean telemetry is available.'}</span></div>
              </>
            : <>
                <div className="sugg amber"><span className="si">💡</span><span>Run a scenario to generate costed, safety-gated recommendations.</span></div>
                <div className="sugg green"><span className="si">✅</span><span>Compliance gates every action; spend over €500 routes to you.</span></div>
              </>}
        </aside>
      </div>
    </div>
  )
}

function Stat({ lbl, chip, ic, val, valClass = '', sub, deltaUp }) {
  return (
    <div className="stat-card">
      <div className="top"><span className="lbl">{lbl}</span><span className={`chip ${chip}`}>{ic}</span></div>
      <div className={`val ${valClass}`}>{val}</div>
      <div className={`delta ${deltaUp ? 'up' : ''}`}>{sub}</div>
    </div>
  )
}

function ActivityRow({ b }) {
  const a = AGENT_MAP[b.agent] || { name: b.agent, tint: 'blue' }
  const live = b.status === 'active'
  return (
    <div className={`act ${live ? 'live' : ''}`}>
      <span className="ava" style={{ background: TINT[a.tint] || '#3b82f6' }}>{a.name[0]}</span>
      <div className="bd">
        <div className="nm">{a.name}{b.status === 'done' && <span className="act-dot" style={{ background: '#16b364' }} />}</div>
        <div className="msg">{b.report || 'Analyzing…'}</div>
        {b.tools?.length > 0 && <div className="tools">{b.tools.map((t, i) => <span className="tchip" key={i}>{t.tool}</span>)}</div>}
      </div>
    </div>
  )
}

function ScenariosView({ scenario, setScenario, onRun, running }) {
  return (
    <>
      <div className="dash-h">Demo Scenarios</div>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 18, maxWidth: '60ch' }}>Three paths, each exercising the system differently. Pick one and run it live.</p>
      {SCENARIOS.map((s) => (
        <div className="panel" key={s.id} style={{ borderColor: scenario === s.id ? 'var(--accent)' : undefined }}>
          <div className="panel-h">
            <span className="t">{s.label}</span>
            <button className="dash-tab on" disabled={running} onClick={() => { setScenario(s.id); onRun(s.id) }} style={{ background: 'var(--accent)' }}>▶ Run</button>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{s.desc}</div>
        </div>
      ))}
    </>
  )
}

function AuditView({ timeline }) {
  return (
    <>
      <div className="dash-h">Audit Log</div>
      <div className="panel">
        {timeline.length === 0 ? <div className="empty-note">No events yet — run a scenario.</div>
          : timeline.map((t, i) => (
            <div className="pl" key={i}>
              <span className="tier MONITOR">{t.kind}</span>
              <span className="tx">{t.kind === 'block' ? `${t.agent}: ${(t.report || '…').slice(0, 120)}` : t.text}</span>
            </div>
          ))}
      </div>
    </>
  )
}

function PlanView({ plan }) {
  return (
    <>
      <div className="dash-h">Action Plan</div>
      {!plan ? <div className="panel"><div className="empty-note">No plan yet — run a scenario to completion.</div></div>
        : <div className="panel">
            <div className="panel-h"><span className="t">Final Plan</span><span className="sub">{plan.status}</span></div>
            {(plan.lines || []).map((l, i) => <div className="pl" key={i}><span className={`tier ${l.tier}`}>{l.tier}</span><span className="tx">{l.txt}</span></div>)}
            {plan.text && !plan.lines?.length && <div className="tx" style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{plan.text}</div>}
            {plan.roi && <div className="pl"><span className="tier AUTO">ROI</span><span className="tx" style={{ fontWeight: 700 }}>{plan.roi}</span></div>}
          </div>}
    </>
  )
}
