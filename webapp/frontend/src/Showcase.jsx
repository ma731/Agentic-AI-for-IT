import { useEffect, useRef, useState } from 'react'
import AgentGraph from './AgentGraph.jsx'
import Logo from './Logo.jsx'

// a frozen "mid-run" state so the hero graph glows with energy
const HERO_STATE = { reliability: 'done', supply_chain: 'done', production: 'active', quality: 'idle', compliance_safety: 'idle' }
const MARQUEE = ['CNC-07-LEI', 'VIBRATION 7.2 mm/s ▲', 'RUL 52–76 h', '€162,000 / day AT RISK', 'ROI 71.7:1', '6 AUTONOMOUS AGENTS', '5 TMC CHALLENGES', 'HUMAN GATE > €500', 'RUNS ON FREE-TIER']

const STATS = [
  { n: '6', l: 'Autonomous agents' },
  { n: '5', l: 'TMC challenges' },
  { n: <>71.7<span className="g">:1</span></>, l: 'Action ROI' },
  { n: <>€0<span className="g"></span></>, l: 'Runs on free tier' },
]

const PROJECTS = [
  {
    id: 'console', cat: 'Demo', tag: 'Live Demo', title: 'Live Operations Console', year: '2026',
    bg: 'var(--c-dark)', dark: true, feature: true, span: 2, img: '/shots/console.png',
    blurb: 'Watch six agents perceive, reason across five domains, and converge on one costed plan — live.',
    launch: true,
  },
  {
    id: 'agents', cat: 'Architecture', tag: 'Architecture', title: 'Six-Agent Orchestrator', year: '2026',
    bg: 'var(--c-lav)', img: '/shots/agents.png',
    blurb: 'An LLM supervisor routes autonomous ReAct specialists and lets them converse through a shared transcript.',
  },
  {
    id: 'approval', cat: 'Safety', tag: 'Human-in-the-loop', title: 'The €500 Approval Gate', year: '2026',
    bg: 'var(--c-cream)', img: '/shots/approval.png',
    blurb: 'Any spend beyond the autonomy ceiling pauses the whole plan for a human decision.',
  },
  {
    id: 'cascade', cat: 'Demo', tag: 'Scenario', title: 'The Friday Cascade', year: '2026',
    bg: 'var(--c-mint)', figure: <><span className="big">52–76<span className="g">h</span></span><div className="sub">Predicted bearing failure on CNC-07-LEI, with €162,000/day of downtime on the line.</div></>,
  },
  {
    id: 'compliance', cat: 'Safety', tag: 'Compliance', title: 'Safety Can HALT', year: '2026',
    bg: 'var(--c-blush)', figure: <><span className="big">OSHA<span className="g">·</span>gated</span><div className="sub">Every proposed action is checked against safety rules — Compliance can stop the plan outright.</div></>,
  },
  {
    id: 'feasible', cat: 'Engineering', tag: 'Feasibility', title: 'Zero-Cost Demo', year: '2026',
    bg: 'var(--c-sky)', figure: <><span className="big">100% <span className="g">free</span></span><div className="sub">Runs on Gemini's free tier with a recorded replay fallback — no paid keys, ever.</div></>,
  },
]

const DETAILS = {
  console: ['Six agents reason live over one sensor alert', 'Supervisor routes; specialists pick their own tools', 'Ends in a costed, safety-gated action plan', 'Human approves anything over the €500 ceiling'],
  agents: ['An LLM supervisor routes between 6 agents', 'Each specialist is an autonomous ReAct agent', 'They converse through one shared transcript', 'FOLLOWUP lets an agent ask another directly'],
  approval: ['€500 autonomy ceiling on spend', 'Anything above pauses the whole plan', 'interrupt() gate → human approve / reject', 'Compliance can HALT independently of cost'],
  cascade: ['CNC-07-LEI bearing failure predicted 52–76h out', '€162,000/day of downtime on the line', 'Three paths: Cascade, Edge, Escalation', 'Each behaves differently — gate / autonomous / human review'],
  compliance: ['Every proposed action gated vs OSHA / OEM limits', 'Compliance can HALT the entire plan', 'Full audit trail assembled per run', 'Safety is a hard override, not a suggestion'],
  feasible: ['Runs on free Gemini / OpenRouter tiers', '~62% transcript token trim', 'Recorded replay = €0, can-not-fail demo', 'One-line provider swap when limits bite'],
}

const STEPS = [
  { n: '01', t: 'Perceive', d: 'A sensor alert arrives; the orchestrator triages 22k signals to the critical asset.' },
  { n: '02', t: 'Route', d: 'A supervisor decides which specialist acts next — guided autonomy, not a fixed script.' },
  { n: '03', t: 'Reason', d: 'Each agent picks its own tools, reasons, and reports into a shared transcript.' },
  { n: '04', t: 'Converge', d: 'Findings combine into one costed, safety-gated plan across five domains.' },
  { n: '05', t: 'Decide', d: 'Compliance can HALT; spend over €500 pauses for a human. Then it acts.' },
]

const FILTERS = ['All', 'Demo', 'Architecture', 'Safety', 'Engineering']

export default function Showcase({ onLaunch }) {
  const [filter, setFilter] = useState('All')
  const [detail, setDetail] = useState(null)
  const shown = PROJECTS.filter((p) => filter === 'All' || p.cat === filter)

  return (
    <div className="showcase">
      <nav className="sc-nav">
        <div className="sc-nav-inner">
          <div className="sc-logo"><Logo size={24} accent="#0fbe85" /> Titan Operations Sentinel</div>
          <div className="links">
            <a onClick={onLaunch}>Live demo</a>
            <a href="#work">Work</a>
            <a href="#contact">Approach</a>
          </div>
          <button className="sc-cta" onClick={onLaunch}>Launch console →</button>
        </div>
      </nav>

      <div className="sc-inner">
        <header className="sc-hero">
          <div className="sc-eyebrow">◈ Agentic AI · Manufacturing operations</div>
          <h1>One sensor alert.<br />Five domains.<br /><span className="g">One costed plan.</span></h1>
          <p>Titan Operations Sentinel is an autonomous operations brain. When a machine signals failure, six agents reason across reliability, supply, production, quality and safety — and hand a human one decision.</p>
          <div className="actions">
            <button className="sc-btn-primary" onClick={onLaunch}>Launch the live console →</button>
            <a className="sc-btn-ghost" href="#work">See the system</a>
          </div>
        </header>

        {/* live orchestration graph as the hero centerpiece */}
        <div className="sc-hero-stage" onClick={onLaunch} title="Launch the live console">
          <AgentGraph agentStatus={HERO_STATE} running />
          <div className="sc-stage-badge"><span className="d" /> live · click to run</div>
        </div>

        <div className="sc-marquee" aria-hidden="true">
          <div className="sc-marquee-row">
            {[...MARQUEE, ...MARQUEE].map((m, i) => <span className="sc-mq" key={i}>{m}</span>)}
          </div>
        </div>

        <div className="sc-stats">
          {STATS.map((s, i) => (
            <div className="sc-stat" key={i}><div className="n">{s.n}</div><div className="l">{s.l}</div></div>
          ))}
        </div>

        <div id="work">
          <div className="sc-section-label"><span className="tick" /> The system, in pieces</div>
          <div className="sc-filters">
            {FILTERS.map((f) => (
              <button key={f} className={`sc-pill ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>

          <div className="sc-grid">
            {shown.map((p, i) => (
              <Card key={p.id} p={p} index={i} onLaunch={onLaunch} onOpen={setDetail} />
            ))}
          </div>
        </div>

        {/* how it works */}
        <div className="sc-section-label"><span className="tick" /> How it works</div>
        <div className="sc-steps">
          {STEPS.map((s) => (
            <div className="sc-step" key={s.n}>
              <div className="sc-step-n">{s.n}</div>
              <div className="sc-step-t">{s.t}</div>
              <div className="sc-step-d">{s.d}</div>
            </div>
          ))}
        </div>

        {/* why an agent */}
        <div className="sc-section-label"><span className="tick" /> Why an agent, not a dashboard</div>
        <div className="sc-why">
          <div className="sc-why-col"><div className="sc-why-h">A dashboard</div><p>Shows you six panels and waits. The human does the cross-domain reasoning under time pressure.</p></div>
          <div className="sc-why-col"><div className="sc-why-h">An automation</div><p>Fires a fixed rule. It can't weigh ROI vs risk, adapt a reroute, or know when to ask a human.</p></div>
          <div className="sc-why-col on"><div className="sc-why-h">Our agent</div><p>Reasons across five domains, decides, and hands you <b>one costed, safety-gated plan</b> — and escalates when the data is thin.</p></div>
        </div>

        <footer className="sc-footer" id="contact">
          <h2>See it think. <span className="g">Then judge it.</span></h2>
          <div className="sub">The whole point is the demo. Launch the console and watch one alert become a safety-gated, costed action plan in under two minutes.</div>
          <button className="sc-btn-primary" onClick={onLaunch}>Launch the live console →</button>
          <div className="fine">Titan Operations Sentinel · IE Agentic AI · 2026</div>
        </footer>

        {detail && <DetailModal p={detail} onClose={() => setDetail(null)} onLaunch={onLaunch} />}
      </div>
    </div>
  )
}

function Card({ p, index, onLaunch, onOpen }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const onClick = () => { if (p.launch) onLaunch(); else onOpen(p) }
  return (
    <article
      ref={ref}
      className={`sc-card ${p.dark ? 'dark' : ''} ${p.feature ? 'feature' : ''} ${p.span === 2 ? 'sc-span2' : ''} ${seen ? 'in' : ''}`}
      style={{ '--cbg': p.bg, transitionDelay: `${(index % 2) * 80}ms` }}
      onClick={onClick}
    >
      {p.img
        ? <div className="sc-shot"><img src={p.img} alt={p.title} loading="lazy" /></div>
        : <div className="sc-figure">{p.figure}</div>}
      <div className="sc-foot">
        <div>
          <span className="sc-tag">{p.tag}</span>
          <div className="meta" style={{ marginTop: 10 }}>
            <span className="t">{p.title}</span><span className="y">· {p.year}</span>
          </div>
        </div>
        <span className="sc-arrow">→</span>
      </div>
    </article>
  )
}

function DetailModal({ p, onClose, onLaunch }) {
  const points = DETAILS[p.id] || []
  return (
    <div className="sc-scrim" onClick={onClose}>
      <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
        <button className="sc-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="sc-modal-tag">{p.tag} · {p.year}</div>
        <h3 className="sc-modal-h">{p.title}</h3>
        <p className="sc-modal-blurb">{p.blurb}</p>
        {p.img && <div className="sc-modal-shot"><img src={p.img} alt={p.title} /></div>}
        <ul className="sc-modal-list">
          {points.map((pt, i) => <li key={i}><span className="sc-bullet" />{pt}</li>)}
        </ul>
        <button className="sc-btn-primary" onClick={onLaunch} style={{ marginTop: 22 }}>Launch the live console →</button>
      </div>
    </div>
  )
}
