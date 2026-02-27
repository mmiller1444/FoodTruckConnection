import Link from "next/link";
import { getUserAndRole, assertRole } from "../../../lib/auth";
import { createClient } from "../../../lib/supabase/server";

export default async function TruckRequestsPage() {
  const { role, user } = await getUserAndRole();
  if (!assertRole(role, ["truck_owner", "admin"])) return <Forbidden />;

  const supabase = createClient();
  const { data: myTruck } = await supabase.from("trucks").select("id, display_name").eq("owner_id", user!.id).single();

  const { data: all } = await supabase
    .from("truck_requests_inbox_all")
    .select("*")
    .eq("truck_id", myTruck?.id)
    .order("start_time", { ascending: true });

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>All requests</h2>
      <div className="small">Truck: <strong>{myTruck?.display_name || "Not set"}</strong></div>
      <hr />
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>When</th>
            <th>Location</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {(all || []).map((r: any) => (
            <tr key={r.request_id}>
              <td><span className="badge">{r.status}</span></td>
              <td>
                {new Date(r.start_time).toLocaleDateString()}{" "}
                {new Date(r.start_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} - {new Date(r.end_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
              </td>
              <td>{r.location_name}</td>
              <td className="small">{r.notes || ""}</td>
            </tr>
          ))}
          {(all || []).length === 0 && (
            <tr><td colSpan={4} className="small">No requests.</td></tr>
          )}
        </tbody>
      </table>
      <div className="row" style={{ marginTop: 12 }}>
        <Link className="btn" href="/truck/dashboard">Back</Link>
      </div>
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

