import { useEffect, useRef, useState } from 'react'
import AgentGraph from './AgentGraph.jsx'

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

const FILTERS = ['All', 'Demo', 'Architecture', 'Safety', 'Engineering']

export default function Showcase({ onLaunch }) {
  const [filter, setFilter] = useState('All')
  const shown = PROJECTS.filter((p) => filter === 'All' || p.cat === filter)

  return (
    <div className="showcase">
      <nav className="sc-nav">
        <div className="sc-nav-inner">
          <div className="sc-logo"><span className="dot">T</span> Titan Operations Sentinel</div>
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
              <Card key={p.id} p={p} index={i} onLaunch={onLaunch} />
            ))}
          </div>
        </div>

        <footer className="sc-footer" id="contact">
          <h2>See it think. <span className="g">Then judge it.</span></h2>
          <div className="sub">The whole point is the demo. Launch the console and watch one alert become a safety-gated, costed action plan in under two minutes.</div>
          <button className="sc-btn-primary" onClick={onLaunch}>Launch the live console →</button>
          <div className="fine">Titan Operations Sentinel · IE Agentic AI · 2026</div>
        </footer>
      </div>
    </div>
  )
}

function Card({ p, index, onLaunch }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const onClick = () => { if (p.launch) onLaunch() }
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
