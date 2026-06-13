"""
LLM factory for Titan Operations Sentinel.

Provider-agnostic on purpose: the demo runs on Groq (Llama 3.3 70B, free tier) but
the model is a one-line swap via TOS_MODEL. If no provider is reachable (no key,
offline, no Ollama), we fall back to a deterministic templated stub so the graph,
tools, and tests still run end-to-end without a network — important for development
and CI. The stub is clearly labelled in its output so it is never mistaken for a
real model response.

    TOS_MODEL=groq:llama-3.3-70b-versatile   (default)
    TOS_MODEL=ollama:llama3.1:8b             (offline fallback)
"""
from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

DEFAULT_MODEL = "groq:llama-3.3-70b-versatile"


class _StubLLM:
    """Last-resort offline fallback. Returns the user prompt's own structured
    context back as a flat summary so downstream nodes still produce output."""

    available = False

    def complete(self, system: str, user: str) -> str:
        return (
            "[LLM UNAVAILABLE — TEMPLATED FALLBACK]\n"
            "No model provider was reachable (set GROQ_API_KEY or run Ollama). "
            "The deterministic pipeline below ran on real tool data; only the "
            "natural-language synthesis is templated.\n\n" + user.strip()
        )


class _ChatLLM:
    available = True

    def __init__(self, model):
        self._model = model

    def complete(self, system: str, user: str) -> str:
        from langchain_core.messages import HumanMessage, SystemMessage

        resp = self._model.invoke(
            [SystemMessage(content=system), HumanMessage(content=user)]
        )
        return resp.content if hasattr(resp, "content") else str(resp)


@lru_cache(maxsize=1)
def get_llm():
    """Returns an object with .complete(system, user) -> str and .available bool."""
    model_str = os.getenv("TOS_MODEL", DEFAULT_MODEL)
    try:
        from langchain.chat_models import init_chat_model

        # init_chat_model accepts "provider:model"; temperature 0 for reproducible demos.
        model = init_chat_model(model_str, temperature=0)
        # Probe lazily — construction does not call the API, so a bad key only
        # surfaces on first invoke. We catch that at call sites and degrade.
        return _ChatLLM(model)
    except Exception as exc:  # noqa: BLE001 — any import/config failure → stub
        print(f"[llm] Could not init '{model_str}' ({exc}). Using offline stub.")
        return _StubLLM()


@lru_cache(maxsize=1)
def get_chat_model():
    """Return the raw LangChain chat model for ReAct agents (needs real tool-calling).
    Raises a clear error if no provider is configured — there is no offline stub here,
    because autonomous tool-calling cannot be faked."""
    model_str = os.getenv("TOS_MODEL", DEFAULT_MODEL)
    from langchain.chat_models import init_chat_model

    if model_str.startswith("groq:") and not os.getenv("GROQ_API_KEY"):
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to .env (free key at console.groq.com) "
            "or set TOS_MODEL=ollama:<model> for a local model. The multi-agent ReAct "
            "graph needs a real tool-calling model — it cannot run on the offline stub."
        )
    return init_chat_model(model_str, temperature=0)


def complete(system: str, user: str) -> str:
    """Convenience wrapper used by graph nodes. Degrades to the stub on runtime
    errors (e.g. dead network / rate limit mid-demo) so a node never hard-crashes."""
    llm = get_llm()
    try:
        return llm.complete(system, user)
    except Exception as exc:  # noqa: BLE001
        print(f"[llm] invoke failed ({exc}); falling back to templated output.")
        return _StubLLM().complete(system, user)
