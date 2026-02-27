export async function getUserAndRole() {
  const supabase = createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  if (!user) {
    return { user: null, role: null, fullName: null, email: null, profileExists: false };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  // maybeSingle() returns null when no row found
  if (!profile || error) {
    return { user, role: null, fullName: null, email: user.email ?? null, profileExists: false };
  }

  return {
    user,
    role: profile.role ?? null,
    fullName: profile.full_name ?? null,
    email: profile.email ?? user.email ?? null,
    profileExists: true,
  };
}