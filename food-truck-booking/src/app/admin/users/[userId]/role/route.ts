import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getUserAndRole } from "../../../../../lib/auth";

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const { role } = await getUserAndRole();
  if (role !== "admin") return NextResponse.redirect(new URL("/role-gate", "http://localhost:3000"));

  const form = await req.formData();
  const newRole = String(form.get("role") || "");

  const supabase = createClient();
  await supabase.from("profiles").update({ role: newRole || null }).eq("id", params.userId);

  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
