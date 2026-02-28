"use client";

import { useMemo, useState } from "react";

type TruckOpt = { id: string; display_name: string | null };

type Role = "admin" | "truck_owner" | "business_owner" | null;

type RequestRow = {
  request_id: string;
  start_time: string; // ISO
  end_time: string; // ISO
  location_name: string | null;
  notes: string | null;
};

export default function RequestActions(props: {
  role: Role;
  initialTruckId: string | null;
  adminTrucks: TruckOpt[];
  initialRequests: RequestRow[];
}) {
  const { role, initialTruckId, adminTrucks, initialRequests } = props;

  const isAdmin = role === "admin";

  const [truckId, setTruckId] = useState<string>(initialTruckId ?? "");
  const [requests] = useState<RequestRow[]>(initialRequests ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const canAct = useMemo(() => {
    if (busy) return false;
    if (isAdmin) return Boolean(truckId);
    return role === "truck_owner";
  }, [busy, isAdmin, truckId, role]);

  async function postJson<TResp = any>(url: string, body?: unknown): Promise<{ ok: boolean; status: number; json: TResp }> {
    const resp = await fetch(url, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await resp.json().catch(() => ({}))) as TResp;
    return { ok: resp.ok, status: resp.status, json };
  }

  async function accept(requestId: string) {
    setBusy(true);
    setErr("");
    try {
      const tid = isAdmin ? truckId : null;

      if (isAdmin && !tid) {
        setErr("Select a truck first.");
        return;
      }

      const url = `/api/requests/${encodeURIComponent(requestId)}/accept`;
      const { ok, json } = await postJson<{ error?: string }>(url, {
        accept_as_truck_id: isAdmin ? (tid ?? null) : null,
      });

      if (!ok) {
        setErr(json?.error || "Failed to accept request.");
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
      const url = `/api/requests/${encodeURIComponent(requestId)}/ignore`;
      const { ok, json } = await postJson<{ error?: string }>(url);

      if (!ok) {
        setErr(json?.error || "Failed to ignore request.");
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
          <select className="input" value={truckId} onChange={(e) => setTruckId(e.target.value)} disabled={busy}>
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
          {(requests || []).map((r) => (
            <tr key={r.request_id}>
              <td>
                {new Date(r.start_time).toLocaleDateString()}{" "}
                {new Date(r.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                {new Date(r.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </td>
              <td>{r.location_name ?? ""}</td>
              <td className="small">{r.notes ?? ""}</td>
              <td>
                <button
                  className="btn primary"
                  type="button"
                  disabled={!canAct}
                  onClick={() => accept(r.request_id)}
                  title={isAdmin && !truckId ? "Select a truck first" : undefined}
                >
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
                {isAdmin ? "No pending requests (admins must select a truck to accept as that truck)." : "No pending requests."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}