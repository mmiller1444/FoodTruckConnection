import Link from "next/link";
import { getUserAndRole } from "../../lib/auth";

export default async function RoleGatePage() {
  const { role, user, fullName, email, profileExists } = await getUserAndRole();

  if (!user) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Not signed in</h2>
        <p className="small">
          Your session was not found. This can happen if cookies aren&apos;t persisting or the auth redirect URL is mismatched.
        </p>
        <div className="row">
          <Link className="btn primary" href="/login">Go to Login</Link>
          <Link className="btn" href="/public">Public map</Link>
        </div>
      </div>
    );
  }

  if (!profileExists) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Profile missing</h2>
        <p className="small">
          You are signed in as <code>{email || user.id}</code>, but there is no matching row in <code>public.profiles</code>.
        </p>
        <p className="small">
          Fix: add the signup trigger to auto-create profiles (recommended), or manually insert a row where <code>id</code> ={" "}
          <code>{user.id}</code>.
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
        <p className="small">
          Hi{fullName ? `, ${fullName}` : ""}! An admin needs to assign your role (truck owner, business owner, or admin).
        </p>
        <p className="small">
          If you are the first user, set your role to <code>admin</code> in <code>profiles</code>.
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