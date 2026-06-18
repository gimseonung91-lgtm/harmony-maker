"""Harmony Maker OMR backend.

Receives a sheet-music image, runs oemer (optical music recognition), and
returns the resulting MusicXML. The uploaded image and every derived file are
deleted immediately after the response is built — nothing is retained on disk.
"""

import glob
import os
import shutil
import subprocess
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from preprocess import preprocess_image

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
    return {"status": "ok", "service": "harmony-maker-omr"}


@app.post("/omr", response_class=PlainTextResponse)
async def omr(file: UploadFile = File(...)):
    # Isolated temp dir so cleanup removes the image AND all oemer outputs.
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

        # Preprocess (deskew, lighting, binarize, resize) to improve OMR on
        # photos. Fall back to the original image if preprocessing fails.
        oemer_input = img_path
        try:
            pre_path = os.path.join(tmpdir, "preprocessed.png")
            preprocess_image(img_path, pre_path)
            oemer_input = pre_path
        except Exception as exc:  # noqa: BLE001 — preprocessing is best-effort
            print(f"preprocess skipped: {exc}", flush=True)

        # oemer writes "<stem>.musicxml" into the output directory.
        # Force UTF-8 decoding with replacement so non-locale bytes in oemer's
        # output never crash the capture (Windows defaults to cp949/etc.).
        result = subprocess.run(
            ["oemer", oemer_input, "-o", tmpdir],
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=600,
        )

        xml_files = (
            glob.glob(os.path.join(tmpdir, "*.musicxml"))
            + glob.glob(os.path.join(tmpdir, "*.xml"))
        )
        if not xml_files:
            full = (result.stderr or "") + "\n" + (result.stdout or "")
            # Log the complete oemer output server-side for diagnosis
            print("=== oemer failed (exit %s) ===" % result.returncode, flush=True)
            print(full, flush=True)
            print("=== end oemer output ===", flush=True)

            # Almost all end-user failures are staff detection on a too-small,
            # skewed or low-quality image. Return a clear, actionable message
            # rather than a raw Python traceback (full output is logged above).
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not recognize the score. oemer needs a clear, flat, "
                    "straight-on image with several complete staff systems — a "
                    "full printed page works best. Small partial crops, photos at "
                    "an angle, and handwritten scores usually fail."
                ),
            )

        with open(xml_files[0], "r", encoding="utf-8") as fh:
            return fh.read()

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="OMR timed out (image too complex).")
    finally:
        # Delete the uploaded image and every generated file right away.
        shutil.rmtree(tmpdir, ignore_errors=True)
