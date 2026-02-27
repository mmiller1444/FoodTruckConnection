"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "../../../../lib/supabase/browser";

type Truck = { id: string; display_name: string };
type Suggestion = { display_name: string; lat: string; lon: string };

const LocationMap = dynamic(() => import("./locationMap"), { ssr: false });

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export default function NewRequestPage() {
  const supabase = createClient();

  const [specific, setSpecific] = useState(true);
  const [requestedTruckId, setRequestedTruckId] = useState("");
  const [trucks, setTrucks] = useState<Truck[]>([]);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Address-based location
  const [address, setAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<Suggestion[]>([]);
  const [addressOpen, setAddressOpen] = useState(false);

  // Stored to DB (derived from chosen address)
  const [locationName, setLocationName] = useState(""); // display_name
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  const [notes, setNotes] = useState("");

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const maxDate = useMemo(() => addMonths(new Date(), 3).toISOString().slice(0, 16), []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("trucks").select("id, display_name").order("display_name");
      setTrucks((data as Truck[]) || []);
    })();
  }, [supabase]);

  // Debounced geocode for live suggestions
  useEffect(() => {
    const q = address.trim();
    if (q.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const j = await resp.json();
        setAddressSuggestions((j?.results || []) as Suggestion[]);
      } catch {
        setAddressSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [address]);

  function chooseSuggestion(s: Suggestion) {
    setLocationName(s.display_name);
    setAddress(s.display_name);
    setLat(s.lat);
    setLng(s.lon);
    setAddressOpen(false);
    setAddressSuggestions([]);
  }

  async function submitRequest() {
    setErr("");
    setOk("");
    setBusy(true);

    try {
      if (!startTime || !endTime) {
        setErr("Start and end time are required.");
        return;
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (!(start instanceof Date) || isNaN(start.getTime())) {
        setErr("Start time is invalid.");
        return;
      }
      if (!(end instanceof Date) || isNaN(end.getTime())) {
        setErr("End time is invalid.");
        return;
      }
      if (end <= start) {
        setErr("End time must be after start time.");
        return;
      }

      // Must choose a geocoded address so we can show it on the map
      if (!locationName || !lat || !lng) {
        setErr("Please select a valid address from the suggestions so we can pin it on the map.");
        return;
      }

      const payload = {
        blanket_request: !specific,
        requested_truck_id: specific ? (requestedTruckId || null) : null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location_name: locationName,
        location_lat: Number(lat),
        location_lng: Number(lng),
        notes: notes || null,
      };

      const resp = await fetch("/api/requests/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErr(j.error || `Failed (${resp.status})`);
        return;
      }

      setOk(`Request submitted! id=${j.id}`);
    } catch (e: any) {
      setErr(e?.message || "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  const mapLat = lat ? Number(lat) : null;
  const mapLng = lng ? Number(lng) : null;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Request a food truck</h2>
      <p className="small">Tip: Requests can be made up to 3 months out.</p>

      <div className="label">Request type</div>
      <label className="small">
        <input type="checkbox" checked={specific} onChange={(e) => setSpecific(e.target.checked)} /> Request a specific
        truck (uncheck for blanket request)
      </label>

      {specific && (
        <>
          <div className="label">Select truck</div>
          <select className="input" value={requestedTruckId} onChange={(e) => setRequestedTruckId(e.target.value)}>
            <option value="">-- choose a truck --</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.display_name}
              </option>
            ))}
          </select>
          <p className="small">If you don&apos;t know which truck, uncheck the box above to send a blanket request.</p>
        </>
      )}

      <div className="row">
        <div style={{ flex: 1 }}>
          <div className="label">Start</div>
          <input
            className="input"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            max={maxDate}
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label">End</div>
          <input
            className="input"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            max={maxDate}
            required
          />
        </div>
      </div>

      <div className="label">Address</div>
      <div style={{ position: "relative" }}>
        <input
          className="input"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setAddressOpen(true);
            // clear derived coords until they pick a new suggestion
            setLocationName("");
            setLat("");
            setLng("");
          }}
          onFocus={() => setAddressOpen(true)}
          placeholder="Type an address (e.g., 123 Main St, Billings MT)"
          required
        />

        {addressOpen && addressSuggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              zIndex: 20,
              left: 0,
              right: 0,
              top: "100%",
              background: "rgba(20,20,20,0.98)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              marginTop: 6,
              overflow: "hidden",
            }}
          >
            {addressSuggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                className="btn"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 0,
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
                onClick={() => chooseSuggestion(s)}
              >
                <span className="small">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {mapLat !== null && mapLng !== null && (
        <>
          <div className="label" style={{ marginTop: 12 }}>
            Location preview
          </div>
          <LocationMap lat={mapLat} lng={mapLng} label={locationName || address} />
          <p className="small">We&apos;ll use this pin on the public map for the scheduled day/time.</p>
        </>
      )}

      <div className="label">Notes</div>
      <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />

      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      {ok && <p style={{ color: "var(--success)" }}>{ok}</p>}

      <button className="btn primary" type="button" onClick={submitRequest} disabled={busy}>
        {busy ? "Submitting..." : "Submit request"}
      </button>
    </div>
  );
}
