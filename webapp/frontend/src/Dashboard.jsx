import { useState, useEffect, useRef } from 'react'
import { AGENTS, AGENT_MAP } from './agentsMeta.js'
import AgentGraph from './AgentGraph.jsx'
import ProviderBar from './ProviderBar.jsx'
import Logo from './Logo.jsx'
import AnimatedNumber from './AnimatedNumber.jsx'
import CommandPalette from './CommandPalette.jsx'
import { TEAM, GUEST } from './team.js'

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
  { id: 'chat', ic: '⇆', label: 'Agent Chat' },
  { id: 'cost', ic: '€', label: 'Cost & Feasibility' },
  { id: 'audit', ic: '≣', label: 'Audit Log' },
  { id: 'plan', ic: '◈', label: 'Action Plan' },
  { id: 'report', ic: '▤', label: 'Run History' },
]
const SCENARIOS = [
  { id: 'happy', label: 'Cascade', desc: 'Full team → costed plan → human approval' },
  { id: 'edge', label: 'Edge', desc: 'Cross-plant adaptation when local supply is disrupted' },
  { id: 'escalation', label: 'Escalation', desc: 'Telemetry dropout → insufficient data → human review' },
]

export default function Dashboard(props) {
  const {
    scenario, setScenario, mode, setMode, running, completed, timeline, agentStatus, runStatus, risk,
    plan, exposure, doneCount, onRun, onStop, onBack, alert: ALERT, user, onSignOut, onSwitchUser, onCommand,
    history = [], onClearHistory,
  } = props
  const [nav, setNav] = useState('dashboard')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const me = user || { name: 'Guest', initials: 'G', color: '#f97316' }
  const firstName = me.name.split(' ')[0]

  const blocks = timeline.filter((t) => t.kind === 'block')
  const focusAgent = AGENT_MAP[nav] ? nav : null
  const shownBlocks = focusAgent ? blocks.filter((b) => b.agent === focusAgent) : blocks

  return (
    <div className="dash" style={{ '--accent': me.color }}>
      <header className="dash-top">
        <div className="dash-brand"><span className="logo-svg" onClick={onBack} title="Back to home" style={{ cursor: 'pointer', display: 'flex' }}><Logo size={28} accent={me.color} /></span> Operations Sentinel</div>
        <button className="dash-home" onClick={onBack} title="Back to home page"><span className="ic">←</span> Home</button>
        <span className="sp" />
        <ProviderBar mode={mode} setMode={setMode} />
        <button className="cmdk-trigger" onClick={() => setPaletteOpen(true)} title="Command palette">
          <span className="ic">⌘</span>K
        </button>
        <UserMenu me={me} firstName={firstName} onSwitchUser={onSwitchUser} onSignOut={onSignOut} />
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
              <span className="av" style={{ background: me.color, display: 'grid', placeItems: 'center', color: '#06140e', fontWeight: 700, fontSize: 11 }}>{me.initials}</span>
              <div>
                <div className="who">{me.name}</div>
                <div className="st"><span className="d" />{running ? 'Run active' : 'Signed in'}</div>
              </div>
            </div>
            <div className="run-ctrls">
              {running
                ? <button className="stop wide" onClick={onStop} title="Stop the run">■ Stop run</button>
                : <button className="go" onClick={() => onRun(scenario)}>▶ Run {SCENARIOS.find((s) => s.id === scenario)?.label}</button>}
            </div>
          </div>
        </aside>

        {/* ---------------- center ---------------- */}
        <main className="dash-main">
          {nav === 'scenarios' ? (
            <ScenariosView scenario={scenario} setScenario={setScenario} onRun={onRun} running={running} />
          ) : nav === 'chat' ? (
            <ChatView timeline={timeline} running={running} onCommand={onCommand} runStatus={runStatus} doneCount={doneCount} mode={mode} />
          ) : nav === 'cost' ? (
            <CostView doneCount={doneCount} />
          ) : nav === 'audit' ? (
            <AuditView timeline={timeline} />
          ) : nav === 'plan' ? (
            <PlanView plan={plan} />
          ) : nav === 'report' ? (
            <ReportView history={history} onClearHistory={onClearHistory} alert={ALERT} />
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
                <Stat lbl="Active Alert" chip="blue" ic="◉" val={<AnimatedNumber value={1} format={(n) => Math.round(n)} />} sub="ALT-22847 · CNC-07-LEI" />
                <Stat lbl="Failure Risk" chip="red" ic="⚠" val={risk} valClass={`risk-${risk}`} sub="from reliability triage" />
                <Stat lbl="Challenge Coverage" chip="green" ic="✓" val={<AnimatedNumber value={doneCount} format={(n) => `${Math.round(n)}/5`} />} sub="TMC challenges addressed" deltaUp />
                <Stat lbl="Downtime Exposure" chip="orange" ic="€" val={<AnimatedNumber value={exposure || 0} format={(n) => `€${Math.round(n).toLocaleString()}`} />} sub="€6,750 / h accruing" />
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
                <div className="sugg amber"><span className="si">💡</span><span>{plan.status === 'escalated' ? 'Insufficient data, route to on-call reliability engineer for manual inspection.' : 'Emergency Schaeffler expedite recommended, €3,200, inside the 52h window.'}</span></div>
                <div className="sugg green"><span className="si">✅</span><span>{plan.status === 'complete' ? 'Plan signed off by Compliance. Throttle + reroute can execute automatically.' : 'Keep the alert open and re-run once clean telemetry is available.'}</span></div>
              </>
            : <>
                <div className="sugg amber"><span className="si">💡</span><span>Run a scenario to generate costed, safety-gated recommendations.</span></div>
                <div className="sugg green"><span className="si">✅</span><span>Compliance gates every action; spend over €500 routes to you.</span></div>
              </>}
        </aside>
      </div>

      <CommandPalette
        open={paletteOpen} setOpen={setPaletteOpen}
        navItems={[...NAV, ...WORKFLOW_NAV]} setNav={setNav}
        scenarios={SCENARIOS} onRun={onRun}
        me={me} onSwitchUser={onSwitchUser} onSignOut={onSignOut}
      />
    </div>
  )
}

function UserMenu({ me, firstName, onSwitchUser, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const pick = (m) => { onSwitchUser?.(m); setOpen(false) }

  return (
    <div className="user-menu" ref={ref}>
      <button className={`user-chip ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} title="Switch presenter">
        <span className="uc-ava" style={{ background: me.color }}>{me.initials}</span>
        <span className="uc-name">{firstName}</span>
        <span className="uc-caret">▾</span>
      </button>
      {open && (
        <div className="user-pop" role="menu">
          <div className="up-head">Switch presenter</div>
          {TEAM.map((m) => {
            const active = m.name === me.name
            return (
              <button key={m.name} className={`up-item ${active ? 'on' : ''}`} onClick={() => pick(m)} role="menuitem">
                <span className="up-ava" style={{ background: m.color }}>{m.initials}</span>
                <span className="up-name">{m.name}</span>
                {active && <span className="up-check" style={{ color: m.color }}>●</span>}
              </button>
            )
          })}
          <button className={`up-item ${me.name === 'Guest' ? 'on' : ''}`} onClick={() => pick(GUEST)} role="menuitem">
            <span className="up-ava" style={{ background: GUEST.color }}>G</span>
            <span className="up-name">Guest</span>
          </button>
          <div className="up-sep" />
          <button className="up-item up-out" onClick={() => { setOpen(false); onSignOut?.() }} role="menuitem">
            <span className="up-out-ic">⎋</span>
            <span className="up-name">Sign out</span>
          </button>
        </div>
      )}
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
        {timeline.length === 0 ? <div className="empty-note">No events yet, run a scenario.</div>
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
      {!plan ? <div className="panel"><div className="empty-note">No plan yet, run a scenario to completion.</div></div>
        : <div className="panel">
            <div className="panel-h"><span className="t">Final Plan</span><span className="sub">{plan.status}</span></div>
            {(plan.lines || []).map((l, i) => <div className="pl" key={i}><span className={`tier ${l.tier}`}>{l.tier}</span><span className="tx">{l.txt}</span></div>)}
            {plan.text && !plan.lines?.length && <div className="tx" style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{plan.text}</div>}
            {plan.roi && <div className="pl"><span className="tier AUTO">ROI</span><span className="tx" style={{ fontWeight: 700 }}>{plan.roi}</span></div>}
          </div>}
    </>
  )
}

function buildReportMd(r, ALERT) {
  const label = SCENARIOS.find((s) => s.id === r.scenario)?.label || r.scenario
  let md = `# Titan Operations Sentinel Run Report\n\n`
  md += `**Scenario:** ${label}  \n**When:** ${new Date(r.ts).toLocaleString()}  \n**Presenter:** ${r.by}  \n`
  md += `**Mode:** ${r.mode}  \n**Failure risk:** ${r.risk}  \n**Outcome:** ${r.status}  \n**Challenges covered:** ${r.doneCount}/5\n\n`
  if (r.command) md += `**Operator prompt:** “${r.command}”\n\n`
  md += `## Alert\n${ALERT.machine_id} · ${ALERT.plant_name}, ${ALERT.sensor} ${ALERT.value}${ALERT.unit} (threshold ${ALERT.threshold}, ${ALERT.trend})\n\n`
  md += `## Agent reports\n`
  r.reports.forEach((a) => {
    md += `### ${AGENT_MAP[a.agent]?.name || a.agent}\n${a.report || '(no report)'}\n`
    if (a.tools?.length) md += `\n_Tools used: ${a.tools.join(', ')}_\n`
    md += `\n`
  })
  if (r.followups?.length) md += `## Agent-to-agent follow-ups\n` + r.followups.map((f) => `- ${f}`).join('\n') + `\n\n`
  if (r.decisions?.length) md += `## Human decisions\n` + r.decisions.map((d) => `- ${d}`).join('\n') + `\n\n`
  md += `## Final action plan, ${r.plan.status}\n`
  if (r.plan.lines?.length) md += r.plan.lines.map((l) => `- **[${l.tier}]** ${l.txt}`).join('\n')
  else if (r.plan.text) md += r.plan.text
  if (r.plan.roi) md += `\n\n**Return on action:** ${r.plan.roi}`
  md += `\n\n---\n_Generated by Titan Operations Sentinel_\n`
  return md
}

function downloadReport(r, ALERT) {
  const label = (SCENARIOS.find((s) => s.id === r.scenario)?.label || r.scenario).toLowerCase()
  const blob = new Blob([buildReportMd(r, ALERT)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `tos-report-${label}-${r.id}.md`
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

function ReportView({ history, onClearHistory, alert: ALERT }) {
  const [sel, setSel] = useState(null)
  const run = history.find((r) => r.id === sel) || history[0] || null
  return (
    <>
      <div className="dash-h">Run History</div>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 18, maxWidth: '62ch' }}>
        Every completed run is saved here, review what each agent concluded and export a shareable report.
      </p>
      {history.length === 0 ? (
        <div className="panel"><div className="empty-note">No runs yet. Run a scenario (or type a crisis in Agent Chat) and it'll be saved here automatically.</div></div>
      ) : (
        <div className="rep-wrap">
          <div className="rep-list">
            <div className="rep-list-h">
              <span>{history.length} run{history.length > 1 ? 's' : ''}</span>
              <button className="rep-clear" onClick={onClearHistory} title="Clear all">Clear</button>
            </div>
            {history.map((r) => {
              const label = SCENARIOS.find((s) => s.id === r.scenario)?.label || r.scenario
              return (
                <button key={r.id} className={`rep-item ${run?.id === r.id ? 'on' : ''}`} onClick={() => setSel(r.id)}>
                  <span className={`rep-dot ${r.status}`} />
                  <div className="rep-item-bd">
                    <div className="rep-item-t">{label} <span className="rep-mode">{r.mode}</span></div>
                    <div className="rep-item-s">{new Date(r.ts).toLocaleString()} · {r.by}</div>
                  </div>
                  <span className={`rep-badge ${r.status}`}>{r.status}</span>
                </button>
              )
            })}
          </div>

          {run && (
            <div className="rep-detail">
              <div className="panel">
                <div className="panel-h">
                  <span className="t">{SCENARIOS.find((s) => s.id === run.scenario)?.label || run.scenario} · report</span>
                  <button className="info-btn" style={{ width: 'auto', padding: '7px 13px', marginTop: 0 }} onClick={() => downloadReport(run, ALERT)}>↓ Export .md</button>
                </div>
                <div className="rep-meta">
                  <span><b>When</b>{new Date(run.ts).toLocaleString()}</span>
                  <span><b>Presenter</b>{run.by}</span>
                  <span><b>Risk</b>{run.risk}</span>
                  <span><b>Coverage</b>{run.doneCount}/5</span>
                </div>
                {run.command && <div className="rep-cmd">Operator: “{run.command}”</div>}
              </div>

              <div className="panel">
                <div className="panel-h"><span className="t">Agent reports</span></div>
                {run.reports.map((a, i) => (
                  <div className={`act ${a.status === 'error' ? '' : ''}`} key={i} style={{ alignItems: 'flex-start' }}>
                    <span className="ava" style={{ background: TINT[AGENT_MAP[a.agent]?.tint] || '#3b82f6' }}>{(AGENT_MAP[a.agent]?.name || a.agent)[0]}</span>
                    <div className="bd">
                      <div className="nm">{AGENT_MAP[a.agent]?.name || a.agent}</div>
                      <div className="msg">{a.report || '-'}</div>
                      {a.tools?.length > 0 && <div className="tools">{a.tools.map((t, j) => <span className="tchip" key={j}>{t}</span>)}</div>}
                    </div>
                  </div>
                ))}
                {run.followups.map((f, i) => <div className="ch-followup" key={`f${i}`} style={{ margin: '8px 0' }}><span className="ch-fu-tag">agent → agent</span> {f}</div>)}
              </div>

              {run.decisions.length > 0 && (
                <div className="panel">
                  <div className="panel-h"><span className="t">Human decisions</span></div>
                  {run.decisions.map((d, i) => <div className="pl" key={i}><span className="tier APPROVE">HUMAN</span><span className="tx">{d}</span></div>)}
                </div>
              )}

              <div className="panel">
                <div className="panel-h"><span className="t">Final action plan</span><span className="sub">{run.plan.status}</span></div>
                {(run.plan.lines || []).map((l, i) => <div className="pl" key={i}><span className={`tier ${l.tier}`}>{l.tier}</span><span className="tx">{l.txt}</span></div>)}
                {run.plan.text && !run.plan.lines?.length && <div className="tx" style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{run.plan.text}</div>}
                {run.plan.roi && <div className="pl"><span className="tier AUTO">ROI</span><span className="tx" style={{ fontWeight: 700 }}>{run.plan.roi}</span></div>}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}

const CRISES = [
  'CNC-07 vibration spiking, handle it',
  'Sensor feed on CNC-07 just dropped out',
  'Cross-plant supply disruption today',
]

function ChatView({ timeline, running, onCommand, runStatus, doneCount = 0, mode }) {
  const [val, setVal] = useState('')
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [timeline, running])
  const send = (text) => {
    const t = (text ?? val).trim()
    if (!t || running) return
    onCommand?.(t)
    setVal('')
  }
  const started = timeline.length > 0 || running
  const activeAgent = [...timeline].reverse().find((t) => t.kind === 'block' && t.status === 'active')
  return (
    <>
      <div className="dash-h">Agent Conversation</div>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 18, maxWidth: '62ch' }}>
        Describe a situation in plain language, the orchestrator routes it to the right agents, who reason and converse through a shared transcript. Or pick an example below.
      </p>

      {/* live status bar, makes it obvious what's happening during a run */}
      {started && (
        <div className={`ch-status ${running ? 'live' : 'done'}`}>
          <span className="ch-status-dot" />
          <span className="ch-status-txt">{running ? (runStatus || 'Working…') : 'Conversation complete'}</span>
          <span className="ch-status-prog">
            {[0, 1, 2, 3, 4].map((n) => <i key={n} className={n < doneCount ? 'on' : ''} />)}
            <b>{doneCount}/5</b>
          </span>
        </div>
      )}

      <div className="panel chat">
        {timeline.length === 0 ? (
          <div className="empty-note">{running ? 'Dispatching the agents…' : 'Type a crisis below, or try an example, to dispatch the agents.'}</div>
        ) : timeline.map((t, i) => {
          if (t.kind === 'system') return <div className="ch-sys" key={i}><span className="ch-sys-ic">◈</span>{t.text}</div>
          if (t.kind === 'note') return <div className="ch-followup" key={i}><span className="ch-fu-tag">agent → agent</span> {t.text}</div>
          if (t.kind === 'human') return (
            <div className="ch-row me" key={i}>
              <div className="ch-bubble me"><div className="ch-nm">Plant Manager</div>{t.text}</div>
              <span className="ch-av" style={{ background: '#0f1115' }}>★</span>
            </div>
          )
          const a = AGENT_MAP[t.agent] || { name: t.agent, tint: 'blue' }
          const thinking = t.status === 'active'
          return (
            <div className="ch-row" key={i}>
              <span className={`ch-av ${thinking ? 'pulse' : ''}`} style={{ background: TINT[a.tint] || '#3b82f6' }}>{a.name[0]}</span>
              <div className={`ch-bubble ${thinking ? 'thinking' : ''} ${t.status === 'error' ? 'err' : ''}`}>
                <div className="ch-nm">{a.name}{thinking && <span className="ch-tag-live">reasoning</span>}</div>
                {t.tools?.length > 0 && (
                  <div className="ch-tools">{t.tools.map((x, j) => <span className="tchip" key={j}><span className="tchip-ic">⚙</span>{x.tool}</span>)}</div>
                )}
                {t.report
                  ? <div className="ch-text">{t.report}</div>
                  : thinking && <div className="ch-think">{t.tools?.length ? 'reasoning over tool results' : 'choosing tools'} <span className="ch-dots"><i /><i /><i /></span></div>}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {timeline.length === 0 && (
        <div className="ch-chips">
          {CRISES.map((c) => (
            <button key={c} className="ch-chip" disabled={running} onClick={() => send(c)}>{c}</button>
          ))}
        </div>
      )}
      <div className="ch-composer">
        <span className="ch-prompt">⌘</span>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          placeholder={running ? 'Agents are working…' : 'Describe the situation…  e.g. CNC-07 vibration spiking, handle it'}
          disabled={running}
        />
        <button className="ch-send" onClick={() => send()} disabled={running || !val.trim()} aria-label="Dispatch agents">↑</button>
      </div>
    </>
  )
}

const COST_ROWS = [
  { who: 'Orchestrator routing', tok: '1.5k', tint: 'orange' },
  { who: 'Reliability', tok: '3.2k', tint: 'blue' },
  { who: 'Supply Chain', tok: '3.8k', tint: 'green' },
  { who: 'Production', tok: '2.9k', tint: 'purple' },
  { who: 'Quality', tok: '2.4k', tint: 'orange' },
  { who: 'Compliance', tok: '3.1k', tint: 'red' },
  { who: 'Final synthesis', tok: '1.2k', tint: 'blue' },
]
function CostView() {
  return (
    <>
      <div className="dash-h">Cost & Feasibility</div>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 18, maxWidth: '62ch' }}>
        A full 6-agent run is roughly <b>~18k tokens</b> (after a ~62% transcript trim). That runs for <b>€0</b> on free tiers, or fractions of a cent paid.
      </p>
      <div className="stat-row" style={{ marginBottom: 16 }}>
        <Stat lbl="Tokens / run" chip="blue" ic="◉" val="~18k" sub="after token-trim (−62%)" />
        <Stat lbl="Free-tier cost" chip="green" ic="€" val="€0" sub="Gemini / OpenRouter free" deltaUp />
        <Stat lbl="Pay-as-you-go" chip="purple" ic="€" val="~€0.005" sub="Flash-Lite, per full run" />
        <Stat lbl="Rehearse 50×" chip="orange" ic="↻" val="< €1" sub="a week of practice runs" />
      </div>
      <div className="panel">
        <div className="panel-h"><span className="t">Tokens by agent</span><span className="sub">representative full run</span></div>
        {COST_ROWS.map((r, i) => (
          <div className="act" key={i} style={{ alignItems: 'center' }}>
            <span className="ava" style={{ background: TINT[r.tint], width: 28, height: 28, fontSize: 11 }}>{r.who[0]}</span>
            <div className="bd"><div className="nm" style={{ fontSize: 12.5 }}>{r.who}</div></div>
            <span className="tchip">{r.tok} tok</span>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-h"><span className="t">Why it's feasible</span></div>
        <div className="pl"><span className="tier AUTO">FREE</span><span className="tx">Runs end-to-end on Gemini / OpenRouter free tiers, no paid keys (assignment §14).</span></div>
        <div className="pl"><span className="tier MONITOR">TRIM</span><span className="tx">Transcript caps cut tokens ~62%, so more runs fit the daily quota.</span></div>
        <div className="pl"><span className="tier APPROVE">SWAP</span><span className="tx">One-line provider switch when a free tier rate-limits.</span></div>
        <div className="pl"><span className="tier AUTO">REPLAY</span><span className="tx">Demo day uses the recorded replay, zero API calls, can't fail.</span></div>
      </div>
    </>
  )
}
