#!/usr/bin/env bash
# Deploy MA-365 to Azure Container Apps. Run from the repo root after `az login` to the IllyRobotic tenant.
#   GOOGLE_CLIENT_ID=... ALLOWED_ORIGINS=https://illmedicine.github.io ./infra/deploy.sh
set -euo pipefail
SUB="${SUBSCRIPTION_ID:-4e9c29ed-dab9-424c-b2fd-67da06d22736}"
RG="${RG:-rg-ma365}"; LOC="${LOCATION:-eastus}"
az account set --subscription "$SUB"
az provider register -n Microsoft.App -n Microsoft.ContainerRegistry -n Microsoft.OperationalInsights -n Microsoft.Storage --wait >/dev/null
az group create -n "$RG" -l "$LOC" >/dev/null

# Encryption key for tenant tokens: generated once, then reused from the existing app's secret store on re-deploys.
KEY="${TOKEN_ENC_KEY:-$(openssl rand -base64 32)}"
P=(-g "$RG" -f infra/main.bicep -p tokenEncKey="$KEY" googleClientId="${GOOGLE_CLIENT_ID:-}" msClientId="${MS_CLIENT_ID:-}" msClientSecret="${MS_CLIENT_SECRET:-}" allowedOrigins="${ALLOWED_ORIGINS:-}")

ACR=$(az deployment group create "${P[@]}" -p image="" --query properties.outputs.acrName.value -o tsv)
TAG=$(git rev-parse --short HEAD 2>/dev/null || date +%s)
az acr build -r "$ACR" -t "ma365:$TAG" . 
URL=$(az deployment group create "${P[@]}" -p image="$ACR.azurecr.io/ma365:$TAG" --query properties.outputs.url.value -o tsv)
echo; echo "MA-365 is live: $URL"
echo "Google OAuth: add $URL (and any Pages origin) under Authorized JavaScript origins."
echo "Microsoft tenant connect: register redirect URI $URL/api/tenant/callback"
echo "NOTE: on re-deploys pass TOKEN_ENC_KEY=<same key> or stored tenant tokens become undecryptable."
echo "Key (save in a vault): $KEY"
