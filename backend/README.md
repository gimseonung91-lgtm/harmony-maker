---
title: Harmony Maker OMR
emoji: 🎼
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Harmony Maker OMR backend

FastAPI service that runs optical music recognition. Upload a sheet-music
image and get MusicXML back.

**Engine:** [Audiveris](https://github.com/Audiveris/audiveris) (in the Docker
image) — classical-CV OMR that runs in tens of seconds on CPU and is generally
more accurate on printed scores than the previous deep-learning engine
([oemer](https://github.com/BreezeWhite/oemer), which took 10+ minutes per
page on free CPU hardware). `app.py` auto-detects the engine: it uses
Audiveris when the launcher is found (`AUDIVERIS_BIN` env var or on PATH) and
falls back to oemer otherwise (local dev).

The uploaded image and all generated files are deleted immediately after each
request — nothing is stored.

## Endpoints
- `GET /` — health check (includes which `engine` is active)
- `POST /omr` — multipart form field `file` (image) → returns MusicXML (text)

## Deploy on Hugging Face Spaces
1. Create a new **Space** → SDK: **Docker**.
2. Push these `backend/` files to the Space repo (this README's frontmatter
   configures it automatically).
3. No model downloads — cold starts are fast.

### Hardware tier (speed vs. cost)
Audiveris is CPU-friendly, so the **free CPU Basic** tier may already be
usable (expect roughly 30–90s per page). If that's too slow, upgrade in the
Space's **Settings → Hardware**:

| Tier | Cost | Notes |
|---|---|---|
| CPU Basic (free) | $0 | try this first with Audiveris |
| CPU Upgrade | ~$0.03/hr | faster cores, ~2× speedup |

GPU tiers are unnecessary — Audiveris does not use a GPU. If you pay for an
upgrade, set a short **sleep timeout** (Settings → "Sleep time") so the Space
suspends while idle.

## Run locally

**Option A — oemer fallback (no Java needed, slow):**
```bash
pip install -r requirements.txt   # includes oemer
uvicorn app:app --host 0.0.0.0 --port 7860
```

**Option B — Audiveris (fast):** install
[Audiveris](https://github.com/Audiveris/audiveris/releases) for your OS, then:
```bash
pip install -r requirements-server.txt
set AUDIVERIS_BIN=C:\Program Files\Audiveris\Audiveris.exe   # Windows example
uvicorn app:app --host 0.0.0.0 --port 7860
```
