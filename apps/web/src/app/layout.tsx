import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Onix',
  description: 'Internal B2B CRM for S. D. Melas Trading Business',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
