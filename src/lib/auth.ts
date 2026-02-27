import { createClient } from "./supabase/server";

export type UserRole = "admin" | "truck_owner" | "business_owner" | null;

export function assertRole(role: UserRole, allowed: Exclude<UserRole, null>[]) {
  return role !== null && allowed.includes(role as any);
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
      profileError: null as string | null,
    };
  }

  const { data: profile, error } = await supabase
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
