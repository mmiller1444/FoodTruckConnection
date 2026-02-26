import Link from "next/link";

export default function LoginChooser() {
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      <p className="small">Choose how you want to log in.</p>
      <div className="row" style={{ marginTop: 10 }}>
        <Link className="btn primary" href="/login/food-truck">Food Truck</Link>
        <Link className="btn primary" href="/login/business">Business Owner</Link>
        <Link className="btn primary" href="/login/admin">Admin</Link>
      </div>
      <hr />
      <div className="row">
        <Link className="btn" href="/signup">Create an account</Link>
        <Link className="btn" href="/">Back</Link>
      </div>
    </div>
  );
}
