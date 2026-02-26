import Link from "next/link";
import { getUserAndRole, assertRole } from "../../lib/auth";
import { createClient } from "../../lib/supabase/server";
import { dayRangeUtcIso, todayInTz } from "../../lib/time";

export default async function AdminPage({ searchParams }: { searchParams?: { day?: string } }) {
  const { role } = await getUserAndRole();
  if (!assertRole(role, ["admin"])) return <Forbidden />;

  const supabase = createClient();

  const day = searchParams?.day || todayInTz("America/Denver");
  const { startIso, endIso } = dayRangeUtcIso(day, "America/Denver");

  const { data: bookings } = await supabase
    .from("public_bookings")
    .select("*")
    .gte("start_time", startIso)
    .lt("start_time", endIso)
    .order("start_time", { ascending: true });

  const { data: releases } = await supabase.from("releases").select("*").order("created_at", { ascending: false });
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Admin</h2>

      <div className="row" style={{ justifyContent: "space-between", alignItems: "end", gap: 12 }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Scheduled food trucks</h3>
          <div className="small">Showing accepted bookings for <strong>{day}</strong> (America/Denver)</div>
        </div>

        <form method="get" className="row" style={{ gap: 8, alignItems: "end" }}>
          <div>
            <div className="label">Day</div>
            <input className="input" type="date" name="day" defaultValue={day} />
          </div>
          <button className="btn primary" type="submit">Filter</button>
        </form>
      </div>

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Truck</th>
            <th>Time</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {(bookings || []).map((b: any) => (
            <tr key={b.request_id}>
              <td>{b.truck_name}</td>
              <td>
                {new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </td>
              <td>{b.location_name}</td>
            </tr>
          ))}
          {(bookings || []).length === 0 && (
            <tr>
              <td colSpan={3} className="small">
                No accepted bookings for this day.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <hr />

      <h3>Change control (Releases)</h3>
      <p className="small">
        The app uses the active release from the database. To roll back, set a previous release as active.
      </p>

      <form action="/admin/releases/create" method="post" className="row">
        <input className="input" name="version" placeholder="Version (e.g., 1.0.1)" style={{ maxWidth: 220 }} required />
        <input className="input" name="notes" placeholder="Notes" style={{ flex: 1, minWidth: 240 }} />
        <button className="btn primary" type="submit">Create release</button>
      </form>

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Active</th>
            <th>Version</th>
            <th>Notes</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {(releases || []).map((r: any) => (
            <tr key={r.id}>
              <td>{r.is_active ? "✅" : ""}</td>
              <td><code>{r.version}</code></td>
              <td className="small">{r.notes || ""}</td>
              <td className="small">{new Date(r.created_at).toLocaleString()}</td>
              <td>
                {!r.is_active && (
                  <form action={`/admin/releases/${r.id}/activate`} method="post">
                    <button className="btn">Activate (Rollback)</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {(releases || []).length === 0 && (
            <tr><td colSpan={5} className="small">No releases yet. Create 1.0.0 as your baseline.</td></tr>
          )}
        </tbody>
      </table>

      <hr />

      <h3>User roles</h3>
      <p className="small">Assign roles after users sign up.</p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Set role</th>
          </tr>
        </thead>
        <tbody>
          {(profiles || []).map((p: any) => (
            <tr key={p.id}>
              <td>{p.full_name || ""}</td>
              <td className="small">{p.email}</td>
              <td><span className="badge">{p.role || "none"}</span></td>
              <td>
                <form action={`/admin/users/${p.id}/role`} method="post" className="row" style={{ alignItems: "center" }}>
                  <select className="input" name="role" defaultValue={p.role || ""} style={{ maxWidth: 220 }}>
                    <option value="">none</option>
                    <option value="business_owner">business_owner</option>
                    <option value="truck_owner">truck_owner</option>
                    <option value="admin">admin</option>
                  </select>
                  <button className="btn" type="submit">Save</button>
                </form>
              </td>
            </tr>
          ))}
          {(profiles || []).length === 0 && (
            <tr><td colSpan={4} className="small">No users yet.</td></tr>
          )}
        </tbody>
      </table>

      <div className="row" style={{ marginTop: 12 }}>
        <Link className="btn" href="/role-gate">Back</Link>
      </div>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Not allowed</h2>
      <p className="small">Your account role does not have access to this page.</p>
      <Link className="btn" href="/">Back</Link>
    </div>
  );
}
