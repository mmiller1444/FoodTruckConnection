import Link from 'next/link';
import { ReactNode } from 'react';
import { signOut } from '@/lib/actions';

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-sm text-slate-600">Food Truck Booking on Vercel + Supabase</p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link href="/">Home</Link>
          <Link href="/public-map">Public Map</Link>
          <Link href="/business/dashboard">Business</Link>
          <Link href="/truck/dashboard">Truck</Link>
          <Link href="/admin">Admin</Link>
          <form action={signOut}>
            <button className="rounded bg-slate-900 px-3 py-1 text-white">Sign out</button>
          </form>
        </nav>
      </header>
      {children}
    </main>
  );
}
