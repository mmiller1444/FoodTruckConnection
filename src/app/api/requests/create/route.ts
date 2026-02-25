import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";
import { getUserAndRole } from "../../../../lib/auth";

function bad(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  const { user, role } = await getUserAndRole();
  if (!user || role !== "business_owner") return bad(401, "Unauthorized");

  const body = await req.json().catch(() => null);
  if (!body) return bad(400, "Invalid JSON");

  const {
    requested_truck_id,
    blanket_request,
    start_time,
    end_time,
    location_name,
    location_lat,
    location_lng,
    notes,
  } = body;

  if (!start_time || !end_time || !location_name) return bad(400, "Missing required fields");

  const admin = createAdminClient();

  const { data: inserted, error } = await admin
    .from("truck_requests")
    .insert({
      business_id: user.id,
      requested_truck_id: blanket_request ? null : (requested_truck_id || null),
      blanket_request: !!blanket_request,
      start_time,
      end_time,
      location_name,
      location_lat: location_lat ?? null,
      location_lng: location_lng ?? null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error) return bad(400, error.message);

  // Call Edge Function notify (server-to-server)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const fnUrl = `${supabaseUrl}/functions/v1/notify`;

  await fetch(fnUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({ type: "new_request", request_id: inserted.id }),
  }).catch(() => { /* ignore notify failures in MVP */ });

  return NextResponse.json({ ok: true, id: inserted.id });
}
