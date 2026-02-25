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
