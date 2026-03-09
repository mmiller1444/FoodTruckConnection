import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function BusinessDashboard() {
  const { profile } = await requireRole(['business_owner', 'admin']);
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from('truck_requests')
    .select('id, event_name, service_date, start_time, end_time, status, blanket_request')
    .eq('business_id', profile?.business_id)
    .order('service_date', { ascending: false });

  return (
    <Shell title="Business Dashboard">
      <div className="card" style={{ marginBottom: 16 }}>
        <Link href="/business/requests/new">Create request</Link>
      </div>
      <section className="card">
        <h2>Your requests</h2>
        <table className="table">
          <thead><tr><th>Event</th><th>Date</th><th>Window</th><th>Status</th><th>Type</th></tr></thead>
          <tbody>
            {(requests || []).map((row) => (
              <tr key={row.id}>
                <td>{row.event_name}</td>
                <td>{row.service_date}</td>
                <td>{row.start_time} - {row.end_time}</td>
                <td>{row.status}</td>
                <td>{row.blanket_request ? 'Blanket' : 'Specific'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}
