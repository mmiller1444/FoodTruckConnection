import Link from "next/link";

export default function LoginLandingPage() {
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      <p className="small">Choose your login type:</p>

      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        <Link className="btn primary" href="/login/business">Business Owner</Link>
        <Link className="btn primary" href="/login/food-truck">Food Truck</Link>
        <Link className="btn primary" href="/login/admin">Admin</Link>
      </div>

      <hr />

      <p className="small">
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
