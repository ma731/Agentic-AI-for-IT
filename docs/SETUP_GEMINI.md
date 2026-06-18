# Setup — running on Gemini (team guide)

Everyone runs the same way. You need **one** thing: a free Gemini API key. No credit card,
no Google Cloud project, no subscription.

> Heads-up: a consumer **Google AI Pro / Ultra** subscription does **NOT** give API access —
> that's the chat app. We use a **Google AI Studio API key** (below), which is free.

---

## 1. Get a free Gemini API key (2 min)

1. Go to **https://aistudio.google.com/apikey**
2. Sign in with any Google account → **Create API key**
3. Copy it (looks like `AIza...`). That's it — free tier, no card.

You do **not** need Google Cloud or Vertex AI. Ignore anything that asks for a billing project.

---

## 2. Configure the project

From the repo root:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Open `.env` and set your key (leave the model as-is):

```
GOOGLE_API_KEY=AIza...your_key...
TOS_MODEL=google_genai:gemini-2.5-flash
```

That's the whole setup. Nothing else to change.

---

## 3. Run it

```bash
python scripts/run_demo.py            # happy path (auto-approves)
python scripts/run_demo.py edge       # cross-plant adaptation
python scripts/run_demo.py escalation # telemetry dropout -> human review

cd webapp/frontend && npm install && npm run dev   # the demo UI with the approve/reject button (see webapp/README.md)
```

Offline tool tests need no key:

```bash
python -m pytest tests/test_tools.py
```

---

## 4. Don't want to burn the free quota? (recommended for demo day)

The free tier is limited (a handful of full runs/day). Two ways to stay safe:

- **Record once, replay forever — uses ZERO credits:**
  ```bash
  python scripts/run_demo.py happy        # one live run records logs/tos_audit.jsonl
  python scripts/view_run.py              # replay it any number of times, no API calls
  ```
  Commit a good `logs/tos_audit.jsonl` as the "golden run" and present from the replay.

- **If you hit rate limits while rehearsing**, switch to the lighter, higher-throughput model
  (one line in `.env`):
  ```
  TOS_MODEL=google_genai:gemini-2.5-flash-lite
  ```

The app already retries on rate-limit (429) errors with backoff, so brief spikes won't crash a run.

---

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| `GOOGLE_API_KEY is not set` | You skipped step 2, or `.env` isn't in the repo root. |
| `429 / ResourceExhausted` repeatedly | Free quota for the day is spent → use `view_run.py` (replay), or switch to `flash-lite`. |
| Want to run with no internet | `TOS_MODEL=ollama:llama3.1:8b` after `ollama serve` (tool-calling quality is lower). |

---

## Cost, if anyone asks

- **Free tier:** €0, no card. Enough for the demo via the replay trick above.
- **Pay-as-you-go (optional, NOT a subscription):** `gemini-2.5-flash-lite` starts at ~$0.10 per
  million input tokens → a full week of rehearsals is roughly **$1–3**. Enable billing only if the
  free tier's daily limit gets annoying. Never buy AI Pro/Ultra for this — it won't help the API.
