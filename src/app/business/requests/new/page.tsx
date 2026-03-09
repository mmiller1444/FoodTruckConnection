import { addDays, format } from 'date-fns';
import { Shell } from '@/components/Shell';
import { createBusinessRequest } from '@/lib/actions';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function NewRequestPage() {
  await requireRole(['business_owner', 'admin']);
  const supabase = await createClient();
  const { data: trucks } = await supabase.from('trucks').select('id, display_name').eq('active', true).order('display_name');
  const maxDate = format(addDays(new Date(), 92), 'yyyy-MM-dd');

  return (
    <Shell title="New Food Truck Request">
      <form action={createBusinessRequest} className="card grid" style={{ maxWidth: 760 }}>
        <label>Event name<input name="event_name" required /></label>
        <label>Event address<input name="event_address" required /></label>
        <div className="grid-2">
          <label>Service date<input name="service_date" type="date" max={maxDate} required /></label>
          <label>Start time<input name="start_time" type="time" required /></label>
          <label>End time<input name="end_time" type="time" required /></label>
          <label>Request type
            <select name="blanket_request" defaultValue="true">
              <option value="true">Blanket request</option>
              <option value="false">Specific truck</option>
            </select>
          </label>
        </div>
        <label>Specific truck (optional)
          <select name="requested_truck_id" defaultValue="">
            <option value="">No specific truck</option>
            {(trucks || []).map((truck) => <option key={truck.id} value={truck.id}>{truck.display_name}</option>)}
          </select>
        </label>
        <label>Notes<textarea name="notes" rows={5} /></label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Submit request</button>
      </form>
    </Shell>
  );
}
