param(
    [string]$ProjectRoot = ".",
    [string]$ProductionBranch = "main",
    [string]$NodeVersion = "20"
)

$ErrorActionPreference = "Stop"

function Get-FullPath {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$RelativePath
    )

    $resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
    return [System.IO.Path]::GetFullPath((Join-Path $resolvedRoot $RelativePath))
}

function Write-FileUtf8 {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    $fullPath = Get-FullPath -Root $Root -RelativePath $Path
    $dir = Split-Path -Parent $fullPath

    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    [System.IO.File]::WriteAllText(
        $fullPath,
        $Content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

function Add-LineIfMissing {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string]$Line
    )

    $fullPath = Get-FullPath -Root $Root -RelativePath $FilePath

    if (-not (Test-Path $fullPath)) {
        $dir = Split-Path -Parent $fullPath
        if ($dir -and -not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }

        [System.IO.File]::WriteAllText(
            $fullPath,
            $Line + [Environment]::NewLine,
            (New-Object System.Text.UTF8Encoding($false))
        )
        return
    }

    $content = Get-Content -Raw -LiteralPath $fullPath
    if ($content -notmatch [Regex]::Escape($Line)) {
        Add-Content -LiteralPath $fullPath -Value $Line
    }
}

$resolvedRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
Write-Host "Using project root: $resolvedRoot"

# ----------------------------
# .gitignore updates
# ----------------------------
$gitIgnorePath = ".gitignore"
$gitIgnoreLines = @(
    "node_modules",
    ".next",
    ".vercel",
    ".env",
    ".env.local",
    ".env.production.local",
    ".env.development.local",
    ".env.test.local",
    "coverage",
    "dist",
    "out"
)

foreach ($line in $gitIgnoreLines) {
    Add-LineIfMissing -Root $ProjectRoot -FilePath $gitIgnorePath -Line $line
}

# ----------------------------
# vercel.json
# ----------------------------
$vercelJson = @'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "github": {
    "enabled": false
  }
}
'@
Write-FileUtf8 -Root $ProjectRoot -Path "vercel.json" -Content $vercelJson

# ----------------------------
# Package.json note
# ----------------------------
$packageNote = @'
Required package.json scripts:

{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}

If you already have these, no change is needed.
'@
Write-FileUtf8 -Root $ProjectRoot -Path "scripts/CI-CD-Package-Scripts-Note.txt" -Content $packageNote

# ----------------------------
# Helper script: local verification
# ----------------------------
$verifyScript = @'
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
'@
Write-FileUtf8 -Root $ProjectRoot -Path "scripts/Verify-App.ps1" -Content $verifyScript

# ----------------------------
# Helper script: Vercel bootstrap
# ----------------------------
$bootstrapScript = @'
param(
    [Parameter(Mandatory = $true)][string]$VercelOrgId,
    [Parameter(Mandatory = $true)][string]$VercelProjectId
)

$ErrorActionPreference = "Stop"

Write-Host "Creating .vercel/project.json so CI can run non-interactively..."

$vercelDir = Join-Path (Get-Location) ".vercel"
if (-not (Test-Path $vercelDir)) {
    New-Item -ItemType Directory -Path $vercelDir -Force | Out-Null
}

$projectJson = @"
{
  "projectId": "$VercelProjectId",
  "orgId": "$VercelOrgId"
}
"@

[System.IO.File]::WriteAllText(
    (Join-Path $vercelDir "project.json"),
    $projectJson,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "Created .vercel/project.json"
Write-Host "Store VERCEL_TOKEN as a GitHub secret. Do not commit tokens."
'@
Write-FileUtf8 -Root $ProjectRoot -Path "scripts/Bootstrap-Vercel-Link.ps1" -Content $bootstrapScript

# ----------------------------
# GitHub Actions workflow
# IMPORTANT:
# Use single-quoted here-string so GitHub ${{ }} is not parsed by PowerShell
# ----------------------------
$workflow = @'
name: Vercel CI/CD

on:
  pull_request:
    branches:
      - __PRODUCTION_BRANCH__
  push:
    branches:
      - __PRODUCTION_BRANCH__
  workflow_dispatch:

concurrency:
  group: vercel-${{ github.ref }}
  cancel-in-progress: true

jobs:
  preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '__NODE_VERSION__'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Setup Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Preview to Vercel
        id: deploy_preview
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "deployment_url=$url" >> $GITHUB_OUTPUT
          echo "Preview deployment created: $url"

      - name: Comment Preview URL on PR
        uses: actions/github-script@v7
        with:
          script: |
            const url = process.env.DEPLOYMENT_URL;
            const body = `Preview deployment is ready: ${url}`;
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            });
        env:
          DEPLOYMENT_URL: ${{ steps.deploy_preview.outputs.deployment_url }}

  production:
    if: github.event_name == 'push' && github.ref == 'refs/heads/__PRODUCTION_BRANCH__'
    runs-on: ubuntu-latest
    permissions:
      contents: read

    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '__NODE_VERSION__'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Setup Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Production to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
'@

$workflow = $workflow.Replace("__PRODUCTION_BRANCH__", $ProductionBranch)
$workflow = $workflow.Replace("__NODE_VERSION__", $NodeVersion)

Write-FileUtf8 -Root $ProjectRoot -Path ".github/workflows/vercel-cicd.yml" -Content $workflow

# ----------------------------
# Optional CI-only workflow
# ----------------------------
$ciWorkflow = @'
name: CI Validation

on:
  pull_request:
  workflow_dispatch:

jobs:
  validate:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '__NODE_VERSION__'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
'@

$ciWorkflow = $ciWorkflow.Replace("__NODE_VERSION__", $NodeVersion)
Write-FileUtf8 -Root $ProjectRoot -Path ".github/workflows/ci.yml" -Content $ciWorkflow

# ----------------------------
# Secrets checklist
# ----------------------------
$secretsDoc = @'
GitHub repository secrets required:

VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

Recommended application secrets managed in Vercel Project Settings:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM

Notes:
- Put deployment credentials in GitHub Secrets.
- Put runtime app secrets primarily in Vercel Project Environment Variables.
- Do not commit .env files to Git.
'@
Write-FileUtf8 -Root $ProjectRoot -Path "docs/GitHub-Secrets-Checklist.txt" -Content $secretsDoc

# ----------------------------
# README addendum
# ----------------------------
$readmeAddendum = @'
## GitHub Actions + Vercel CI/CD

This project is configured to deploy through GitHub Actions instead of the default Vercel Git integration.

### Required GitHub Secrets
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID

### Deployment Flow
- Pull requests create Preview deployments
- Pushes to the production branch create Production deployments

### Local setup
1. Run: npm install
2. Run: npm run lint
3. Run: npm run build

### Notes
- Runtime environment variables should be configured in Vercel Project Settings
- Keep .env files out of Git
'@
Write-FileUtf8 -Root $ProjectRoot -Path "docs/README-CICD-ADDENDUM.md" -Content $readmeAddendum

Write-Host ""
Write-Host "CI/CD files created successfully."
Write-Host "Next steps:"
Write-Host "1. Run git add ."
Write-Host "2. Commit and push to GitHub"
Write-Host "3. Add GitHub Secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID"
Write-Host "4. Add app environment variables in Vercel dashboard"