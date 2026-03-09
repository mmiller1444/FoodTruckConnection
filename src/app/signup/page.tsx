import { Shell } from '@/components/Shell';

export default function SignupInfoPage() {
  return (
    <Shell title="Sign up">
      <section className="card">
        <p>This scaffold is configured for admin-managed account creation.</p>
        <p>If you want self-signup, enable email/password signup in Supabase and add a registration flow that inserts into <code>profiles</code>.</p>
      </section>
    </Shell>
  );
}
