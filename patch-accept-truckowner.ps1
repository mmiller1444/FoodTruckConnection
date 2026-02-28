$ErrorActionPreference = "Stop"

function Ensure-Dir($path) {
  if (!(Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

function Write-File($path, $content) {
  Ensure-Dir (Split-Path $path -Parent)
  $content | Set-Content -Path $path -Encoding UTF8
  Write-Host "Wrote $path"
}

Write-Host "== Patching accept route to support truck_owner + admin =="

# 1) Update /api/admin/trucks to match schema (display_name)
Write-File "src/app/api/admin/trucks/route.ts" @"
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getUserAndRole } from "../../../../lib/auth";

export async function GET() {
  const { user, role } = await getUserAndRole();
  if (!user || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("trucks")
    .select("id, display_name, owner_id, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ items: data || [] });
}
"@

# 2) Replace accept route with correct logic
Write-File "src/app/api/requests/[requestId]/accept/route.ts" @"
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { getUserAndRole } from "../../../../../lib/auth";

function bad(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request, ctx: { params: { requestId: string } }) {
  const { user, role } = await getUserAndRole();
  if (!user) return bad(401, "Unauthorized");

  const requestId = ctx.params.requestId;
  const body = await req.json().catch(() => ({}));

  const admin = createAdminClient();

  // Determine truckId to accept as
  let truckId: string | null = null;

  if (role === "truck_owner") {
    // Truck owners accept as their own truck (unique owner_id)
    const { data: truck, error: tErr } = await admin
      .from("trucks")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (tErr) return bad(400, tErr.message);
    if (!truck?.id) return bad(400, "No truck found for this truck owner");
    truckId = truck.id;
  } else if (role === "admin") {
    // Admin can accept as any truck (trucks.id)
    truckId = body.accept_as_truck_id || null;
    if (!truckId) return bad(400, "accept_as_truck_id is required for admin");
  } else {
    return bad(403, "Forbidden");
  }

  // Load request
  const { data: reqRow, error: reqErr } = await admin
    .from("truck_requests")
    .select("id, status, start_time, end_time, requested_truck_id, blanket_request")
    .eq("id", requestId)
    .single();

  if (reqErr || !reqRow) return bad(404, "Request not found");
  if (reqRow.status !== "pending") return bad(400, "Request is not pending");

  // If request is for a specific truck, enforce match
  if (!reqRow.blanket_request && reqRow.requested_truck_id && reqRow.requested_truck_id !== truckId) {
    return bad(403, "This request is for a different truck");
  }

  // Conflict check: accepted requests for same truck overlapping window
  const { data: conflicts, error: cErr } = await admin
    .from("truck_requests")
    .select("id")
    .eq("status", "accepted")
    .eq("accepted_truck_id", truckId)
    .lt("start_time", reqRow.end_time)
    .gt("end_time", reqRow.start_time)
    .limit(1);

  if (cErr) return bad(400, cErr.message);
  if (conflicts && conflicts.length > 0) return bad(409, "Truck is already booked for that time range");

  // Accept
  const { error: upErr } = await admin
    .from("truck_requests")
    .update({ status: "accepted", accepted_truck_id: truckId })
    .eq("id", requestId);

  if (upErr) return bad(400, upErr.message);

  // Notify via Edge Function (ignore failures)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const fnUrl = `${supabaseUrl}/functions/v1/notify`;

  await fetch(fnUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({ type: "accepted", request_id: requestId }),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
"@

Write-Host "`n== Done =="
Write-Host "Next:"
Write-Host "  npm run build"
Write-Host "  git add src/app/api/admin/trucks/route.ts src/app/api/requests/[requestId]/accept/route.ts"
Write-Host "  git commit -m `"Fix accept route for truck_owner + admin`""
Write-Host "  git push"