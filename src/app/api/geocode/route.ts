import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) return NextResponse.json({ results: [] });

  // Basic guard to keep this endpoint lightweight
  if (q.length < 3) return NextResponse.json({ results: [] });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("q", q);

  const resp = await fetch(url.toString(), {
    headers: {
      // Nominatim usage policy: include a valid UA. Use your app name.
      "User-Agent": "food-truck-connection/1.0 (vercel)",
      "Accept": "application/json",
    },
    // Avoid caching while typing
    cache: "no-store",
  });

  if (!resp.ok) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const data = (await resp.json()) as NominatimResult[];

  const results = (data || []).map((r) => ({
    display_name: r.display_name,
    lat: r.lat,
    lon: r.lon,
  }));

  return NextResponse.json({ results });
}
