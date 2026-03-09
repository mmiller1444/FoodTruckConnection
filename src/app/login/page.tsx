import { Shell } from '@/components/Shell';
import { signIn } from '@/lib/actions';

export default function LoginPage() {
  return (
    <Shell title="Login">
      <form action={signIn} className="card grid" style={{ maxWidth: 460 }}>
        <label>Email<input name="email" type="email" required /></label>
        <label>Password<input name="password" type="password" required /></label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Sign in</button>
      </form>
    </Shell>
  );
}
