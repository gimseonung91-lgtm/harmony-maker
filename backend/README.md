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

## Run locally
```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 7860
```
