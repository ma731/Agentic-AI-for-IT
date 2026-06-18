import { useEffect, useRef, useState } from 'react'

// Mirror of the backend provider catalog (llm.py). Free-tier-friendly model lists.
const PROVIDERS = [
  { id: 'google_genai', label: 'Gemini', free: true, models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'], hint: 'aistudio.google.com/apikey' },
  { id: 'openrouter', label: 'OpenRouter', free: true, models: ['meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-chat-v3:free', 'google/gemini-2.0-flash-exp:free'], hint: 'openrouter.ai/keys · one key, many free models' },
  { id: 'groq', label: 'Groq', free: true, models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'], hint: 'console.groq.com' },
  { id: 'openai', label: 'OpenAI', free: false, models: ['gpt-4o-mini', 'gpt-4o'], hint: 'platform.openai.com' },
  { id: 'anthropic', label: 'Anthropic', free: false, models: ['claude-haiku-4-5', 'claude-sonnet-4-6'], hint: 'console.anthropic.com' },
  { id: 'mistralai', label: 'Mistral', free: true, models: ['mistral-small-latest', 'open-mistral-nemo'], hint: 'console.mistral.ai' },
]
const PMAP = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]))
const LS = 'tos.provider'

export default function ProviderBar({ mode, setMode }) {
  const [open, setOpen] = useState(false)
  const [provider, setProvider] = useState('google_genai')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [key, setKey] = useState('')
  const [remember, setRemember] = useState(false)
  const [status, setStatus] = useState('replay')   // replay | connecting | live | error
  const [msg, setMsg] = useState('')
  const pop = useRef(null)

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(LS) || '{}')
      if (s.provider && PMAP[s.provider]) { setProvider(s.provider); setModel(s.model || PMAP[s.provider].models[0]) }
      if (s.key) setKey(s.key)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const onDoc = (e) => { if (open && pop.current && !pop.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const pickProvider = (id) => { setProvider(id); setModel(PMAP[id].models[0]) }

  const connect = async () => {
    setStatus('connecting'); setMsg('')
    try {
      const r = await fetch('/api/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, apiKey: key || undefined }),
      })
      const data = await r.json()
      if (data.ok) {
        setStatus('live'); setMode('live')
        localStorage.setItem(LS, JSON.stringify({ provider, model, key: remember ? key : '' }))
      } else { setStatus('error'); setMsg(data.error || 'could not connect') }
    } catch {
      setStatus('error'); setMsg('backend not reachable — start the FastAPI server (uvicorn) or use Replay')
    }
  }

  const useReplay = () => { setStatus('replay'); setMode('replay'); setOpen(false) }

  const dotColor = status === 'live' ? '#16b364' : status === 'error' ? '#ef4444' : status === 'connecting' ? '#f59e0b' : '#98a1ae'
  const label = status === 'live' ? `${PMAP[provider].label} · live` : status === 'connecting' ? 'connecting…' : status === 'error' ? 'connect failed' : 'Replay (no key)'

  return (
    <div className="pb" ref={pop}>
      <button className="pb-trigger" onClick={() => setOpen((o) => !o)}>
        <span className="pb-dot" style={{ background: dotColor, boxShadow: `0 0 7px ${dotColor}` }} />
        {label} <span className="pb-caret">▾</span>
      </button>

      {open && (
        <div className="pb-pop">
          <div className="pb-h">Model provider</div>
          <div className="pb-grid">
            {PROVIDERS.map((p) => (
              <button key={p.id} className={`pb-prov ${provider === p.id ? 'on' : ''}`} onClick={() => pickProvider(p.id)}>
                {p.label}{p.free && <span className="pb-free">free</span>}
              </button>
            ))}
          </div>

          <label className="pb-l">Model</label>
          <select className="pb-sel" value={model} onChange={(e) => setModel(e.target.value)}>
            {PMAP[provider].models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <label className="pb-l">API key <span className="pb-hint">· {PMAP[provider].hint}</span></label>
          <input className="pb-key" type="password" value={key} placeholder="paste key — stays in memory, never committed"
            onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck="false" />
          <label className="pb-remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember in this browser</label>

          {msg && <div className="pb-err">{msg}</div>}

          <div className="pb-actions">
            <button className="pb-connect" onClick={connect} disabled={status === 'connecting'}>{status === 'connecting' ? 'Connecting…' : 'Connect (live)'}</button>
            <button className="pb-replay" onClick={useReplay}>Use Replay</button>
          </div>
          <div className="pb-note">Replay runs the recorded demo with <b>zero</b> key and zero cost. Live needs the backend (uvicorn) running.</div>
        </div>
      )}
    </div>
  )
}
