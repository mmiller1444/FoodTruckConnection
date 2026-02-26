import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.request_id) return NextResponse.json({ error: "request_id required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: reqRow, error: reqErr } = await admin
    .from("truck_requests")
    .select("id, business_id, location_name, start_time, end_time, accepted_truck_id")
    .eq("id", body.request_id)
    .single();

  if (reqErr || !reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  let truckName = "A truck";
  if (reqRow.accepted_truck_id) {
    const { data: t } = await admin.from("trucks").select("display_name").eq("id", reqRow.accepted_truck_id).single();
    if (t?.display_name) truckName = t.display_name;
  }

  const start = new Date(reqRow.start_time).toLocaleString();
  const end = new Date(reqRow.end_time).toLocaleString();

  await admin.from("notifications").insert({
    user_id: reqRow.business_id,
    request_id: reqRow.id,
    message: `Accepted: ${truckName} @ ${reqRow.location_name} (${start} – ${end})`,
  });

  return NextResponse.json({ ok: true });
}
