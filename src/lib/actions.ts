'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';
import { sendEmailNotification } from '@/lib/email';

async function writeAudit(actionType: string, targetTable: string, targetId: string | null, details: Record<string, unknown>) {
  await supabaseAdmin.from('admin_audit_log').insert({
    action_type: actionType,
    target_table: targetTable,
    target_id: targetId,
    details
  });
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function createBusinessRequest(formData: FormData) {
  const { profile } = await requireRole(['business_owner', 'admin']);
  const supabase = await createClient();

  const payload = {
    business_id: profile?.business_id,
    requested_truck_id: formData.get('requested_truck_id') || null,
    blanket_request: formData.get('blanket_request') === 'true',
    service_date: String(formData.get('service_date')),
    start_time: String(formData.get('start_time')),
    end_time: String(formData.get('end_time')),
    event_name: String(formData.get('event_name')),
    event_address: String(formData.get('event_address')),
    notes: String(formData.get('notes') || '')
  };

  const { data: inserted, error } = await supabase.from('truck_requests').insert(payload).select('*').single();
  if (error) throw new Error(error.message);

  if (inserted?.blanket_request) {
    const { data: trucks } = await supabaseAdmin.from('trucks').select('owner_email').eq('active', true);
    await Promise.all((trucks || []).map((truck) =>
      sendEmailNotification(
        truck.owner_email,
        `New blanket food truck request: ${inserted.event_name}`,
        `A new blanket request was posted for ${inserted.event_name} on ${inserted.service_date} from ${inserted.start_time} to ${inserted.end_time}.`
      )
    ));
  } else if (inserted?.requested_truck_id) {
    const { data: truck } = await supabaseAdmin
      .from('trucks')
      .select('owner_email')
      .eq('id', inserted.requested_truck_id)
      .single();

    await sendEmailNotification(
      truck?.owner_email,
      `New direct food truck request: ${inserted.event_name}`,
      `Your truck received a direct request for ${inserted.event_name} on ${inserted.service_date} from ${inserted.start_time} to ${inserted.end_time}.`
    );
  }

  await writeAudit('request_created', 'truck_requests', inserted?.id ?? null, {
    business_id: payload.business_id,
    requested_truck_id: payload.requested_truck_id,
    blanket_request: payload.blanket_request,
    service_date: payload.service_date,
    start_time: payload.start_time,
    end_time: payload.end_time,
    event_name: payload.event_name
  });

  revalidatePath('/business/dashboard');
  revalidatePath('/truck/dashboard');
}

export async function acceptRequest(formData: FormData) {
  const { profile } = await requireRole(['truck_owner', 'admin']);
  const requestId = String(formData.get('request_id'));
  const supabase = await createClient();

  const { error } = await supabase.rpc('accept_truck_request', {
    p_request_id: requestId,
    p_truck_id: profile?.truck_id
  });
  if (error) throw new Error(error.message);

  const { data: requestRow } = await supabaseAdmin
    .from('truck_requests')
    .select('id, event_name, service_date, start_time, end_time, accepted_truck_id, business_id')
    .eq('id', requestId)
    .single();

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('contact_email, contact_name')
    .eq('id', requestRow?.business_id)
    .single();

  const { data: truck } = await supabaseAdmin
    .from('trucks')
    .select('display_name')
    .eq('id', requestRow?.accepted_truck_id)
    .single();

  await sendEmailNotification(
    business?.contact_email,
    `Food truck request accepted: ${requestRow?.event_name}`,
    `${truck?.display_name || 'A truck'} accepted your request for ${requestRow?.event_name} on ${requestRow?.service_date} from ${requestRow?.start_time} to ${requestRow?.end_time}.`
  );

  await writeAudit('request_accepted', 'truck_requests', requestId, {
    accepted_truck_id: profile?.truck_id,
    notified_business_email: business?.contact_email ?? null
  });

  revalidatePath('/truck/dashboard');
  revalidatePath('/business/dashboard');
  revalidatePath('/public-map');
}

export async function adminCreateBusiness(formData: FormData) {
  await requireRole(['admin']);
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const name = String(formData.get('name'));
  const contact_name = String(formData.get('contact_name'));

  const authUser = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { seed_role: 'business_owner' }
  });
  if (authUser.error || !authUser.data.user) {
    throw new Error(authUser.error?.message || 'Unable to create user');
  }

  const { data: business, error: businessError } = await supabaseAdmin
    .from('businesses')
    .insert({ name, contact_name, contact_email: email })
    .select('id')
    .single();

  if (businessError) throw new Error(businessError.message);

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: authUser.data.user.id,
    email,
    display_name: contact_name,
    role: 'business_owner',
    business_id: business.id
  });

  if (profileError) throw new Error(profileError.message);

  await sendEmailNotification(
    email,
    'Your food truck business account has been created',
    `Your business account for ${name} has been created. Use the temporary password provided by your administrator and change it after first login.`
  );

  await writeAudit('business_owner_created', 'businesses', business.id, {
    email,
    contact_name,
    business_name: name,
    user_id: authUser.data.user.id
  });

  revalidatePath('/admin/businesses');
  revalidatePath('/admin');
}

export async function adminCreateTruck(formData: FormData) {
  await requireRole(['admin']);
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const owner_name = String(formData.get('owner_name'));
  const display_name = String(formData.get('display_name'));

  const authUser = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { seed_role: 'truck_owner' }
  });
  if (authUser.error || !authUser.data.user) {
    throw new Error(authUser.error?.message || 'Unable to create user');
  }

  const { data: truck, error: truckError } = await supabaseAdmin
    .from('trucks')
    .insert({ display_name, owner_name, owner_email: email, active: true })
    .select('id')
    .single();

  if (truckError) throw new Error(truckError.message);

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: authUser.data.user.id,
    email,
    display_name: owner_name,
    role: 'truck_owner',
    truck_id: truck.id
  });

  if (profileError) throw new Error(profileError.message);

  await sendEmailNotification(
    email,
    'Your food truck owner account has been created',
    `Your truck owner account for ${display_name} has been created. Use the temporary password provided by your administrator and change it after first login.`
  );

  await writeAudit('truck_owner_created', 'trucks', truck.id, {
    email,
    owner_name,
    display_name,
    user_id: authUser.data.user.id
  });

  revalidatePath('/admin/trucks');
  revalidatePath('/admin');
}

export async function activateRelease(formData: FormData) {
  await requireRole(['admin']);
  const supabase = await createClient();
  const releaseId = String(formData.get('release_id'));
  const rollbackReason = String(formData.get('rollback_reason') || 'Activated from admin console');

  const { error } = await supabase.rpc('activate_change_control_version', {
    p_version_id: releaseId,
    p_reason: rollbackReason
  });
  if (error) throw new Error(error.message);

  await writeAudit('release_activated', 'change_control_versions', releaseId, {
    rollback_reason: rollbackReason
  });

  revalidatePath('/admin');
}
