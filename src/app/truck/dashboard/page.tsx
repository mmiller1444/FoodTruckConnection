import Link from "next/link";
import { getUserAndRole, assertRole } from "../../../lib/auth";
import { createClient } from "../../../lib/supabase/server";
import RequestActions from "./request-actions";

export const dynamic = "force-dynamic";

export default async function TruckDashboard() {
  const { role, user } = await getUserAndRole();
  if (!assertRole(role, ["truck_owner", "admin"])) return <Forbidden />;

  const supabase = createClient();

  // truck_owner: their own truck
  const { data: myTruck } = await supabase
    .from("trucks")
    .select("id, display_name")
    .eq("owner_id", user!.id)
    .maybeSingle();

  // admin: list all trucks for "act as"
  const adminTruckOptions =
    role === "admin"
      ? (
          await supabase
            .from("trucks")
            .select("id, display_name")
            .order("created_at", { ascending: false })
            .limit(500)
        ).data || []
      : [];

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, created_at, message")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(25);

  // Which inbox to show on initial render:
  const initialTruckId = role === "truck_owner" ? myTruck?.id ?? null : null;

  const { data: requests } = initialTruckId
    ? await supabase
        .from("truck_requests_inbox")
        .select("*")
        .eq("truck_id", initialTruckId)
        .order("start_time", { ascending: true })
    : { data: [] as any[] };

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Food Truck</h2>
          <div className="small">
            Truck: <strong>{myTruck?.display_name || (role === "admin" ? "Admin (select below)" : "Not set")}</strong>
          </div>
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

      <RequestActions
        role={role}
        initialTruckId={initialTruckId}
        adminTrucks={adminTruckOptions}
        initialRequests={requests || []}
      />
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
