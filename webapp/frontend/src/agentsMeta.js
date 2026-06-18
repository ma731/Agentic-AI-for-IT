// Shared agent metadata used by both the engine (App) and the dashboard view.
export const AGENTS = [
  { id: 'reliability', name: 'Reliability', chal: 'CH-1 · Predictive Maintenance', tint: 'blue' },
  { id: 'supply_chain', name: 'Supply Chain', chal: 'CH-2 · Sourcing & Risk', tint: 'green' },
  { id: 'production', name: 'Production', chal: 'CH-3 · Human-Robot Scheduling', tint: 'purple' },
  { id: 'quality', name: 'Quality', chal: 'CH-4 · Defect Traceability', tint: 'orange' },
  { id: 'compliance_safety', name: 'Compliance', chal: 'CH-5 · Safety / OSHA Gate', tint: 'red' },
]
export const AGENT_MAP = Object.fromEntries(AGENTS.map((a) => [a.id, a]))
