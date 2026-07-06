# SwarmGuard API — reproducible container build (Phase 4 requirement).
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# node_keys.json / swarm_cache.db are runtime artifacts — generated or
# mounted at deploy time, not baked into the image.
COPY node_keys.json ./node_keys.json

ENV API_HOST=0.0.0.0
ENV NODE_KEYS_PATH=/app/node_keys.json

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8010}"]
