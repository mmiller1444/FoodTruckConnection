# apply-fixes.ps1
# Run from the project root

$ErrorActionPreference = "Stop"

function Ensure-Dir($path) {
  if (!(Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

function Write-File($path, $content) {
  Ensure-Dir (Split-Path $path -Parent)
  $content | Set-Content -Path $path -Encoding UTF8
  Write-Host "Wrote $path"
}

function Replace-InFile($path, $pattern, $replacement) {
  if (!(Test-Path $path)) { return $false }
  $txt = Get-Content $path -Raw
  $new = [regex]::Replace($txt, $pattern, $replacement)
  if ($new -ne $txt) {
    Set-Content -Path $path -Value $new -Encoding UTF8
    Write-Host "Updated $path"
    return $true
  }
  return $false
}

function Replace-Literal($path, $old, $new) {
  if (!(Test-Path $path)) { return $false }
  $txt = Get-Content $path -Raw
  if ($txt.Contains($old)) {
    $txt = $txt.Replace($old, $new)
    Set-Content -Path $path -Value $txt -Encoding UTF8
    Write-Host "Updated $path"
    return $true
  }
  return $false
}

Write-Host "== Applying login/logout + admin access fixes =="

# 1) Ensure /login landing page exists (3 options)
$loginLanding = "src/app/login/page.tsx"
if (!(Test-Path $loginLanding)) {
  Write-File $loginLanding @"
import Link from "next/link";

export default function LoginLandingPage() {
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      <p className="small">Choose your login type:</p>

      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        <Link className="btn primary" href="/login/business">Business Owner</Link>
        <Link className="btn primary" href="/login/food-truck">Food Truck</Link>
        <Link className="btn primary" href="/login/admin">Admin</Link>
      </div>

      <hr />

      <p className="small">
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
"@
} else {
  Write-Host "Exists: $loginLanding"
}

# 2) Replace /signout route to hard refresh + no-store
Write-File "src/app/signout/route.ts" @"
import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  const url = new URL("/login", request.url);
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(request: Request) {
  return GET(request);
}
"@

# 3) Update RoleLoginForm to push() then refresh() after successful login
$roleLogin = "src/components/RoleLoginForm.tsx"
if (Test-Path $roleLogin) {
  # Replace common pattern router.refresh(); router.push(...)
  Replace-InFile $roleLogin 'router\.refresh\(\);\s*router\.push\(([^)]+)\);' 'router.push($1);`n    router.refresh();' | Out-Null

  # If not found, replace simple success block by inserting refresh after push
  # This targets: router.push(redirectTo);
  Replace-InFile $roleLogin 'router\.push\((redirectTo)\);\s*' 'router.push($1);`n    router.refresh();`n' | Out-Null
} else {
  Write-Host "WARNING: $roleLogin not found. Skipping login refresh fix."
}

# 4) Allow admin to pass business/truck guards (assertRole checks)
# Convert:
# assertRole(role, ["business_owner"]) -> ["business_owner","admin"]
# assertRole(role, ["truck_owner"]) -> ["truck_owner","admin"]
$targets = @(
  "src/app/business",
  "src/app/truck"
)

foreach ($dir in $targets) {
  if (!(Test-Path $dir)) { continue }
  Get-ChildItem -Path $dir -Recurse -Filter "*.tsx" | ForEach-Object {
    $p = $_.FullName
    $txt = Get-Content $p -Raw

    $new = $txt
    $new = [regex]::Replace($new, 'assertRole\(\s*role\s*,\s*\[\s*"business_owner"\s*\]\s*\)', 'assertRole(role, ["business_owner", "admin"])')
    $new = [regex]::Replace($new, 'assertRole\(\s*role\s*,\s*\[\s*"truck_owner"\s*\]\s*\)', 'assertRole(role, ["truck_owner", "admin"])')

    # Also handle role !== "business_owner" checks (if present)
    $new = [regex]::Replace($new, 'role\s*!==\s*"business_owner"', '(role !== "business_owner" && role !== "admin")')
    $new = [regex]::Replace($new, 'role\s*!==\s*"truck_owner"', '(role !== "truck_owner" && role !== "admin")')

    if ($new -ne $txt) {
      Set-Content -Path $p -Value $new -Encoding UTF8
      Write-Host "Updated guard(s): $p"
    }
  }
}

# 5) Add admin links (Business/Trucks) to header in layout if it exists
$layout = "src/app/layout.tsx"
if (Test-Path $layout) {
  $layoutTxt = Get-Content $layout -Raw

  # Try to augment an existing admin block by inserting links if missing
  if ($layoutTxt -match 'role\s*===\s*"admin"') {
    if ($layoutTxt -notmatch 'href="/business/dashboard"' -or $layoutTxt -notmatch 'href="/truck/dashboard"') {
      # Insert after /admin/users link if present, otherwise after /admin link
      $layoutNew = $layoutTxt

      if ($layoutNew -match 'href="/admin/users"') {
        $layoutNew = [regex]::Replace(
          $layoutNew,
          '(href="/admin/users"[^>]*>[^<]*</Link>\s*)',
          "`$1`n                  <Link href=`"/business/dashboard`" className=`"btn`">Business</Link>`n                  <Link href=`"/truck/dashboard`" className=`"btn`">Trucks</Link>`n",
          1
        )
      } elseif ($layoutNew -match 'href="/admin"') {
        $layoutNew = [regex]::Replace(
          $layoutNew,
          '(href="/admin"[^>]*>[^<]*</Link>\s*)',
          "`$1`n                  <Link href=`"/business/dashboard`" className=`"btn`">Business</Link>`n                  <Link href=`"/truck/dashboard`" className=`"btn`">Trucks</Link>`n",
          1
        )
      }

      if ($layoutNew -ne $layoutTxt) {
        Set-Content -Path $layout -Value $layoutNew -Encoding UTF8
        Write-Host "Updated header links in $layout"
      } else {
        Write-Host "Could not auto-insert header links; please add manually in $layout"
      }
    } else {
      Write-Host "Admin header links already present."
    }
  } else {
    Write-Host "No admin block detected in $layout. Skipping header links."
  }
} else {
  Write-Host "WARNING: $layout not found. Skipping header update."
}

# 6) Force dynamic on key pages (optional but recommended)
$dynamicTargets = @(
  "src/app/role-gate/page.tsx",
  "src/app/admin/page.tsx",
  "src/app/admin/users/page.tsx"
)

foreach ($f in $dynamicTargets) {
  if (!(Test-Path $f)) { continue }
  $t = Get-Content $f -Raw
  if ($t -notmatch 'export const dynamic\s*=\s*"force-dynamic"') {
    $t = "export const dynamic = `"force-dynamic`";`n`n" + $t
    Set-Content -Path $f -Value $t -Encoding UTF8
    Write-Host "Added force-dynamic: $f"
  }
}

Write-Host "`n== Done =="
Write-Host "Next:"
Write-Host "  npm run build"
Write-Host "  git add ."
Write-Host "  git commit -m `"Admin access + refresh on login/logout`""
Write-Host "  git push"