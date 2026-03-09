import { Shell } from '@/components/Shell';
import { adminCreateBusiness } from '@/lib/actions';
import { requireRole } from '@/lib/auth';

export default async function AdminBusinessesPage() {
  await requireRole(['admin']);
  return (
    <Shell title="Create Business Owner">
      <form action={adminCreateBusiness} className="card grid" style={{ maxWidth: 720 }}>
        <label>Business name<input name="name" required /></label>
        <label>Contact name<input name="contact_name" required /></label>
        <label>Email<input type="email" name="email" required /></label>
        <label>Temporary password<input type="text" name="password" required /></label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Create business owner</button>
      </form>
    </Shell>
  );
}
