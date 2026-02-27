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

      const resp = await fetch(/api/requests//accept, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accept_as_truck_id: isAdmin ? (tid || null) : null }),
      });

      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setErr(j.error || Failed ());
        return;
      }

      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function ignore(requestId: string) {
    setBusy(true);
    setErr("");
    try {
      const resp = await fetch(/truck/requests//ignore, { method: "POST" });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        setErr(j.error || Failed ());
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
                {new Date(r.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                {new Date(r.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
