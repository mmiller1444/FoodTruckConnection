// Supabase Edge Function: notify
// Sends email notifications for:
// - new_request (to truck owners, either specific truck or blanket to all active trucks)
// - accepted (to business owner when a truck accepts)
// Uses Resend as a simple email provider (recommended).
//
// Env vars to set in Supabase (Functions -> Secrets):
// - RESEND_API_KEY
// - EMAIL_FROM   (e.g., "Food Truck Booking <no-reply@yourdomain.com>")
// - SERVICE_ROLE_KEY (match your Supabase service role key, server-to-server only)
//
// Request body:
// { type: "new_request"|"accepted", request_id: "<uuid>" }
//
// Security: requires header "x-api-key" == SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Body = { type: "new_request" | "accepted"; request_id: string };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function sendResendEmail(to: string[], subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!apiKey || !from) throw new Error("Missing RESEND_API_KEY or EMAIL_FROM");

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Resend error: ${resp.status} ${t}`);
  }
}

serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const apiKey = req.headers.get("x-api-key");
  const serviceRole = Deno.env.get("SERVICE_ROLE_KEY");
  if (!serviceRole || apiKey !== serviceRole) return json(401, { error: "Unauthorized" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = serviceRole;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { type, request_id } = body;
  if (!type || !request_id) return json(400, { error: "Missing type or request_id" });

  // Load request + related details
  const { data: reqRow, error: reqErr } = await supabase
    .from("truck_requests")
    .select("id, business_id, requested_truck_id, blanket_request, start_time, end_time, location_name, notes, accepted_truck_id")
    .eq("id", request_id)
    .single();

  if (reqErr || !reqRow) return json(404, { error: "Request not found" });

  const start = new Date(reqRow.start_time).toLocaleString("en-US", { timeZone: "America/Denver" });
  const end = new Date(reqRow.end_time).toLocaleString("en-US", { timeZone: "America/Denver" });

  if (type === "new_request") {
    // Determine recipient truck owners
    let truckRows: { owner_id: string; display_name: string }[] = [];

    if (reqRow.blanket_request) {
      const { data } = await supabase
        .from("trucks")
        .select("owner_id, display_name")
        .eq("is_active", true);
      truckRows = (data as any) || [];
    } else if (reqRow.requested_truck_id) {
      const { data } = await supabase
        .from("trucks")
        .select("owner_id, display_name")
        .eq("id", reqRow.requested_truck_id)
        .eq("is_active", true);
      truckRows = (data as any) || [];
    }

    const ownerIds = truckRows.map(t => t.owner_id);
    if (ownerIds.length === 0) return json(200, { ok: true, sent: 0 });

    const { data: emails } = await supabase
      .from("profiles")
      .select("email")
      .in("id", ownerIds);

    const to = ((emails as any) || []).map((e: any) => e.email).filter(Boolean);
    if (to.length === 0) return json(200, { ok: true, sent: 0 });

    const subject = `New food truck request: ${reqRow.location_name}`;
    const html = `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5">
        <h2>New request</h2>
        <p><b>When:</b> ${start} – ${end}</p>
        <p><b>Where:</b> ${reqRow.location_name}</p>
        ${reqRow.notes ? `<p><b>Notes:</b> ${reqRow.notes}</p>` : ""}
        <p>Log in to view and accept/ignore the request.</p>
      </div>
    `;

    await sendResendEmail(to, subject, html);
    return json(200, { ok: true, sent: to.length });
  }

  if (type === "accepted") {
    // Notify business owner
    const { data: biz } = await supabase.from("profiles").select("email, full_name").eq("id", reqRow.business_id).single();
    if (!biz?.email) return json(200, { ok: true, sent: 0 });

    let truckName = "A truck";
    if (reqRow.accepted_truck_id) {
      const { data: t } = await supabase.from("trucks").select("display_name").eq("id", reqRow.accepted_truck_id).single();
      if (t?.display_name) truckName = t.display_name;
    }

    const subject = `Request accepted: ${truckName} @ ${reqRow.location_name}`;
    const html = `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5">
        <h2>Your request was accepted</h2>
        <p><b>Truck:</b> ${truckName}</p>
        <p><b>When:</b> ${start} – ${end}</p>
        <p><b>Where:</b> ${reqRow.location_name}</p>
        <p>Log in for details.</p>
      </div>
    `;
    await sendResendEmail([biz.email], subject, html);
    return json(200, { ok: true, sent: 1 });
  }

  return json(400, { error: "Unknown type" });
});
