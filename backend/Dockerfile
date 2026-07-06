# Hugging Face Spaces (Docker SDK) — serves on port 7860.
#
# OMR engine: Audiveris (bundled JRE via the official .deb release).
# Classical-CV pipeline → fast on CPU (tens of seconds/page), no model
# downloads, no GPU needed. oemer is NOT installed in this image (it remains
# a local-dev fallback only; app.py auto-detects which engine is available).
FROM ubuntu:24.04

ARG AUDIVERIS_VERSION=5.10.2
ARG DEBIAN_FRONTEND=noninteractive

# - tesseract-ocr(-eng): Audiveris uses Tesseract for text/lyrics OCR
# - libgl1/libglib2.0-0: required by opencv-python-headless at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl \
        python3 python3-venv \
        tesseract-ocr tesseract-ocr-eng \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install the official Audiveris release (bundles its own Java runtime),
# then expose the launcher on PATH. `test -x` fails the build early if the
# package layout ever changes.
# The empty xdg data folders keep the .deb's post-install script from failing
# in a container: xdg-desktop-menu, xdg-mime and xdg-icon-resource each abort
# with "No writable system … directory found" (postinst exit 3) otherwise.
RUN mkdir -p /usr/share/desktop-directories /usr/share/mime/packages \
        /usr/share/icons/hicolor /usr/share/applications \
    && curl -fsSL -o /tmp/audiveris.deb \
        "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-x86_64.deb" \
    && apt-get update && apt-get install -y --no-install-recommends /tmp/audiveris.deb \
    && rm /tmp/audiveris.deb && rm -rf /var/lib/apt/lists/* \
    && AUD="$(find /opt -maxdepth 3 -type f -name 'Audiveris' | head -n 1)" \
    && test -x "$AUD" \
    && ln -s "$AUD" /usr/local/bin/audiveris

ENV AUDIVERIS_BIN=/usr/local/bin/audiveris \
    TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata

# Python deps in a venv (Ubuntu 24.04 blocks system-wide pip installs)
COPY requirements-server.txt /tmp/requirements-server.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements-server.txt
ENV PATH=/opt/venv/bin:$PATH

# HF Spaces run the container as uid 1000 — ubuntu:24.04 already ships an
# `ubuntu` user with that uid; Audiveris writes its config under $HOME.
USER ubuntu
ENV HOME=/home/ubuntu
WORKDIR /home/ubuntu/app

COPY --chown=ubuntu app.py preprocess.py .

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
