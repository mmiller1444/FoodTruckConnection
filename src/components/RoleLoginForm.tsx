"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/browser";

type Props = {
  title: string;
  subtitle: string;
  redirectTo: string;
};

export default function RoleLoginForm({ title, subtitle, redirectTo }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErr(error.message);
      return;
    }

    router.push(redirectTo);
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p className="small">{subtitle}</p>

      <form onSubmit={onSubmit}>
        <div className="label">Email</div>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="label">Password</div>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {err && <p style={{ color: "var(--danger)" }}>{err}</p>}

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" type="submit">
            Login
          </button>
          <a className="btn" href="/">
            Back
          </a>
        </div>
      </form>

      <p className="small">
        No account? <a href="/signup">Sign up</a>
      </p>
    </div>
  );
}