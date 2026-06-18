# Golden-Run Recording (you do this once)

The demo plays back from a recorded run, so demo day spends **zero** API credits and **cannot fail
live**. Recording it needs a real model once — so it's a *you* step (your free key, your machine).
~5 minutes.

## 1. Get a free key (no card)
- Gemini: https://aistudio.google.com/apikey  → `GOOGLE_API_KEY`
- or OpenRouter (one key, many free models): https://openrouter.ai/keys → `OPENROUTER_API_KEY`

## 2. Configure (from repo root)
```bash
pip install -r requirements.txt
cp .env.example .env          # then paste your key into .env
```
Auto-detect picks up whichever key you set; or force one with `TOS_MODEL=...`.

## 3. Record each path (writes logs/tos_audit.jsonl)
```bash
python scripts/run_demo.py happy
python scripts/run_demo.py edge
python scripts/run_demo.py escalation
```
If a free tier rate-limits mid-run, switch model and re-run that one:
```bash
# .env: TOS_MODEL=google_genai:gemini-2.5-flash-lite   (or openrouter:…:free)
```

## 4. Verify the token-free replay
```bash
python scripts/view_run.py          # replays the last run with NO API calls
python scripts/view_run.py --list   # see all recorded runs
```

## 5. Commit the golden run
```bash
git add -f logs/tos_audit.jsonl     # (logs/ is gitignored — force-add the golden one)
git commit -m "chore: commit golden-run audit log for the demo"
git push
```

## Demo day
Present on **replay** (`view_run.py`, or the web console in Replay mode) — instant, free, identical
every time. Keep one live run as the "yes, it's real" proof if the room and the quota allow.

> Tip: record when you're NOT rate-limited (early in the day / fresh quota), and record each path
> twice so you keep the cleanest take.
