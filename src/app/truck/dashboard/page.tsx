import Link from "next/link";
import { getUserAndRole, assertRole } from "../../../lib/auth";
import { createClient } from "../../../lib/supabase/server";

export default async function TruckDashboard() {
  const { role, user } = await getUserAndRole();
  if (!assertRole(role, ["truck_owner"])) return <Forbidden />;

  const supabase = createClient();

  const { data: myTruck } = await supabase.from("trucks").select("id, display_name").eq("owner_id", user!.id).single();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, created_at, message")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(25);

  const { data: requests } = await supabase
    .from("truck_requests_inbox")
    .select("*")
    .eq("truck_id", myTruck?.id)
    .order("start_time", { ascending: true });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Food Truck</h2>
          <div className="small">Truck: <strong>{myTruck?.display_name || "Not set"}</strong></div>
        </div>
        <Link className="btn" href="/truck/requests">View all requests</Link>
      </div>

      <hr />

      <h3 style={{ marginTop: 0 }}>Notifications</h3>
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

      <h3 style={{ marginTop: 0 }}>Pending requests</h3>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Location</th>
            <th>Notes</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {(requests || []).map((r: any) => (
            <tr key={r.request_id}>
              <td>
                {new Date(r.start_time).toLocaleDateString()}{" "}
                {new Date(r.start_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} - {new Date(r.end_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
              </td>
              <td>{r.location_name}</td>
              <td className="small">{r.notes || ""}</td>
              <td>
                <form action={`/truck/requests/${r.request_id}/accept`} method="post" style={{ display: "inline" }}>
                  <button className="btn primary" type="submit">Accept</button>
                </form>{" "}
                <form action={`/truck/requests/${r.request_id}/ignore`} method="post" style={{ display: "inline" }}>
                  <button className="btn" type="submit">Ignore</button>
                </form>
              </td>
            </tr>
          ))}
          {(requests || []).length === 0 && (
            <tr><td colSpan={4} className="small">No pending requests.</td></tr>
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
