FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/opt/hf \
    DB_PATH=/data/resume_matcher.db

WORKDIR /app

# CPU-only PyTorch keeps the image ~2 GB smaller than the default CUDA build
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch==2.15.0

COPY requirements.txt .
RUN pip install -r requirements.txt gunicorn==23.0.0

# Bake the embedding model into the image so pods start without downloading it
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

RUN useradd --create-home --uid 10001 app \
    && mkdir -p /data \
    && chown -R app /data /opt/hf
USER app

EXPOSE 5000

# One worker keeps a single copy of the model in memory and lets agent runs
# (background threads) share it; threads handle concurrent requests.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "8", "--timeout", "300", "app:app"]
