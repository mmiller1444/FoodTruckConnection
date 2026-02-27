export const dynamic = "force-dynamic";

import Link from "next/link";
import { getUserAndRole } from "../../lib/auth";

export default async function RoleGatePage() {
  const { role, user, fullName, email, profileExists, profileError } = await getUserAndRole();

  if (!user) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Not signed in</h2>
        <p className="small">No session found on the server.</p>
        <div className="row">
          <Link className="btn primary" href="/login">Go to Login</Link>
          <Link className="btn" href="/public">Public map</Link>
        </div>
      </div>
    );
  }

  // TEMP DEBUG (remove later)
  // This will tell us instantly what the server thinks your role is.
  const debug = `email=${email ?? user.email ?? ""} role=${role ?? "null"} profileExists=${String(profileExists)} err=${profileError ?? ""}`;

  if (!profileExists) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Profile missing</h2>
        <p className="small">{debug}</p>
        <p className="small">
          You are signed in but there is no matching row in <code>public.profiles</code>.
        </p>
        <div className="row">
          <Link className="btn" href="/public">Public map</Link>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Waiting for role assignment</h2>
        <p className="small">{debug}</p>
        <p className="small">
          Hi{fullName ? `, ${fullName}` : ""}! An admin needs to assign your role (truck owner, business owner, or admin).
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
      <Link className="btn primary" href={href}>
        {label}
      </Link>
    </div>
  );
}