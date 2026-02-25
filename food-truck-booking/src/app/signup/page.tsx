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
