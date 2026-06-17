# Titan Operations Sentinel — Web Console

A premium, projector-ready web UI that visualizes the multi-agent run in real time: the
supervisor routing between six agents, each agent's tool calls and reasoning, the human
approval gate, and the final costed action plan.

> **Built to demo with zero cost.** The frontend ships with a baked "Friday Cascade" event
> stream, so **Replay mode needs no backend, no API key, and spends nothing.** Use it for the
> live presentation. *Live mode* runs the real graph on Gemini for when you want to show it end-to-end.

---

## Quick start — Replay (recommended for the pitch)

```bash
cd webapp/frontend
npm install
npm run dev          # open http://localhost:5173
```

Pick a scenario (**Cascade / Edge / Escalation**), press **▶ Run Scenario**, and approve/reject
at the gate. No key, no backend, no spend — it always works on a projector.

## Live mode (real agents on Gemini)

In one terminal — the backend:
```bash
# repo root: set GOOGLE_API_KEY in .env first (see docs/SETUP_GEMINI.md)
pip install -r requirements.txt
pip install -r webapp/backend/requirements.txt
cd webapp/backend
uvicorn main:app --port 8000
```
In another — the frontend:
```bash
cd webapp/frontend && npm run dev
```
Toggle the **Live** segment in the top bar, then **Run Scenario**. The frontend proxies `/api`
to the backend (see `vite.config.js`); the backend streams the real LangGraph trace as SSE and
pauses at the approval gate (`POST /api/decision` resolves it).

---

## How it works

- **Backend** (`backend/main.py`): wraps `graph.py`, iterates `graph.stream(...)`, and emits each
  trace event (`route`, `tool_call`, `agent_report`, `approval_request`, `plan`, …) as SSE. The
  human approval `interrupt()` is resolved via `POST /api/decision`.
- **Frontend** (`frontend/src/`): one event reducer (`App.jsx`) drives the whole UI from that event
  shape — identical for replay (`cascade.js`) and live — so what you rehearse is what you demo.
- **Design**: industrial mission-control aesthetic (Saira + IBM Plex Mono), `index.css`.

## Demo-day tip
Rehearse and present on **Replay**. Keep **Live** as the "yes, it's real" proof — ideally after
you've recorded a golden run so even Live is backed by something you've already seen succeed.
