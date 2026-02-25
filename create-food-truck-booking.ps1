$ErrorActionPreference = 'Stop'
$root = Join-Path (Get-Location) 'food-truck-booking'
if (Test-Path $root) { throw "Folder already exists: $root" }
New-Item -ItemType Directory -Path $root | Out-Null

function Write-TextFile($path, $content) {
  $full = Join-Path $root $path
  $dir = Split-Path $full -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [IO.File]::WriteAllText($full, $content, [Text.UTF8Encoding]::new($false))
}

Write-TextFile 'README.md' @'
# Food Truck Booking (Next.js + Vercel + Supabase)

A multi-role booking app:
- Business owners request a food truck for a date/time (up to 3 months out).
- Food truck owners get notifications and can accept or ignore.
- Businesses can request a specific truck or send a blanket request.
- Admins manage releases (change control) and can roll back by switching the active release.
- Public view shows a map of booked trucks for a selected day including times.

## Tech
- Next.js (App Router) for Vercel
- Supabase Auth + Postgres + RLS
- React Leaflet map (OpenStreetMap tiles)

## Quick start
1. Create a Supabase project and get:
   - Project URL
   - anon key
   - service role key (server-only)

2. Apply the SQL migration in `supabase/migrations/001_init.sql` in Supabase SQL Editor.

3. Copy env example:
   - `cp .env.local.example .env.local`

4. Install and run:
   - `npm i`
   - `npm run dev`

## Roles
Roles are stored in `public.profiles.role`:
- `truck_owner`
- `business_owner`
- `admin`

After signup, an admin can assign roles in the Admin page.

## Change control / rollback
The app reads the active release from the `public.releases` table.
Admins can switch the active release (rollback) without redeploying.

See `docs/Setup-and-Deploy.pdf` for step-by-step instructions.

'@

Write-TextFile '.env.local.example' @'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Server-only (DO NOT expose to browser)
SUPABASE_SERVICE_ROLE_KEY=

# Map
# Optional. If you want to use a different tiles provider, configure here.
NEXT_PUBLIC_MAP_DEFAULT_LAT=45.7833
NEXT_PUBLIC_MAP_DEFAULT_LNG=-108.5007
NEXT_PUBLIC_MAP_DEFAULT_ZOOM=12

'@

Write-TextFile 'package.json' @'
{
  "name": "food-truck-booking",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.49.1",
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.12",
    "@types/node": "^20.11.30",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.5",
    "typescript": "^5.4.5"
  }
}
'@

Write-TextFile 'next.config.js' @'
/** @type {import(''next'').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // safer for server actions usage in some environments
    serverActions: { allowedOrigins: ["*"] }
  }
};
export default nextConfig;

'@

Write-TextFile 'tsconfig.json' @'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}

'@

Write-TextFile 'src/middleware.ts' @'
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // Public routes
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/signout");

  if (!user && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

'@

Write-TextFile 'src/app/globals.css' @'
:root {
  --bg: #0b0e14;
  --card: #121826;
  --text: #e6e8ef;
  --muted: #a5b0c5;
  --accent: #53d3c0;
  --danger: #ff6b6b;
  --border: rgba(255,255,255,0.10);
}

* { box-sizing: border-box; }
html, body { padding: 0; margin: 0; background: var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; }
a { color: var(--accent); text-decoration: none; }
.container { max-width: 1100px; margin: 0 auto; padding: 24px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; }
.row { display: flex; gap: 12px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); background: rgba(255,255,255,0.05); color: var(--text); cursor: pointer; }
.btn:hover { border-color: rgba(255,255,255,0.22); }
.btn.primary { background: rgba(83,211,192,0.12); border-color: rgba(83,211,192,0.35); }
.btn.danger { background: rgba(255,107,107,0.10); border-color: rgba(255,107,107,0.35); }
.input, select, textarea { width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: rgba(255,255,255,0.04); color: var(--text); outline: none; }
.label { font-size: 12px; color: var(--muted); margin: 8px 0 6px; }
hr { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
.small { font-size: 12px; color: var(--muted); }
.badge { padding: 4px 8px; border-radius: 999px; font-size: 12px; border: 1px solid var(--border); color: var(--muted); }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid var(--border); padding: 10px; text-align: left; font-size: 14px; }
th { color: var(--muted); font-weight: 600; }

'@

Write-TextFile 'src/app/layout.tsx' @'
import "./globals.css";
import Link from "next/link";
import { createClient } from "../lib/supabase/server";
import { getUserAndRole } from "../lib/auth";

export const metadata = {
  title: "Food Truck Booking",
  description: "Request and schedule food trucks.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { role } = await getUserAndRole();

  return (
    <html lang="en">
      <body>
        <div className="container">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="row" style={{ alignItems: "center" }}>
              <Link href="/" className="btn primary">Food Truck Booking</Link>
              <Link href="/public" className="btn">Public Map</Link>
              {user && <Link href="/role-gate" className="btn">Dashboard</Link>}
              {role === "admin" && <Link href="/admin" className="btn">Admin</Link>}
            </div>
            <div className="row" style={{ alignItems: "center" }}>
              {user ? (
                <Link href="/signout" className="btn">Sign out</Link>
              ) : (
                <>
                  <Link href="/login" className="btn">Login</Link>
                  <Link href="/signup" className="btn primary">Sign up</Link>
                </>
              )}
            </div>
          </div>
          <hr />
          {children}
          <div className="small" style={{ marginTop: 30, opacity: 0.8 }}>
            Tip: Admins can roll back by switching the active release in the Admin page.
          </div>
        </div>
      </body>
    </html>
  );
}

'@

Write-TextFile 'src/app/page.tsx' @'
import Link from "next/link";

export default function Home() {
  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Food Truck Booking</h1>
      <p className="small">
        Business owners can request a truck for a date and time (up to 3 months out). Truck owners can accept or ignore. The public can view booked trucks on a map for any day.
      </p>
      <div className="row">
        <Link className="btn primary" href="/signup">Get started</Link>
        <Link className="btn" href="/public">View today&apos;s map</Link>
      </div>
    </div>
  );
}

'@

Write-TextFile 'src/app/login/page.tsx' @'
"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/browser";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/role-gate";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    else router.push(next);
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      <form onSubmit={onSubmit}>
        <div className="label">Email</div>
        <input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        <div className="label">Password</div>
        <input className="input" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" type="submit">Login</button>
        </div>
      </form>
      <p className="small">No account? <a href="/signup">Sign up</a></p>
    </div>
  );
}

'@

Write-TextFile 'src/app/signup/page.tsx' @'
"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) return setErr(error.message);

    // Profile row is created by DB trigger in migration.
    // Role is null until an admin assigns one.
    router.push("/role-gate");
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>Sign up</h2>
      <form onSubmit={onSubmit}>
        <div className="label">Full name</div>
        <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} required />
        <div className="label">Email</div>
        <input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        <div className="label">Password</div>
        <input className="input" value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={8} />
        {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" type="submit">Create account</button>
        </div>
      </form>
      <p className="small">Already have an account? <a href="/login">Login</a></p>
    </div>
  );
}

'@

Write-TextFile 'src/app/signout/route.ts' @'
import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}

'@

Write-TextFile 'src/app/role-gate/page.tsx' @'
import Link from "next/link";
import { getUserAndRole } from "../../lib/auth";

export default async function RoleGatePage() {
  const { role, user, fullName } = await getUserAndRole();
  if (!user) return null;

  if (!role) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Waiting for role assignment</h2>
        <p className="small">
          Hi{fullName ? `, ${fullName}` : ""}! An admin needs to assign your role (truck owner, business owner, or admin).
        </p>
        <p className="small">
          If you are the first user, go to Supabase Table Editor and set your role to <code>admin</code> in <code>profiles</code>.
        </p>
        <div className="row">
          <Link className="btn" href="/public">Public map</Link>
        </div>
      </div>
    );
  }

  if (role === "truck_owner") return <RedirectCard href="/truck/dashboard" label="Go to Truck Owner Dashboard" />;
  if (role === "business_owner") return <RedirectCard href="/business/dashboard" label="Go to Business Owner Dashboard" />;
  return <RedirectCard href="/admin" label="Go to Admin" />;
}

function RedirectCard({ href, label }: { href: string; label: string }) {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <Link className="btn primary" href={href}>{label}</Link>
    </div>
  );
}

'@

Write-TextFile 'src/app/public/page.tsx' @'
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

'@

Write-TextFile 'src/app/public/publicMap.tsx' @'
"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

type PublicBooking = {
  request_id: string;
  truck_name: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
};

export default function PublicMap({ center, items }: { center: [number, number]; items: PublicBooking[] }) {
  return (
    <MapContainer center={center} zoom={Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM || 12)} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution=''&copy; OpenStreetMap contributors''
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {items.filter(i => i.location_lat && i.location_lng).map(i => (
        <Marker key={i.request_id} position={[i.location_lat!, i.location_lng!]} icon={icon}>
          <Popup>
            <strong>{i.truck_name}</strong><br />
            {new Date(i.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(i.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<br />
            {i.location_name}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

'@

Write-TextFile 'src/app/business/dashboard/page.tsx' @'
import Link from "next/link";
import { getUserAndRole, assertRole } from "../../../lib/auth";
import { createClient } from "../../../lib/supabase/server";

export default async function BusinessDashboard() {
  const { role, user } = await getUserAndRole();
  if (!assertRole(role, ["business_owner"])) return <Forbidden />;

  const supabase = createClient();
  const { data: requests } = await supabase
    .from("truck_requests")
    .select("id, created_at, start_time, end_time, location_name, status, blanket_request, accepted_truck_id, requested_truck_id")
    .eq("business_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>Business dashboard</h2>
        <Link className="btn primary" href="/business/requests/new">New request</Link>
      </div>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Date</th>
            <th>Time</th>
            <th>Location</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {(requests || []).map((r: any) => (
            <tr key={r.id}>
              <td><span className="badge">{r.status}</span></td>
              <td>{new Date(r.start_time).toLocaleDateString()}</td>
              <td>{new Date(r.start_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} - {new Date(r.end_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</td>
              <td>{r.location_name}</td>
              <td>{r.blanket_request ? "Blanket" : "Specific"}</td>
            </tr>
          ))}
          {(requests || []).length === 0 && (
            <tr><td colSpan={5} className="small">No requests yet.</td></tr>
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
      <Link className="btn" href="/role-gate">Back</Link>
    </div>
  );
}

'@

Write-TextFile 'src/app/business/requests/new/page.tsx' @'
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

    const { error } = await supabase.from("truck_requests").insert(payload);
    if (error) setErr(error.message);
    else setOk("Request submitted!");
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

'@

Write-TextFile 'src/app/truck/dashboard/page.tsx' @'
import Link from "next/link";
import { getUserAndRole, assertRole } from "../../../lib/auth";
import { createClient } from "../../../lib/supabase/server";

export default async function TruckDashboard() {
  const { role, user } = await getUserAndRole();
  if (!assertRole(role, ["truck_owner"])) return <Forbidden />;

  const supabase = createClient();

  // Show requests that are either blanket or specifically to this truck owner (by profile id)
  // In this simple MVP, truck id == owner user id (see schema). If you want multiple trucks per owner, extend the schema.
  const { data: myTruck } = await supabase.from("trucks").select("id, display_name").eq("owner_id", user!.id).single();

  const { data: requests } = await supabase
    .from("truck_requests_inbox")
    .select("*")
    .eq("truck_id", myTruck?.id)
    .order("start_time", { ascending: true });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Truck owner dashboard</h2>
          <div className="small">Truck: <strong>{myTruck?.display_name || "Not set"}</strong></div>
        </div>
        <Link className="btn" href="/truck/requests">View all requests</Link>
      </div>

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
      <Link className="btn" href="/role-gate">Back</Link>
    </div>
  );
}

'@

Write-TextFile 'src/app/truck/requests/page.tsx' @'
import Link from "next/link";
import { getUserAndRole, assertRole } from "../../../lib/auth";
import { createClient } from "../../../lib/supabase/server";

export default async function TruckRequestsPage() {
  const { role, user } = await getUserAndRole();
  if (!assertRole(role, ["truck_owner"])) return <Forbidden />;

  const supabase = createClient();
  const { data: myTruck } = await supabase.from("trucks").select("id, display_name").eq("owner_id", user!.id).single();

  const { data: all } = await supabase
    .from("truck_requests_inbox_all")
    .select("*")
    .eq("truck_id", myTruck?.id)
    .order("start_time", { ascending: true });

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>All requests</h2>
      <div className="small">Truck: <strong>{myTruck?.display_name || "Not set"}</strong></div>
      <hr />
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>When</th>
            <th>Location</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {(all || []).map((r: any) => (
            <tr key={r.request_id}>
              <td><span className="badge">{r.status}</span></td>
              <td>
                {new Date(r.start_time).toLocaleDateString()}{" "}
                {new Date(r.start_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} - {new Date(r.end_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
              </td>
              <td>{r.location_name}</td>
              <td className="small">{r.notes || ""}</td>
            </tr>
          ))}
          {(all || []).length === 0 && (
            <tr><td colSpan={4} className="small">No requests.</td></tr>
          )}
        </tbody>
      </table>
      <div className="row" style={{ marginTop: 12 }}>
        <Link className="btn" href="/truck/dashboard">Back</Link>
      </div>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Not allowed</h2>
      <p className="small">Your account role does not have access to this page.</p>
      <Link className="btn" href="/role-gate">Back</Link>
    </div>
  );
}

'@

Write-TextFile 'src/app/truck/requests/[requestId]/accept/route.ts' @'
import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getUserAndRole } from "../../../../../lib/auth";

export async function POST(_: Request, { params }: { params: { requestId: string } }) {
  const { role, user } = await getUserAndRole();
  if (!user || role !== "truck_owner") return NextResponse.redirect(new URL("/role-gate", "http://localhost:3000"));

  const supabase = createClient();
  const { data: myTruck } = await supabase.from("trucks").select("id").eq("owner_id", user.id).single();

  await supabase.rpc("accept_truck_request", { p_request_id: params.requestId, p_truck_id: myTruck?.id });
  return NextResponse.redirect(new URL("/truck/dashboard", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}

'@

Write-TextFile 'src/app/truck/requests/[requestId]/ignore/route.ts' @'
import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getUserAndRole } from "../../../../../lib/auth";

export async function POST(_: Request, { params }: { params: { requestId: string } }) {
  const { role, user } = await getUserAndRole();
  if (!user || role !== "truck_owner") return NextResponse.redirect(new URL("/role-gate", "http://localhost:3000"));

  const supabase = createClient();
  const { data: myTruck } = await supabase.from("trucks").select("id").eq("owner_id", user.id).single();

  await supabase.rpc("ignore_truck_request", { p_request_id: params.requestId, p_truck_id: myTruck?.id });
  return NextResponse.redirect(new URL("/truck/dashboard", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}

'@

Write-TextFile 'src/app/admin/page.tsx' @'
import Link from "next/link";
import { getUserAndRole, assertRole } from "../../lib/auth";
import { createClient } from "../../lib/supabase/server";

export default async function AdminPage() {
  const { role } = await getUserAndRole();
  if (!assertRole(role, ["admin"])) return <Forbidden />;

  const supabase = createClient();

  const { data: releases } = await supabase.from("releases").select("*").order("created_at", { ascending: false });
  const { data: profiles } = await supabase.from("profiles").select("id, email, full_name, role").order("created_at", { ascending: false }).limit(50);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Admin</h2>

      <h3>Change control (Releases)</h3>
      <p className="small">
        The app uses the active release from the database. To roll back, set a previous release as active.
      </p>

      <form action="/admin/releases/create" method="post" className="row">
        <input className="input" name="version" placeholder="Version (e.g., 1.0.1)" style={{ maxWidth: 220 }} required />
        <input className="input" name="notes" placeholder="Notes" style={{ flex: 1, minWidth: 240 }} />
        <button className="btn primary" type="submit">Create release</button>
      </form>

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Active</th>
            <th>Version</th>
            <th>Notes</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {(releases || []).map((r: any) => (
            <tr key={r.id}>
              <td>{r.is_active ? "✅" : ""}</td>
              <td><code>{r.version}</code></td>
              <td className="small">{r.notes || ""}</td>
              <td className="small">{new Date(r.created_at).toLocaleString()}</td>
              <td>
                {!r.is_active && (
                  <form action={`/admin/releases/${r.id}/activate`} method="post">
                    <button className="btn">Activate (Rollback)</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {(releases || []).length === 0 && (
            <tr><td colSpan={5} className="small">No releases yet. Create 1.0.0 as your baseline.</td></tr>
          )}
        </tbody>
      </table>

      <hr />

      <h3>User roles</h3>
      <p className="small">Assign roles after users sign up.</p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Set role</th>
          </tr>
        </thead>
        <tbody>
          {(profiles || []).map((p: any) => (
            <tr key={p.id}>
              <td>{p.full_name || ""}</td>
              <td className="small">{p.email}</td>
              <td><span className="badge">{p.role || "none"}</span></td>
              <td>
                <form action={`/admin/users/${p.id}/role`} method="post" className="row" style={{ alignItems: "center" }}>
                  <select className="input" name="role" defaultValue={p.role || ""} style={{ maxWidth: 220 }}>
                    <option value="">none</option>
                    <option value="business_owner">business_owner</option>
                    <option value="truck_owner">truck_owner</option>
                    <option value="admin">admin</option>
                  </select>
                  <button className="btn" type="submit">Save</button>
                </form>
              </td>
            </tr>
          ))}
          {(profiles || []).length === 0 && (
            <tr><td colSpan={4} className="small">No users yet.</td></tr>
          )}
        </tbody>
      </table>

      <div className="row" style={{ marginTop: 12 }}>
        <Link className="btn" href="/role-gate">Back</Link>
      </div>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Not allowed</h2>
      <p className="small">Your account role does not have access to this page.</p>
      <Link className="btn" href="/role-gate">Back</Link>
    </div>
  );
}

'@

Write-TextFile 'src/app/admin/releases/create/route.ts' @'
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { getUserAndRole } from "../../../../lib/auth";

export async function POST(req: Request) {
  const { role } = await getUserAndRole();
  if (role !== "admin") return NextResponse.redirect(new URL("/role-gate", "http://localhost:3000"));

  const form = await req.formData();
  const version = String(form.get("version") || "").trim();
  const notes = String(form.get("notes") || "").trim();

  const supabase = createClient();
  await supabase.from("releases").insert({ version, notes, is_active: false });

  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}

'@

Write-TextFile 'src/app/admin/releases/[releaseId]/activate/route.ts' @'
import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getUserAndRole } from "../../../../../lib/auth";

export async function POST(_: Request, { params }: { params: { releaseId: string } }) {
  const { role, user } = await getUserAndRole();
  if (!user || role !== "admin") return NextResponse.redirect(new URL("/role-gate", "http://localhost:3000"));

  const supabase = createClient();
  await supabase.rpc("activate_release", { p_release_id: params.releaseId });

  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}

'@

Write-TextFile 'src/app/admin/users/[userId]/role/route.ts' @'
import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getUserAndRole } from "../../../../../lib/auth";

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const { role } = await getUserAndRole();
  if (role !== "admin") return NextResponse.redirect(new URL("/role-gate", "http://localhost:3000"));

  const form = await req.formData();
  const newRole = String(form.get("role") || "");

  const supabase = createClient();
  await supabase.from("profiles").update({ role: newRole || null }).eq("id", params.userId);

  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}

'@

Write-TextFile 'src/lib/auth.ts' @'
import { createClient } from "./supabase/server";

export type AppRole = "truck_owner" | "business_owner" | "admin";

export async function getUserAndRole() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null as AppRole | null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (error) return { user, role: null as AppRole | null, profileError: error.message };
  return { user, role: profile?.role as AppRole, fullName: profile?.full_name as string | null };
}

export function assertRole(role: AppRole | null, allowed: AppRole[]) {
  return !!role && allowed.includes(role);
}

'@

Write-TextFile 'src/lib/db.ts' @'
export type RequestStatus = "pending" | "accepted" | "ignored" | "cancelled";

export type TruckRequest = {
  id: string;
  created_at: string;
  business_id: string;
  requested_truck_id: string | null;
  blanket_request: boolean;
  start_time: string;
  end_time: string;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
  status: RequestStatus;
  accepted_truck_id: string | null;
};

'@

Write-TextFile 'src/lib/supabase/browser.ts' @'
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, anon);
}

'@

Write-TextFile 'src/lib/supabase/server.ts' @'
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = cookies();
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}

'@

Write-TextFile 'supabase/migrations/001_init.sql' @'
-- Food Truck Booking schema (MVP)
-- Safe to run in Supabase SQL editor.

create extension if not exists "pgcrypto";

-- PROFILES (one row per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text check (role in (''truck_owner'',''business_owner'',''admin'')),
  created_at timestamptz not null default now()
);

-- Create a profile automatically on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>''full_name'',''''), null)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- TRUCKS
-- MVP: one truck per owner. Extend to multiple trucks by allowing many rows per owner_id.
create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(owner_id)
);

-- BUSINESS PROFILE (optional table for extra fields later)
create table if not exists public.businesses (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- REQUESTS
create type public.request_status as enum (''pending'',''accepted'',''ignored'',''cancelled'');

create table if not exists public.truck_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid not null references public.profiles(id) on delete cascade,

  requested_truck_id uuid null references public.trucks(id) on delete set null,
  blanket_request boolean not null default true,

  start_time timestamptz not null,
  end_time timestamptz not null,

  location_name text not null,
  location_lat double precision null,
  location_lng double precision null,

  notes text null,

  status public.request_status not null default ''pending'',
  accepted_truck_id uuid null references public.trucks(id) on delete set null
);

-- Basic guard: no more than 3 months in the future
create or replace function public.ensure_request_within_3_months()
returns trigger
language plpgsql
as $$
begin
  if NEW.start_time > (now() + interval ''3 months'') then
    raise exception ''Requests are limited to up to 3 months in advance'';
  end if;
  if NEW.end_time <= NEW.start_time then
    raise exception ''End time must be after start time'';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_request_time_guard on public.truck_requests;
create trigger trg_request_time_guard
before insert or update on public.truck_requests
for each row execute procedure public.ensure_request_within_3_months();

-- NOTIFICATIONS (simple inbox)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.truck_requests(id) on delete cascade,
  message text not null,
  is_read boolean not null default false
);

-- RELEASES (change control / rollback via feature/config versions)
create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id) on delete set null,
  version text not null,
  notes text null,
  features jsonb not null default ''{}''::jsonb,
  is_active boolean not null default false
);

create table if not exists public.release_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_id uuid references public.profiles(id) on delete set null,
  from_release_id uuid references public.releases(id) on delete set null,
  to_release_id uuid references public.releases(id) on delete set null,
  reason text
);

create or replace function public.activate_release(p_release_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_from uuid;
begin
  select id into v_from from public.releases where is_active = true limit 1;
  update public.releases set is_active = false where is_active = true;
  update public.releases set is_active = true where id = p_release_id;

  insert into public.release_changes(admin_id, from_release_id, to_release_id, reason)
  values (auth.uid(), v_from, p_release_id, ''Activated via admin UI'');
end;
$$;

-- VIEWS for truck inbox + public map
create or replace view public.truck_requests_inbox as
select
  r.id as request_id,
  t.id as truck_id,
  r.start_time,
  r.end_time,
  r.location_name,
  r.notes
from public.truck_requests r
join public.trucks t on t.owner_id is not null
where r.status = ''pending''
  and (
    r.blanket_request = true
    or r.requested_truck_id = t.id
  );

create or replace view public.truck_requests_inbox_all as
select
  r.id as request_id,
  t.id as truck_id,
  r.status,
  r.start_time,
  r.end_time,
  r.location_name,
  r.notes
from public.truck_requests r
join public.trucks t on t.owner_id is not null
where
  (r.blanket_request = true or r.requested_truck_id = t.id);

create or replace view public.public_bookings as
select
  r.id as request_id,
  t.display_name as truck_name,
  r.start_time,
  r.end_time,
  r.location_name,
  r.location_lat,
  r.location_lng
from public.truck_requests r
join public.trucks t on t.id = r.accepted_truck_id
where r.status = ''accepted'';

-- RPCs for truck accept/ignore
create or replace function public.accept_truck_request(p_request_id uuid, p_truck_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.truck_requests
  set status = ''accepted'', accepted_truck_id = p_truck_id
  where id = p_request_id
    and status = ''pending''
    and (
      blanket_request = true
      or requested_truck_id = p_truck_id
    );
end;
$$;

create or replace function public.ignore_truck_request(p_request_id uuid, p_truck_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.truck_requests
  set status = ''ignored''
  where id = p_request_id
    and status = ''pending''
    and (
      blanket_request = true
      or requested_truck_id = p_truck_id
    );
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.trucks enable row level security;
alter table public.businesses enable row level security;
alter table public.truck_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.releases enable row level security;
alter table public.release_changes enable row level security;

-- profiles: user can read/update self; admins read all
create policy "profiles_select_self" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id);

create policy "profiles_admin_all" on public.profiles
for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''));

create policy "profiles_admin_update" on public.profiles
for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''));

-- trucks: owner manages own; everyone can read active trucks (for request dropdown)
create policy "trucks_select_active" on public.trucks
for select using (is_active = true);

create policy "trucks_owner_all" on public.trucks
for all using (owner_id = auth.uid());

-- businesses: owner manages own
create policy "business_owner_all" on public.businesses
for all using (owner_id = auth.uid());

-- requests: business creates/reads own
create policy "requests_insert_business" on public.truck_requests
for insert with check (business_id = auth.uid());

create policy "requests_select_business" on public.truck_requests
for select using (business_id = auth.uid());

-- Truck owners can view requests that target them (blanket or specific)
create policy "requests_select_truck_owner" on public.truck_requests
for select using (
  exists (
    select 1 from public.trucks t
    where t.owner_id = auth.uid()
      and (truck_requests.blanket_request = true or truck_requests.requested_truck_id = t.id)
  )
);

-- Admin can read all requests
create policy "requests_admin_all" on public.truck_requests
for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''));

-- notifications: user reads own
create policy "notifications_self" on public.notifications
for select using (user_id = auth.uid());

-- releases: admins manage; everyone can read active release metadata (optional)
create policy "releases_select_active" on public.releases
for select using (is_active = true);

create policy "releases_admin_all" on public.releases
for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''));

create policy "release_changes_admin_select" on public.release_changes
for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''));

-- Seed: create baseline release (safe if already exists)
insert into public.releases(version, notes, is_active)
select ''1.0.0'', ''Baseline'', true
where not exists (select 1 from public.releases);

'@

Write-Host "Created project at $root" -ForegroundColor Green