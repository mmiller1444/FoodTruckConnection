import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerComponentClient } from "./supabase/server";

export type UserRole = "admin" | "truck_owner" | "business_owner" | null;

export function assertRole(role: UserRole, allowed: Exclude<UserRole, null>[]) {
  return role !== null && allowed.includes(role as any);
}

export async function getUserAndRole(supabase?: SupabaseClient) {
  const sb = supabase ?? createServerComponentClient();

  const { data: { user }, error: userErr } = await sb.auth.getUser();

  if (userErr || !user) {
    return {
      user: null,
      role: null as UserRole,
      fullName: null,
      email: null,
      profileExists: false,
      profileError: userErr?.message ?? null,
    };
  }

  const { data: profile, error } = await sb
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      user,
      role: null as UserRole,
      fullName: null,
      email: user.email ?? null,
      profileExists: false,
      profileError: error.message,
    };
  }

  if (!profile) {
    return {
      user,
      role: null as UserRole,
      fullName: null,
      email: user.email ?? null,
      profileExists: false,
      profileError: null,
    };
  }

  return {
    user,
    role: (profile.role as UserRole) ?? null,
    fullName: profile.full_name ?? null,
    email: profile.email ?? user.email ?? null,
    profileExists: true,
    profileError: null as string | null,
  };
}