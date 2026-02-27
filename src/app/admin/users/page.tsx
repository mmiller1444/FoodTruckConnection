import Link from "next/link";
import { getUserAndRole, assertRole } from "../../../lib/auth";
import { createClient } from "../../../lib/supabase/server";

export default async function AdminUsersPage() {
  const { role } = await getUserAndRole();
  if (!assertRole(role, ["admin"])) return <Forbidden />;

  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>Admin → Users</h2>
        <Link className="btn" href="/admin">Back to Admin</Link>
      </div>

      <p className="small">
        Assign roles after users sign up. Roles unlock dashboards:
        <code> business_owner</code>, <code>truck_owner</code>, <code>admin</code>.
      </p>

      <table>
        <thead>
          <tr>
            <th>Created</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Set role</th>
          </tr>
        </thead>
        <tbody>
          {(profiles || []).map((p: any) => (
            <tr key={p.id}>
              <td className="small">{p.created_at ? new Date(p.created_at).toLocaleString() : ""}</td>
              <td>{p.full_name || ""}</td>
              <td className="small">{p.email || ""}</td>
              <td>
                <span className="badge">{p.role || "none"}</span>
              </td>
              <td>
                <form action={`/admin/users/${p.id}/role`} method="post" className="row" style={{ alignItems: "center" }}>
                  <select className="input" name="role" defaultValue={p.role || ""} style={{ maxWidth: 220 }}>
                    <option value="">none</option>
                    <option value="business_owner">business_owner</option>
                    <option value="truck_owner">truck_owner</option>
                    <option value="admin">admin</option>
                  </select>
                  <button className="btn" type="submit">
                    Save
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {(profiles || []).length === 0 && (
            <tr>
              <td colSpan={5} className="small">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <hr />

      <h3>First-user admin safeguard</h3>
      <p className="small">
        Recommended: set the first signup as <code>admin</code> automatically using the trigger SQL in{" "}
        <code>docs/first-user-admin.sql</code>.
      </p>
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
