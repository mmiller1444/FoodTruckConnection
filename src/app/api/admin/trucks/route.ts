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
