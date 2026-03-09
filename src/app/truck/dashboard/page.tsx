import { Shell } from '@/components/Shell';
import { acceptRequest } from '@/lib/actions';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function TruckDashboard() {
  const { profile } = await requireRole(['truck_owner', 'admin']);
  const supabase = await createClient();

  const { data: requests } = await supabase.rpc('get_open_requests_for_truck', { p_truck_id: profile?.truck_id });
  const { data: notifications } = await supabase
    .from('truck_notifications')
    .select('id, message, created_at, is_read, delivery_channel, email_sent_at')
    .eq('truck_id', profile?.truck_id)
    .order('created_at', { ascending: false })
    .limit(10);
  const { data: scheduled } = await supabase
    .from('truck_locations')
    .select('id, service_date, start_time, end_time, address')
    .eq('truck_id', profile?.truck_id)
    .order('service_date', { ascending: true })
    .limit(20);

  return (
    <Shell title="Truck Owner Dashboard">
      <div className="grid-2">
        <section className="card">
          <h2>Open requests</h2>
          <div className="grid">
            {(requests || []).map((item: any) => (
              <article key={item.id} className="card">
                <strong>{item.event_name}</strong>
                <div>{item.service_date} | {item.start_time} - {item.end_time}</div>
                <div>{item.event_address}</div>
                <div>{item.notes}</div>
                {item.has_conflict ? (
                  <p className="text-red-700">Schedule conflict detected with an existing accepted booking.</p>
                ) : (
                  <form action={acceptRequest} style={{ marginTop: 12 }}>
                    <input type="hidden" name="request_id" value={item.id} />
                    <button className="rounded bg-emerald-700 px-4 py-2 text-white">Accept request</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </section>
        <section className="card">
          <h2>Notifications</h2>
          <ul>
            {(notifications || []).map((n) => (
              <li key={n.id}>
                {n.message} <small>({n.delivery_channel}{n.email_sent_at ? ', email sent' : ''})</small>
              </li>
            ))}
          </ul>
          <h2 style={{ marginTop: 20 }}>Upcoming schedule</h2>
          <ul>
            {(scheduled || []).map((slot) => (
              <li key={slot.id}>{slot.service_date} {slot.start_time} - {slot.end_time} | {slot.address}</li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
