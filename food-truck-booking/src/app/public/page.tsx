"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/browser";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("./publicMap"), { ssr: false });

type PublicBooking = {
  request_id: string;
  truck_name: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
};

export default function PublicPage() {
  const supabase = createClient();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [items, setItems] = useState<PublicBooking[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      const start = new Date(date + "T00:00:00");
      const end = new Date(date + "T23:59:59");
      const { data, error } = await supabase
        .from("public_bookings")
        .select("*")
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString())
        .order("start_time", { ascending: true });
      if (error) setErr(error.message);
      else setItems((data as any) || []);
    })();
  }, [date]);

  const center = useMemo(() => {
    const lat = parseFloat(process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT || "45.7833");
    const lng = parseFloat(process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG || "-108.5007");
    return [lat, lng] as [number, number];
  }, []);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Public map</h2>
      <div className="row" style={{ alignItems: "end" }}>
        <div style={{ minWidth: 220 }}>
          <div className="label">Select date</div>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <div className="small">Shows accepted bookings for the day.</div>
        </div>
      </div>

      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}

      <div style={{ height: 480, marginTop: 12, borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
        <Map center={center} items={items} />
      </div>

      <hr />
      <h3 style={{ marginTop: 0 }}>Schedule</h3>
      <table>
        <thead>
          <tr>
            <th>Truck</th>
            <th>Time</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.request_id}>
              <td>{i.truck_name}</td>
              <td>{new Date(i.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(i.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
              <td>{i.location_name}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={3} className="small">No bookings yet for this day.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
