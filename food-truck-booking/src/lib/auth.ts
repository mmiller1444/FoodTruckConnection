import { createClient } from "./supabase/server";

export type AppRole = "truck_owner" | "business_owner" | "admin";

export async function getUserAndRole() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null as AppRole | null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (error) return { user, role: null as AppRole | null, profileError: error.message };
  return { user, role: profile?.role as AppRole, fullName: profile?.full_name as string | null };
}

export function assertRole(role: AppRole | null, allowed: AppRole[]) {
  return !!role && allowed.includes(role);
}
