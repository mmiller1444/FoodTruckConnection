import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Food Truck Booking',
  description: 'Business-to-truck booking application on Vercel and Supabase.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
