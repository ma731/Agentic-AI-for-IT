// Shared agent metadata used by both the engine (App) and the dashboard view.
export const AGENTS = [
  { id: 'reliability', name: 'Reliability', chal: 'CH-1 · Predictive Maintenance', tint: 'blue', desc: 'Predicts the failure and remaining life' },
  { id: 'supply_chain', name: 'Supply Chain', chal: 'CH-2 · Sourcing & Risk', tint: 'green', desc: 'Sources parts by cost and ROI' },
  { id: 'production', name: 'Production', chal: 'CH-3 · Human-Robot Scheduling', tint: 'purple', desc: 'Reroutes jobs around the downtime' },
  { id: 'quality', name: 'Quality', chal: 'CH-4 · Defect Traceability', tint: 'orange', desc: 'Guards traceability and defect risk' },
  { id: 'compliance_safety', name: 'Compliance', chal: 'CH-5 · Safety / OSHA Gate', tint: 'red', desc: 'Gates every action vs OSHA / OEM limits' },
]
export const AGENT_MAP = Object.fromEntries(AGENTS.map((a) => [a.id, a]))
