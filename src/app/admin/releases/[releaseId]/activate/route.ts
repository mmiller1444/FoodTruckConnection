import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getUserAndRole } from "../../../../../lib/auth";

export async function POST(_: Request, { params }: { params: { releaseId: string } }) {
  const { role, user } = await getUserAndRole();
  if (!user || role !== "admin") return NextResponse.redirect(new URL("/role-gate", "http://localhost:3000"));

  const supabase = createClient();
  await supabase.rpc("activate_release", { p_release_id: params.releaseId });

  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
