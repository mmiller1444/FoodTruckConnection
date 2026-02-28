import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getUserAndRole } from "../../../../lib/auth";

function bad(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  const { user, role } = await getUserAndRole();

  if (!user) return bad(401, "Unauthorized");

  const isAdmin = role === "admin";
  const isBusiness = role === "business_owner";

  if (!isAdmin && !isBusiness) return bad(403, "Forbidden");

  const body = await req.json().catch(() => null);
  if (!body) return bad(400, "Invalid JSON");

  const {
    // admin override: who is the business placing the request
    business_id, // REQUIRED when admin
    requested_truck_id,
    blanket_request,
    start_time,
    end_time,
    location_name,
    location_lat,
    location_lng,
    notes,
  } = body;

  if (!start_time || !end_time || !location_name) {
    return bad(400, "Missing required fields");
  }

  // Determine which business owns this request
  const effectiveBusinessId = isAdmin ? business_id : user.id;

  if (isAdmin && !effectiveBusinessId) {
    return bad(400, "Admins must supply business_id");
  }

  const admin = createAdminClient();

  const { data: inserted, error } = await admin
    .from("truck_requests")
    .insert({
      business_id: effectiveBusinessId,
      requested_truck_id: blanket_request ? null : (requested_truck_id ?? null),
      blanket_request: !!blanket_request,
      start_time,
      end_time,
      location_name,
      location_lat: location_lat ?? null,
      location_lng: location_lng ?? null,
      notes: notes ?? null,
      created_by: user.id, // add this column if you want an audit trail
    })
    .select("id")
    .single();

  if (error) return bad(400, error.message);

  // In-app notifications (server-to-server)
  await fetch(new URL("/api/notify/new-request", req.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ request_id: inserted.id }),
  }).catch(() => {});

  // Edge Function notify (server-to-server)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const fnUrl = `${supabaseUrl}/functions/v1/notify`;

  await fetch(fnUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({ type: "new_request", request_id: inserted.id }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: inserted.id });
}