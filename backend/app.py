"""Harmony Maker OMR backend.

Receives a sheet-music image, runs optical music recognition, and returns the
resulting MusicXML. Two engines are supported:

- **Audiveris** (preferred, used in the Docker image): classical CV pipeline,
  fast on CPU (tens of seconds per page) and generally more accurate on
  printed scores. Selected when the launcher binary is found (AUDIVERIS_BIN
  env var, or `Audiveris`/`audiveris` on PATH).
- **oemer** (fallback for local dev without Audiveris installed): deep-learning
  pipeline, very slow on CPU (~minutes per page).

The uploaded image and every derived file are deleted immediately after the
response is built — nothing is retained on disk.
"""

import glob
import os
import shutil
import subprocess
import tempfile
import zipfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from preprocess import preprocess_image

OMR_TIMEOUT = int(os.environ.get("OMR_TIMEOUT", "600"))

AUDIVERIS_BIN = (
    os.environ.get("AUDIVERIS_BIN")
    or shutil.which("Audiveris")
    or shutil.which("audiveris")
)
ENGINE = "audiveris" if AUDIVERIS_BIN else "oemer"

app = FastAPI(title="Harmony Maker OMR")

# Allow the frontend (GitHub Pages, local dev) to call this service.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok", "service": "harmony-maker-omr", "engine": ENGINE}


def run_engine(image_path: str, outdir: str) -> subprocess.CompletedProcess:
    """Run the selected OMR engine, writing MusicXML into outdir."""
    if ENGINE == "audiveris":
        cmd = [
            AUDIVERIS_BIN,
            "-batch",
            "-transcribe",
            "-export",
            # Ask for uncompressed .xml; if this option ever disappears the
            # .mxl fallback in collect_musicxml() still covers us.
            "-option", "org.audiveris.omr.sheet.BookManager.useCompression=false",
            "-output", outdir,
            image_path,
        ]
    else:
        cmd = ["oemer", image_path, "-o", outdir]

    # Force UTF-8 decoding with replacement so non-locale bytes in the
    # engine's output never crash the capture (Windows defaults to cp949).
    return subprocess.run(
        cmd,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
        timeout=OMR_TIMEOUT,
    )


def collect_musicxml(outdir: str) -> str | None:
    """Find the engine's MusicXML output and return its text.

    oemer writes `<stem>.musicxml`; Audiveris writes `<stem>.xml` (or a
    compressed `<stem>.mxl`, possibly inside a per-book subfolder).
    """
    candidates = (
        glob.glob(os.path.join(outdir, "**", "*.musicxml"), recursive=True)
        + glob.glob(os.path.join(outdir, "**", "*.xml"), recursive=True)
    )
    # Ignore container metadata that may sit next to real output.
    candidates = [p for p in candidates if "META-INF" not in p]
    if candidates:
        with open(candidates[0], "r", encoding="utf-8") as fh:
            return fh.read()

    # Compressed MusicXML (.mxl) — a zip whose payload is the score XML.
    for mxl in glob.glob(os.path.join(outdir, "**", "*.mxl"), recursive=True):
        with zipfile.ZipFile(mxl) as zf:
            names = [
                n for n in zf.namelist()
                if n.endswith((".xml", ".musicxml")) and not n.startswith("META-INF")
            ]
            if names:
                return zf.read(names[0]).decode("utf-8", errors="replace")

    return None


@app.post("/omr", response_class=PlainTextResponse)
async def omr(file: UploadFile = File(...)):
    # Isolated temp dir so cleanup removes the image AND all engine outputs.
    tmpdir = tempfile.mkdtemp(prefix="omr_")

    # Use an ASCII filename: OpenCV/oemer's cv2.imread cannot read non-ASCII
    # (e.g. Korean) paths on Windows, which silently yields a None image.
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"):
        ext = ".png"
    img_path = os.path.join(tmpdir, f"input{ext}")

    try:
        contents = await file.read()
        with open(img_path, "wb") as fh:
            fh.write(contents)

        # Preprocess (deskew, lighting, resize) to improve OMR on photos.
        # Fall back to the original image if preprocessing fails.
        omr_input = img_path
        try:
            pre_path = os.path.join(tmpdir, "preprocessed.png")
            # oemer needs a width cap for CPU cost; Audiveris prefers full res
            # and rejects sheets whose staff interline is under ~10px, so small
            # images (web previews, thumbnails) get upscaled aggressively.
            preprocess_image(
                img_path, pre_path,
                max_width=None if ENGINE == "audiveris" else 1500,
                min_width=2200 if ENGINE == "audiveris" else 1000,
            )
            omr_input = pre_path
        except Exception as exc:  # noqa: BLE001 — preprocessing is best-effort
            print(f"preprocess skipped: {exc}", flush=True)

        result = run_engine(omr_input, tmpdir)
        xml = collect_musicxml(tmpdir)

        if xml is None:
            full = (result.stderr or "") + "\n" + (result.stdout or "")
            # Log the complete engine output server-side for diagnosis
            print(f"=== {ENGINE} failed (exit {result.returncode}) ===", flush=True)
            print(full, flush=True)
            print(f"=== end {ENGINE} output ===", flush=True)

            # Almost all end-user failures are staff detection on a too-small,
            # skewed or low-quality image. Return a clear, actionable message
            # rather than a raw traceback (full output is logged above).
            if "interline value" in full or "resolution is too low" in full:
                detail = (
                    "이미지 해상도가 너무 낮습니다 — 오선 줄 간격이 몇 픽셀밖에 "
                    "되지 않습니다. 더 큰 스캔/사진을 업로드해 주세요 (가로 "
                    "2,000px 이상 — 300 DPI 스캔이나 원본 크기 촬영본. 웹 "
                    "미리보기 캡처는 실패합니다)."
                )
            else:
                detail = (
                    "악보를 인식하지 못했습니다. 인쇄된 악보를 평평하게 정면에서 "
                    "찍은 선명한 이미지가 필요합니다 — 전체 페이지 스캔이 가장 잘 "
                    "됩니다. 부분 크롭, 기울어진 사진, 손글씨 악보는 대부분 "
                    "실패합니다."
                )
            raise HTTPException(status_code=422, detail=detail)

        return xml

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="OMR 처리 시간이 초과되었습니다 (이미지가 너무 복잡합니다).")
    finally:
        # Delete the uploaded image and every generated file right away.
        shutil.rmtree(tmpdir, ignore_errors=True)
