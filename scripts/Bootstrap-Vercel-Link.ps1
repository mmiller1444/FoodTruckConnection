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