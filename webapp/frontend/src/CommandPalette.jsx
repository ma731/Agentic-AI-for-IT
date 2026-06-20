import { useEffect } from 'react'
import { Command } from 'cmdk'
import { TEAM, GUEST } from './team.js'

// ⌘K / Ctrl+K operator palette: jump to any view, run a scenario, or switch presenter.
export default function CommandPalette({ open, setOpen, navItems, setNav, scenarios, onRun, me, onSwitchUser, onSignOut }) {
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setOpen])

  const go = (fn) => { fn(); setOpen(false) }

  return (
    <Command.Dialog className="cmdk" open={open} onOpenChange={setOpen} label="Command palette">
      <div className="cmdk-top">
        <span className="cmdk-glyph">⌘</span>
        <Command.Input placeholder="Search views, scenarios, presenters…" autoFocus />
        <kbd className="cmdk-esc">ESC</kbd>
      </div>
      <Command.List>
        <Command.Empty>No matches.</Command.Empty>

        <Command.Group heading="Navigate">
          {navItems.map((n) => (
            <Command.Item key={n.id} value={`go ${n.label}`} onSelect={() => go(() => setNav(n.id))}>
              <span className="cmdk-ic">{n.ic}</span>{n.label}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Run scenario">
          {scenarios.map((s) => (
            <Command.Item key={s.id} value={`run ${s.label} ${s.desc}`} onSelect={() => go(() => onRun(s.id))}>
              <span className="cmdk-ic">▶</span>Run {s.label}<span className="cmdk-hint">{s.desc}</span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Switch presenter">
          {[...TEAM, GUEST].map((m) => (
            <Command.Item key={m.name} value={`user ${m.name}`} onSelect={() => go(() => onSwitchUser?.(m))}>
              <span className="cmdk-ava" style={{ background: m.color }}>{m.initials}</span>
              {m.name}{m.name === me?.name && <span className="cmdk-hint">current</span>}
            </Command.Item>
          ))}
          <Command.Item value="sign out logout" onSelect={() => go(() => onSignOut?.())}>
            <span className="cmdk-ic" style={{ color: '#e1655c' }}>⎋</span>Sign out
          </Command.Item>
        </Command.Group>
      </Command.List>
      <div className="cmdk-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> select</span>
        <span className="cmdk-foot-brand">Operations Sentinel</span>
      </div>
    </Command.Dialog>
  )
}
