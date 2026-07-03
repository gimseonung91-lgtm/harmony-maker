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

FastAPI service that runs [oemer](https://github.com/BreezeWhite/oemer) optical
music recognition. Upload a sheet-music image and get MusicXML back.

The uploaded image and all generated files are deleted immediately after each
request — nothing is stored.

## Endpoints
- `GET /` — health check
- `POST /omr` — multipart form field `file` (image) → returns MusicXML (text)

## Deploy on Hugging Face Spaces
1. Create a new **Space** → SDK: **Docker**.
2. Push these `backend/` files to the Space repo (this README's frontmatter
   configures it automatically).
3. First request after a cold start is slow (model download + CPU inference).

### Hardware tier (speed vs. cost)
The **free CPU Basic** tier is too slow for real use — a single page can take
**over 600s** and time out. Upgrade the Space's hardware in
**Settings → Space variables and secrets → Hardware**:

| Tier | Cost | Approx. time / page |
|---|---|---|
| CPU Basic (free) | $0 | >600s (often times out) |
| CPU Upgrade | ~$0.03/hr | tens of seconds |
| Nvidia T4 small | ~$0.40/hr | a few seconds |

Billing is per-second while the Space is running, so set a short **sleep
timeout** (Settings → "Sleep time") to avoid paying while idle. Start with
**CPU Upgrade** — it's the cheapest fix and should be enough; only move to a
GPU tier if pages are still too slow.

## Run locally
```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 7860
```
