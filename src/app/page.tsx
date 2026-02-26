import Link from "next/link";

export default function Home() {
  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Food Truck Booking</h1>
      <p className="small">Choose your login type:</p>

      <div className="row" style={{ marginTop: 10 }}>
        <Link className="btn primary" href="/login/food-truck">Food Truck</Link>
        <Link className="btn primary" href="/login/business">Business Owner</Link>
        <Link className="btn primary" href="/login/admin">Admin</Link>
      </div>

      <hr />

      <div className="row">
        <Link className="btn" href="/signup">Create an account</Link>
        <Link className="btn" href="/public">Public map</Link>
      </div>

      <p className="small" style={{ marginTop: 12 }}>
        New users must be assigned a role by an admin before dashboards unlock.
      </p>
    </div>
  );
}
