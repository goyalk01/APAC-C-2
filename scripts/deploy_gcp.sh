#!/bin/bash
# SwarmGuard AI — GCP Free Tier Deployer (Unix/Bash)
set -e

echo "============================================================"
echo "         SwarmGuard AI — GCP Cloud Run Deployer"
echo "============================================================"

# 1. Prerequisite Checks
if ! command -v gcloud &> /dev/null; then
    echo "[ERROR] gcloud CLI is not installed or not in PATH."
    echo "Please install the Google Cloud SDK first: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# 2. Get Project Configuration
read -p "Enter your GCP Project ID: " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    echo "[ERROR] Project ID cannot be empty."
    exit 1
fi

read -p "Enter GCP Region (default: us-central1): " REGION
if [ -z "$REGION" ]; then
    REGION="us-central1"
fi

echo -e "\n[1/7] Setting up gcloud configuration..."
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"

echo -e "\n[2/7] Enabling required GCP APIs..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# 3. Create Artifact Registry Repository
REPO_NAME="swarmguard-repo"
echo -e "\n[3/7] Setting up Artifact Registry repository ($REPO_NAME)..."
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project="$PROJECT_ID" &> /dev/null; then
    gcloud artifacts repositories create "$REPO_NAME" \
        --repository-format=docker \
        --location="$REGION" \
        --description="SwarmGuard AI Container Registry"
else
    echo "Repository $REPO_NAME already exists."
fi

# Generate a secure token for Mesh Relay Auth
RELAY_TOKEN=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9')

# 4. Deploy Mesh Relay
echo -e "\n[4/7] Building and deploying Mesh Relay to Cloud Run..."
RELAY_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/mesh-relay:latest"
gcloud builds submit --tag "$RELAY_TAG" ./services/mesh_network

gcloud run deploy mesh-relay \
    --image="$RELAY_TAG" \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=5 \
    --set-env-vars="RELAY_AUTH_TOKEN=$RELAY_TOKEN"

RELAY_URL=$(gcloud run services describe mesh-relay --format="value(status.url)")
RELAY_WS_URL=$(echo "$RELAY_URL" | sed 's/^https:/wss:/')
echo "Mesh Relay Deployed: $RELAY_WS_URL"

# 5. Deploy Backend API
echo -e "\n[5/7] Building and deploying Backend API..."
API_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/backend-api:latest"
gcloud builds submit --tag "$API_TAG" ./apps/api

gcloud run deploy backend-api \
    --image="$API_TAG" \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=5 \
    --set-env-vars="MESH_RELAY_URL=${RELAY_WS_URL}?token=$RELAY_TOKEN,RELAY_AUTH_TOKEN=$RELAY_TOKEN,CORS_ALLOWED_ORIGINS=*"

API_URL=$(gcloud run services describe backend-api --format="value(status.url)")
API_WS_URL=$(echo "$API_URL" | sed 's/^https:/wss:/')
echo "Backend API Deployed: $API_URL"

# 6. Deploy Frontend
echo -e "\n[6/7] Building and deploying Next.js Frontend..."
FRONTEND_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/frontend:latest"
gcloud builds submit --tag "$FRONTEND_TAG" ./apps/web \
    --build-arg="NEXT_PUBLIC_API_BASE_URL=$API_URL/api/v1" \
    --build-arg="NEXT_PUBLIC_WS_URL=$API_WS_URL/ws/dashboard"

gcloud run deploy frontend-web \
    --image="$FRONTEND_TAG" \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=5

FRONTEND_URL=$(gcloud run services describe frontend-web --format="value(status.url)")
echo "Frontend Deployed: $FRONTEND_URL"

# 7. Update Backend CORS Restriction
echo -e "\n[7/7] Restricting Backend CORS to Frontend URL..."
gcloud run services update backend-api \
    --set-env-vars="MESH_RELAY_URL=${RELAY_WS_URL}?token=$RELAY_TOKEN,RELAY_AUTH_TOKEN=$RELAY_TOKEN,CORS_ALLOWED_ORIGINS=$FRONTEND_URL"

echo "============================================================"
echo "           SwarmGuard AI Cloud Deployment Completed"
echo "============================================================"
echo "🖥️  Frontend URL:   $FRONTEND_URL"
echo "📡  Backend API:    $API_URL"
echo "🔌  Mesh Relay:     $RELAY_WS_URL"
echo "🔐  Relay Token:    $RELAY_TOKEN"
echo "============================================================"
echo "To run simulated edge nodes locally pointing to the cloud:"
echo "  export MESH_RELAY_URL='${RELAY_WS_URL}?token=$RELAY_TOKEN'"
echo "  python scripts/run_decoupled_demo.py"
echo "  (Since local simulation uses deterministic keys, it will authenticate perfectly!)"
