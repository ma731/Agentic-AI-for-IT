"""
FastAPI bridge — streams the LangGraph trace as Server-Sent Events so the web
console can render a live run.

The frontend's *Replay* mode needs none of this (it plays a baked stream with zero
cost). This backend powers *Live* mode: it runs the real 6-agent graph on Gemini and
streams each trace event as it happens, pausing at the human-approval interrupt.

Run (from webapp/backend, with GOOGLE_API_KEY in the repo-root .env):
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""
import json
import sys
import threading
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Make the repo root importable (graph.py, llm.py, agents/, tools/ live there).
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

app = FastAPI(title="Titan Operations Sentinel API")

# Single-user demo: one pending approval at a time, keyed by run_id.
_decision_value: dict[str, str] = {}
_decision_ready: dict[str, threading.Event] = {}


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@app.get("/api/health")
def health():
    return {"ok": True}


class Decision(BaseModel):
    decision: str            # "approve" | "reject"
    run_id: str | None = None


@app.post("/api/decision")
def decision(d: Decision):
    """Resolve the human-in-the-loop approval gate for a paused run."""
    rid = d.run_id or (next(iter(_decision_ready)) if _decision_ready else None)
    if rid and rid in _decision_ready:
        _decision_value[rid] = "approve" if d.decision.lower().startswith("a") else "reject"
        _decision_ready[rid].set()
        return {"ok": True, "run_id": rid}
    return {"ok": False, "error": "no pending approval"}


@app.get("/api/providers")
def providers():
    """Catalog of model providers + which are ready, and the active one."""
    import llm
    return {"active": llm.active_provider(), "model": llm.resolve_model(), "providers": llm.supported()}


class Config(BaseModel):
    provider: str
    model: str
    apiKey: str | None = None


@app.post("/api/config")
def configure(c: Config):
    """Switch provider/model live (key held in memory only — never written to disk)."""
    import llm
    p = llm.PROVIDER_BY_ID.get(c.provider)
    if not p:
        return {"ok": False, "error": f"unknown provider '{c.provider}'"}
    if c.apiKey:
        os.environ[p["keys"][0]] = c.apiKey            # in-memory for this process only
    os.environ["TOS_MODEL"] = f"{c.provider}:{c.model}"
    llm.get_chat_model.cache_clear()
    llm.get_llm.cache_clear()
    try:
        llm.get_chat_model()                            # validate it builds with the given key
        return {"ok": True, "active": llm.active_provider(), "model": llm.resolve_model()}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)[:200]}


@app.get("/api/run")
def run(scenario: str = "happy"):
    def gen():
        from graph import build_graph, make_initial_state
        from langgraph.types import Command

        graph = build_graph()
        state = make_initial_state(scenario)
        rid = state["run_id"]
        cfg = {"configurable": {"thread_id": rid}, "recursion_limit": 50}
        ready = threading.Event()
        _decision_ready[rid] = ready

        def drain(stream):
            """Yield ('event', e) for each trace event; end with ('interrupt', value|None)."""
            interrupted = None
            for chunk in stream:
                if "__interrupt__" in chunk:
                    interrupted = chunk["__interrupt__"][0].value
                    continue
                for _node, upd in chunk.items():
                    for e in ((upd or {}).get("trace") or []):
                        if e.get("type") != "plan":   # the plan is emitted, enriched, at the end
                            yield ("event", e)
            yield ("interrupt", interrupted)

        try:
            interrupted = None
            for kind, payload in drain(graph.stream(state, cfg)):
                if kind == "event":
                    yield _sse(payload)
                else:
                    interrupted = payload

            if interrupted is not None:
                req = dict(interrupted)
                req["type"] = "approval_request"
                yield _sse(req)
                ready.wait(timeout=300)
                choice = _decision_value.get(rid, "reject")
                for kind, payload in drain(graph.stream(Command(resume={"decision": choice}), cfg)):
                    if kind == "event":
                        yield _sse(payload)

            final = graph.get_state(cfg).values
            yield _sse({
                "type": "plan",
                "status": final.get("status", "complete"),
                "text": final.get("final_plan", ""),
            })
        finally:
            _decision_ready.pop(rid, None)
            _decision_value.pop(rid, None)

    return StreamingResponse(gen(), media_type="text/event-stream")
