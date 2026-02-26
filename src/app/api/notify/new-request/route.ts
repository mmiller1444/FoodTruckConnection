import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.request_id) return NextResponse.json({ error: "request_id required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: reqRow, error: reqErr } = await admin
    .from("truck_requests")
    .select("id, blanket_request, requested_truck_id, location_name, start_time, end_time")
    .eq("id", body.request_id)
    .single();

  if (reqErr || !reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  // Determine recipients (truck owners)
  let trucks: any[] = [];
  if (reqRow.blanket_request) {
    const { data } = await admin.from("trucks").select("owner_id").eq("is_active", true);
    trucks = data || [];
  } else if (reqRow.requested_truck_id) {
    const { data } = await admin.from("trucks").select("owner_id").eq("id", reqRow.requested_truck_id);
    trucks = data || [];
  }

  const start = new Date(reqRow.start_time).toLocaleString();
  const end = new Date(reqRow.end_time).toLocaleString();

  const inserts = (trucks || []).map((t) => ({
    user_id: t.owner_id,
    request_id: reqRow.id,
    message: `New request: ${reqRow.location_name} (${start} – ${end})`,
  }));

  if (inserts.length) await admin.from("notifications").insert(inserts);

  return NextResponse.json({ ok: true, inserted: inserts.length });
}
