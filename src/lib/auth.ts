import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AppRole = 'admin' | 'business_owner' | 'truck_owner' | 'anonymous';

export async function getUserAndRole() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { user: null, role: 'anonymous' as AppRole, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    user,
    profile,
    role: (profile?.role ?? 'anonymous') as AppRole
  };
}

export async function requireRole(roles: AppRole[]) {
  const payload = await getUserAndRole();
  if (!payload.user || !roles.includes(payload.role)) {
    redirect('/login');
  }
  return payload;
}
