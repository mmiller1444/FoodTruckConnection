import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  const url = new URL("/login", request.url);
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(request: Request) {
  return GET(request);
}
