# Hugging Face Spaces (Docker SDK) — serves on port 7860.
FROM python:3.11-slim

# oemer/opencv need these system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces run the container as uid 1000; install into the user's home so
# oemer can write its model checkpoints.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Warm-up: bake oemer's model checkpoints into the image for fast cold starts.
# Tolerant — if it fails, models simply download on the first real request.
RUN curl -fsSL -o /tmp/sample.jpg \
        https://raw.githubusercontent.com/BreezeWhite/oemer/main/figures/tabi.jpg \
    && oemer /tmp/sample.jpg -o /tmp \
    ; rm -f /tmp/sample.jpg /tmp/*.musicxml 2>/dev/null; true

COPY --chown=user app.py .

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
