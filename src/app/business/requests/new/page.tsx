"use client";

import { useState } from "react";

export default function NewRequestPage() {
  const [specific, setSpecific] = useState(true);
  const [requestedTruckId, setRequestedTruckId] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState<string>("");
  const [locationLng, setLocationLng] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");

    const payload = {
      blanket_request: !specific,
      requested_truck_id: specific ? (requestedTruckId || null) : null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      location_name: locationName,
      location_lat: locationLat ? Number(locationLat) : null,
      location_lng: locationLng ? Number(locationLng) : null,
      notes: notes || null,
    };

    const resp = await fetch("/api/requests/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      setErr(j.error || "Failed to submit request");
      return;
    }

    setOk("Request submitted!");
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Request a food truck</h2>

      <form onSubmit={onSubmit}>
        <div className="label">Request type</div>
        <label className="small">
          <input type="checkbox" checked={specific} onChange={(e) => setSpecific(e.target.checked)} />{" "}
          Request a specific truck (uncheck for blanket request)
        </label>

        {specific && (
          <>
            <div className="label">Requested Truck ID</div>
            <input
              className="input"
              value={requestedTruckId}
              onChange={(e) => setRequestedTruckId(e.target.value)}
              placeholder="UUID of the truck (or wire up a dropdown)"
            />
          </>
        )}

        <div className="label">Start</div>
        <input className="input" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />

        <div className="label">End</div>
        <input className="input" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />

        <div className="label">Location name</div>
        <input className="input" value={locationName} onChange={(e) => setLocationName(e.target.value)} required />

        <div className="row">
          <div style={{ flex: 1 }}>
            <div className="label">Lat (optional)</div>
            <input className="input" value={locationLat} onChange={(e) => setLocationLat(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">Lng (optional)</div>
            <input className="input" value={locationLng} onChange={(e) => setLocationLng(e.target.value)} />
          </div>
        </div>

        <div className="label">Notes</div>
        <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />

        {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
        {ok && <p style={{ color: "var(--success)" }}>{ok}</p>}

        <button className="btn primary" type="submit">
          Submit request
        </button>
      </form>
    </div>
  );
}