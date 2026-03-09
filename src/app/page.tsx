import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { getUserAndRole } from '@/lib/auth';

export default async function HomePage() {
  const { role } = await getUserAndRole();

  return (
    <Shell title="Food Truck Booking">
      <div className="grid-2">
        <section className="card">
          <h2>What this app does</h2>
          <p>Businesses can request a specific truck or send a blanket request up to three months in advance.</p>
          <p>Truck owners receive notifications and can accept or ignore the request. Admins manage users, releases, and operational controls.</p>
        </section>
        <section className="card">
          <h2>Current role</h2>
          <p><span className="badge">{role}</span></p>
          <div className="grid">
            <Link href="/login">Login</Link>
            <Link href="/business/dashboard">Business dashboard</Link>
            <Link href="/truck/dashboard">Truck dashboard</Link>
            <Link href="/admin">Admin console</Link>
            <Link href="/public-map">Public map</Link>
          </div>
        </section>
      </div>
    </Shell>
  );
}
