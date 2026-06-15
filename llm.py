"""
LLM factory for Titan Operations Sentinel.

Provider-agnostic on purpose: the demo runs on Gemini (free tier / pay-as-you-go) but
the model is a one-line swap via TOS_MODEL. If no provider is reachable (no key,
offline, no Ollama), we fall back to a deterministic templated stub so the graph,
tools, and tests still run end-to-end without a network — important for development
and CI. The stub is clearly labelled in its output so it is never mistaken for a
real model response.

    TOS_MODEL=google_genai:gemini-2.5-flash       (default)
    TOS_MODEL=google_genai:gemini-2.5-flash-lite  (cheapest + highest free RPM)
    TOS_MODEL=groq:llama-3.3-70b-versatile        (fast alternative)
    TOS_MODEL=ollama:llama3.1:8b                  (offline fallback)

Rate-limit resilience: free tiers cap requests-per-minute, and the 6-agent system fires
a burst of calls per run. We pass max_retries so the provider client retries 429s with
exponential backoff instead of crashing a run mid-demo.
"""
from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

DEFAULT_MODEL = "google_genai:gemini-2.5-flash"

# Per-provider env var that must be present for that provider to work.
_PROVIDER_KEYS = {"groq:": "GROQ_API_KEY", "google_genai:": "GOOGLE_API_KEY"}

# Survive free-tier RPM spikes: retry rate-limited calls with backoff (provider client handles it).
MAX_RETRIES = 6


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

        # init_chat_model accepts "provider:model"; temperature 0 for reproducible demos;
        # max_retries lets the client back off on free-tier 429s instead of failing.
        model = init_chat_model(model_str, temperature=0, max_retries=MAX_RETRIES)
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

    for prefix, env_var in _PROVIDER_KEYS.items():
        if model_str.startswith(prefix) and not os.getenv(env_var):
            hint = ("free key at https://aistudio.google.com/apikey"
                    if env_var == "GOOGLE_API_KEY" else "free key at console.groq.com")
            raise RuntimeError(
                f"{env_var} is not set. Add it to .env ({hint}) or set "
                "TOS_MODEL=ollama:<model> for a local model. The multi-agent ReAct graph "
                "needs a real tool-calling model — it cannot run on the offline stub."
            )
    return init_chat_model(model_str, temperature=0, max_retries=MAX_RETRIES)


def complete(system: str, user: str) -> str:
    """Convenience wrapper used by graph nodes. Degrades to the stub on runtime
    errors (e.g. dead network / rate limit mid-demo) so a node never hard-crashes."""
    llm = get_llm()
    try:
        return llm.complete(system, user)
    except Exception as exc:  # noqa: BLE001
        print(f"[llm] invoke failed ({exc}); falling back to templated output.")
        return _StubLLM().complete(system, user)
