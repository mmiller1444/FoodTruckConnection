# Addendum: Conflict Checking + Email Notifications

## Conflict checking
1. Run `supabase/migrations/002_conflicts_and_notifications.sql`.
2. This adds:
   - `time_range` generated column
   - exclusion constraint `no_overlap_accepted_per_truck`:
     - prevents any overlaps for the same `accepted_truck_id` while `status='accepted'`
   - improved `accept_truck_request()` that raises a friendly conflict error.

## Email notifications (Supabase Edge Function)
This project includes a Supabase Edge Function: `supabase/functions/notify`.

### Provider
Uses **Resend** (simple + reliable). Create a Resend account and API key.

### Set Supabase Function secrets
In Supabase Dashboard -> Edge Functions -> Secrets, set:
- `RESEND_API_KEY`
- `EMAIL_FROM` (example: `Food Truck Booking <no-reply@yourdomain.com>`)
- `SERVICE_ROLE_KEY` (your Supabase service role key)

### Deploy the Edge Function
From the project root (with Supabase CLI logged in):
- `supabase functions deploy notify`

### What triggers emails
- When a business submits a request, the app calls `/api/requests/create` which inserts the request and calls the `notify` function with `{ type: "new_request" }`.
- When a truck accepts a request, the accept route calls `notify` with `{ type: "accepted" }`.

If Resend is not desired, replace the `sendResendEmail()` function inside `supabase/functions/notify/index.ts`.
