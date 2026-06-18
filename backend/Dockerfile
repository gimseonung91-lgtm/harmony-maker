# Hugging Face Spaces (Docker SDK) — serves on port 7860.
FROM python:3.11-slim

# oemer/opencv need these system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces run the container as uid 1000; install into the user's home so
# oemer can write its model checkpoints (downloaded on the first request).
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# NOTE: oemer's model checkpoints download on the first request (build-time
# warm-up was tried but exhausts the builder's resources). The 600s request
# timeout in app.py covers that first slow request.

COPY --chown=user app.py preprocess.py .

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
