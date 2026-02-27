import { createClient } from "./supabase/server";

export type UserRole = "admin" | "truck_owner" | "business_owner" | null;

export function assertRole(role: UserRole, allowed: UserRole[]) {
  return role !== null && allowed.includes(role);
}

export async function getUserAndRole() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      role: null as UserRole,
      fullName: null,
      email: null,
      profileExists: false,
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || error) {
    return {
      user,
      role: null as UserRole,
      fullName: null,
      email: user.email ?? null,
      profileExists: false,
    };
  }

  return {
    user,
    role: (profile.role as UserRole) ?? null,
    fullName: profile.full_name ?? null,
    email: profile.email ?? user.email ?? null,
    profileExists: true,
  };
}