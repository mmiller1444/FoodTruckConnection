import { Shell } from '@/components/Shell';
import { adminCreateTruck } from '@/lib/actions';
import { requireRole } from '@/lib/auth';

export default async function AdminTrucksPage() {
  await requireRole(['admin']);
  return (
    <Shell title="Create Truck Owner">
      <form action={adminCreateTruck} className="card grid" style={{ maxWidth: 720 }}>
        <label>Truck display name<input name="display_name" required /></label>
        <label>Owner name<input name="owner_name" required /></label>
        <label>Email<input type="email" name="email" required /></label>
        <label>Temporary password<input type="text" name="password" required /></label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Create truck owner</button>
      </form>
    </Shell>
  );
}
