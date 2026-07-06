# SwarmGuard Mesh Relay Container
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY mesh_relay.py .

ENV RELAY_HOST=0.0.0.0

CMD ["python", "mesh_relay.py"]
