import Link from "next/link";
import { getUserAndRole, assertRole } from "../../../lib/auth";
import { createClient } from "../../../lib/supabase/server";

export default async function BusinessDashboard() {
  const { role, user } = await getUserAndRole();
  if (!assertRole(role, ["business_owner", "admin"])) return <Forbidden />;

  const supabase = createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, created_at, message")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(25);

  const { data: requests } = await supabase
    .from("truck_requests")
    .select("id, created_at, start_time, end_time, location_name, status, blanket_request")
    .eq("business_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>Business Owner</h2>
        <Link className="btn primary" href="/business/requests/new">Request a food truck</Link>
      </div>

      <h3>Notifications</h3>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {(notifications || []).map((n: any) => (
            <tr key={n.id}>
              <td className="small">{new Date(n.created_at).toLocaleString()}</td>
              <td>{n.message}</td>
            </tr>
          ))}
          {(notifications || []).length === 0 && (
            <tr><td colSpan={2} className="small">No notifications yet.</td></tr>
          )}
        </tbody>
      </table>

      <hr />

      <h3 style={{ marginTop: 0 }}>Your requests</h3>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Date</th>
            <th>Time</th>
            <th>Location</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {(requests || []).map((r: any) => (
            <tr key={r.id}>
              <td><span className="badge">{r.status}</span></td>
              <td>{new Date(r.start_time).toLocaleDateString()}</td>
              <td>{new Date(r.start_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} - {new Date(r.end_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</td>
              <td>{r.location_name}</td>
              <td>{r.blanket_request ? "Blanket" : "Specific"}</td>
            </tr>
          ))}
          {(requests || []).length === 0 && (
            <tr><td colSpan={5} className="small">No requests yet.</td></tr>
          )}
        </tbody>
      </table>
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
