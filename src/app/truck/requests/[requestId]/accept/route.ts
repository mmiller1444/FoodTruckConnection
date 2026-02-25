import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getUserAndRole } from "../../../../../lib/auth";

export async function POST(_: Request, { params }: { params: { requestId: string } }) {
  const { role, user } = await getUserAndRole();
  if (!user || role !== "truck_owner") return NextResponse.redirect(new URL("/role-gate", "http://localhost:3000"));

  const supabase = createClient();
  const { data: myTruck } = await supabase.from("trucks").select("id").eq("owner_id", user.id).single();

  const { error } = await supabase.rpc("accept_truck_request", { p_request_id: params.requestId, p_truck_id: myTruck?.id });
  // If accepted, notify business via Edge Function
  if (!error) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const fnUrl = `${supabaseUrl}/functions/v1/notify`;
    await fetch(fnUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({ type: "accepted", request_id: params.requestId }),
    }).catch(() => {});
  }
  return NextResponse.redirect(new URL("/truck/dashboard", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
