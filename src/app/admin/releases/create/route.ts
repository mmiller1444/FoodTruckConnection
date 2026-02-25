import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { getUserAndRole } from "../../../../lib/auth";

export async function POST(req: Request) {
  const { role } = await getUserAndRole();
  if (role !== "admin") return NextResponse.redirect(new URL("/role-gate", "http://localhost:3000"));

  const form = await req.formData();
  const version = String(form.get("version") || "").trim();
  const notes = String(form.get("notes") || "").trim();

  const supabase = createClient();
  await supabase.from("releases").insert({ version, notes, is_active: false });

  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
