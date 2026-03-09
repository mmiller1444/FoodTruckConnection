import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export const supabaseAdmin = createClient(env.supabaseUrl, env.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
