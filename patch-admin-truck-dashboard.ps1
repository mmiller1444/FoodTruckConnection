$ErrorActionPreference = "Stop"

function Ensure-Dir($path) {
  if (!(Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

function Write-File($path, $content) {
  Ensure-Dir (Split-Path $path -Parent)
  $content | Set-Content -Path $path -Encoding UTF8
  Write-Host "Wrote $path"
}

Write-Host "== Patching truck dashboard for admin accept-as truck =="

# 1) Overwrite server dashboard to use client actions component
Write-File "src/app/truck/dashboard/page.tsx" @"
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
"@

# 2) Create client component for actions
Write-File "src/app/truck/dashboard/request-actions.tsx" @"
"use client";

import { useState } from "react";

type TruckOpt = { id: string; display_name: string | null };

export default function RequestActions(props: {
  role: "admin" | "truck_owner" | "business_owner" | null;
  initialTruckId: string | null;
  adminTrucks: TruckOpt[];
  initialRequests: any[];
}) {
  const { role, initialTruckId, adminTrucks, initialRequests } = props;

  const isAdmin = role === "admin";

  const [truckId, setTruckId] = useState<string>(initialTruckId || "");
  const [requests] = useState<any[]>(initialRequests || []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function accept(requestId: string) {
    setBusy(true);
    setErr("");
    try {
      const tid = isAdmin ? truckId : null;

      if (isAdmin && !tid) {
        setErr("Select a truck first.");
        return;
      }

      const resp = await fetch(`/api/requests/${requestId}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accept_as_truck_id: isAdmin ? (tid || null) : null }),
      });

      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setErr(j.error || `Failed (${resp.status})`);
        return;
      }

      // Reload to update pending list + notifications
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function ignore(requestId: string) {
    setBusy(true);
    setErr("");
    try {
      const resp = await fetch(`/truck/requests/${requestId}/ignore`, { method: "POST" });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        setErr(j.error || `Failed (${resp.status})`);
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {isAdmin && (
        <>
          <div className="label">Act as truck (admin)</div>
          <select className="input" value={truckId} onChange={(e) => setTruckId(e.target.value)}>
            <option value="">Select a truck…</option>
            {adminTrucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.display_name || t.id}
              </option>
            ))}
          </select>
          <p className="small">Admins must select which truck is accepting requests.</p>
          <hr />
        </>
      )}

      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}

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
                {new Date(r.start_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} -{" "}
                {new Date(r.end_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
              </td>
              <td>{r.location_name}</td>
              <td className="small">{r.notes || ""}</td>
              <td>
                <button className="btn primary" type="button" disabled={busy} onClick={() => accept(r.request_id)}>
                  Accept
                </button>{" "}
                <button className="btn" type="button" disabled={busy} onClick={() => ignore(r.request_id)}>
                  Ignore
                </button>
              </td>
            </tr>
          ))}
          {(requests || []).length === 0 && (
            <tr>
              <td colSpan={4} className="small">
                {isAdmin ? "Select a truck to accept requests as that truck." : "No pending requests."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
"@

Write-Host "`n== Done =="
Write-Host "Next:"
Write-Host "  npm run build"
Write-Host "  git add src/app/truck/dashboard/page.tsx src/app/truck/dashboard/request-actions.tsx"
Write-Host "  git commit -m `"Admin accept on truck dashboard`""
Write-Host "  git push"