import Link from "next/link";
import { getUserAndRole } from "../../lib/auth";
export const dynamic = "force-dynamic";
export default async function RoleGatePage() {
  const { role, user, fullName } = await getUserAndRole();
  if (!user) return null;

  if (!role) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Waiting for role assignment</h2>
        <p className="small">
          Hi{fullName ? `, ${fullName}` : ""}! An admin needs to assign your role (truck owner, business owner, or admin).
        </p>
        <p className="small">
          If you are the first user, go to Supabase Table Editor and set your role to <code>admin</code> in <code>profiles</code>.
        </p>
        <div className="row">
          <Link className="btn" href="/public">Public map</Link>
        </div>
      </div>
    );
  }

  if (role === "truck_owner") return <RedirectCard href="/truck/dashboard" label="Go to Truck Owner Dashboard" />;
  if (role === "business_owner") return <RedirectCard href="/business/dashboard" label="Go to Business Owner Dashboard" />;
  return <RedirectCard href="/admin" label="Go to Admin" />;
}

function RedirectCard({ href, label }: { href: string; label: string }) {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <Link className="btn primary" href={href}>{label}</Link>
    </div>
  );
}
