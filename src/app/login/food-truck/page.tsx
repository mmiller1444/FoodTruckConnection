"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    else router.push("/truck/dashboard");
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2 style={ marginTop: 0 }>Food Truck login</h2>
      <p className="small">View business requests and accept/ignore invitations.</p>
      <form onSubmit={onSubmit}>
        <div className="label">Email</div>
        <input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        <div className="label">Password</div>
        <input className="input" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        {err && <p style={ color: "var(--danger)" }>{err}</p>}
        <div className="row" style={ marginTop: 12 }>
          <button className="btn primary" type="submit">Login</button>
          <a className="btn" href="/">Back</a>
        </div>
      </form>
      <p className="small">No account? <a href="/signup">Sign up</a></p>
    </div>
  );
}
