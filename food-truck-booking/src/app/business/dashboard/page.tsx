import Link from "next/link";
import { getUserAndRole, assertRole } from "../../../lib/auth";
import { createClient } from "../../../lib/supabase/server";

export default async function BusinessDashboard() {
  const { role, user } = await getUserAndRole();
  if (!assertRole(role, ["business_owner"])) return <Forbidden />;

  const supabase = createClient();
  const { data: requests } = await supabase
    .from("truck_requests")
    .select("id, created_at, start_time, end_time, location_name, status, blanket_request, accepted_truck_id, requested_truck_id")
    .eq("business_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>Business dashboard</h2>
        <Link className="btn primary" href="/business/requests/new">New request</Link>
      </div>
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
      <Link className="btn" href="/role-gate">Back</Link>
    </div>
  );
}
