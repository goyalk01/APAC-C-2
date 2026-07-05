# SwarmGuard API — reproducible container build (Phase 4 requirement).
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# node_keys.json / swarm_cache.db are runtime artifacts — generated or
# mounted at deploy time, not baked into the image.
ENV API_HOST=0.0.0.0
ENV API_PORT=8010

EXPOSE 8010

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8010"]
