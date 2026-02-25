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


## Conflict checking
Accepted bookings are protected by a Postgres exclusion constraint so a truck cannot be double-booked for overlapping times.
Run `supabase/migrations/002_conflicts_and_notifications.sql` after the initial migration.

## Email notifications (Edge Functions)
This repo includes `supabase/functions/notify` which sends emails via Resend for new requests and accepted requests.
