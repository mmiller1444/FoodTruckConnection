param(
    [string]$Environment = "preview"
)

$ErrorActionPreference = "Stop"

Write-Host "Installing dependencies..."
npm ci

Write-Host "Running lint..."
npm run lint

Write-Host "Running Next.js build..."
npm run build

Write-Host "Local verification completed for environment: $Environment"