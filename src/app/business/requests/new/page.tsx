"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabase/browser";

type Truck = { id: string; display_name: string };

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export default function NewRequestPage() {
  const supabase = createClient();

  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [specific, setSpecific] = useState(false);
  const [requestedTruckId, setRequestedTruckId] = useState<string>("");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [start, setStart] = useState("11:00");
  const [end, setEnd] = useState("14:00");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const maxDate = useMemo(() => addMonths(new Date(), 3).toISOString().slice(0,10), []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("trucks")
        .select("id, display_name")
        .eq("is_active", true)
        .order("display_name");
      setTrucks((data as any) || []);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk("");

    if (date > maxDate) {
      setErr("Requests are limited to up to 3 months in advance.");
      return;
    }

    const startTime = new Date(`${date}T${start}:00`);
    const endTime = new Date(`${date}T${end}:00`);
    if (endTime <= startTime) {
      setErr("End time must be after start time.");
      return;
    }

    const payload: any = {
      requested_truck_id: specific ? (requestedTruckId || null) : null,
      blanket_request: !specific,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      location_name: locationName,
      location_lat: lat ? Number(lat) : null,
      location_lng: lng ? Number(lng) : null,
      notes: notes || null,
    };

    const resp = await fetch('/api/requests/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, blanket_request: !specific }) });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) setErr(j.error || 'Failed to submit');
    else setOk('Request submitted!');
  }

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>New request</h2>
      <p className="small">Up to 3 months out. Provide lat/lng to show on public map.</p>
      <form onSubmit={submit}>
        <div className="row">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={specific} onChange={e => setSpecific(e.target.checked)} />
            Request specific truck
          </label>
        </div>

        {specific && (
          <>
            <div className="label">Truck</div>
            <select className="input" value={requestedTruckId} onChange={e => setRequestedTruckId(e.target.value)} required>
              <option value="">Select truck</option>
              {trucks.map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}
            </select>
          </>
        )}

        <div className="row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="label">Date</div>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().slice(0,10)} max={maxDate} required />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="label">Start</div>
            <input className="input" type="time" value={start} onChange={e => setStart(e.target.value)} required />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="label">End</div>
            <input className="input" type="time" value={end} onChange={e => setEnd(e.target.value)} required />
          </div>
        </div>

        <div className="label">Location name</div>
        <input className="input" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g., Downtown Plaza" required />

        <div className="row">
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="label">Latitude (optional)</div>
            <input className="input" value={lat} onChange={e => setLat(e.target.value)} placeholder="45.7833" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="label">Longitude (optional)</div>
            <input className="input" value={lng} onChange={e => setLng(e.target.value)} placeholder="-108.5007" />
          </div>
        </div>

        <div className="label">Notes (optional)</div>
        <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />

        {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
        {ok && <p style={{ color: "var(--accent)" }}>{ok}</p>}

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" type="submit">Submit request</button>
          <a className="btn" href="/business/dashboard">Back</a>
        </div>
      </form>
    </div>
  );
}
