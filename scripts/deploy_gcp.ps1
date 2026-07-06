param(
    [string]$ProjectId = $env:PROJECT_ID,
    [string]$Region = $env:REGION
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         SwarmGuard AI — GCP Cloud Run Deployer" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Prerequisite Checks
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] gcloud CLI is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install the Google Cloud SDK first: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    Exit 1
}

# 2. Get Project Configuration
if ([string]::IsNullOrWhiteSpace($ProjectId)) {
    $ProjectId = Read-Host 'Enter your GCP Project ID'
}
if ([string]::IsNullOrWhiteSpace($ProjectId)) {
    Write-Host "[ERROR] Project ID cannot be empty." -ForegroundColor Red
    Exit 1
}

if ([string]::IsNullOrWhiteSpace($Region)) {
    $Region = Read-Host 'Enter GCP Region (default: us-central1)'
}
if ([string]::IsNullOrWhiteSpace($Region)) {
    $Region = "us-central1"
}

Write-Host "`n[1/7] Setting up gcloud configuration..." -ForegroundColor Yellow
gcloud config set project $projectId
gcloud config set run/region $region

Write-Host "`n[2/7] Enabling required GCP APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# 3. Create Artifact Registry Repository if it doesn't exist
$repoName = "swarmguard-repo"
Write-Host "`n[3/7] Setting up Artifact Registry repository ($repoName)..." -ForegroundColor Yellow
$repoExists = gcloud artifacts repositories describe $repoName --location=$region --project=$projectId --format='value(name)' -ErrorAction SilentlyContinue
if (!$repoExists) {
    gcloud artifacts repositories create $repoName `
        --repository-format=docker `
        --location=$region `
        --description="SwarmGuard AI Container Registry"
} else {
    Write-Host "Repository $repoName already exists." -ForegroundColor Green
}

# Generate a secure token for Mesh Relay Auth
$relayToken = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
$relayToken = $relayToken -replace '[^a-zA-Z0-9]', '' # Clean token

# 4. Deploy Mesh Relay
Write-Host "`n[4/7] Building and deploying Mesh Relay to Cloud Run..." -ForegroundColor Yellow
$relayTag = "$region-docker.pkg.dev/$projectId/$repoName/mesh-relay:latest"

# Build in cloud via Cloud Build
gcloud builds submit --tag $relayTag ./services/mesh_network

# Deploy to Cloud Run
gcloud run deploy mesh-relay `
    --image=$relayTag `
    --platform=managed `
    --allow-unauthenticated `
    --min-instances=0 `
    --max-instances=5 `
    --set-env-vars="RELAY_AUTH_TOKEN=$relayToken"

# Get Mesh Relay URL
$relayUrl = gcloud run services describe mesh-relay --format='value(status.url)'
# Convert https:// to wss://
$relayWsUrl = $relayUrl -replace '^https://', 'wss://'
Write-Host "Mesh Relay Deployed: $relayWsUrl" -ForegroundColor Green

# 5. Deploy Backend API
Write-Host "`n[5/7] Building and deploying Backend API..." -ForegroundColor Yellow
$apiTag = "$region-docker.pkg.dev/$projectId/$repoName/backend-api:latest"

gcloud builds submit --tag $apiTag ./apps/api

# Deploy to Cloud Run (Initially with wild CORS to allow Next.js build verification, will restrict later)
gcloud run deploy backend-api `
    --image=$apiTag `
    --platform=managed `
    --allow-unauthenticated `
    --min-instances=0 `
    --max-instances=5 `
    --set-env-vars="MESH_RELAY_URL=$($relayWsUrl)?token=$relayToken,RELAY_AUTH_TOKEN=$relayToken,CORS_ALLOWED_ORIGINS=*"

$apiUrl = gcloud run services describe backend-api --format='value(status.url)'
$apiWsUrl = $apiUrl -replace '^https://', 'wss://'
Write-Host "Backend API Deployed: $apiUrl" -ForegroundColor Green

# 6. Deploy Frontend
Write-Host "`n[6/7] Building and deploying Next.js Frontend..." -ForegroundColor Yellow
$frontendTag = "$region-docker.pkg.dev/$projectId/$repoName/frontend:latest"

# Build Next.js in cloud with build-time environment arguments
gcloud builds submit --tag $frontendTag ./apps/web `
    --build-arg="NEXT_PUBLIC_API_BASE_URL=$apiUrl/api/v1" `
    --build-arg="NEXT_PUBLIC_WS_URL=$apiWsUrl/ws/dashboard"

gcloud run deploy frontend-web `
    --image=$frontendTag `
    --platform=managed `
    --allow-unauthenticated `
    --min-instances=0 `
    --max-instances=5

$frontendUrl = gcloud run services describe frontend-web --format='value(status.url)'
Write-Host "Frontend Deployed: $frontendUrl" -ForegroundColor Green

# 7. Update Backend CORS Restriction
Write-Host "`n[7/7] Restricting Backend CORS to Frontend URL..." -ForegroundColor Yellow
gcloud run services update backend-api `
    --set-env-vars="MESH_RELAY_URL=$($relayWsUrl)?token=$relayToken,RELAY_AUTH_TOKEN=$relayToken,CORS_ALLOWED_ORIGINS=$frontendUrl"

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "           SwarmGuard AI Cloud Deployment Completed" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "🖥️  Frontend URL:   $frontendUrl" -ForegroundColor Cyan
Write-Host "📡  Backend API:    $apiUrl" -ForegroundColor Cyan
Write-Host "🔌  Mesh Relay:     $relayWsUrl" -ForegroundColor Cyan
Write-Host "🔐  Relay Token:    $relayToken" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Green
Write-Host "To run simulated edge nodes locally pointing to the cloud:"
Write-Host "  `$env:MESH_RELAY_URL='$($relayWsUrl)?token=$relayToken'"
Write-Host "  python scripts/run_decoupled_demo.py"
Write-Host "  (Since local simulation uses deterministic keys, it will authenticate perfectly!)"
