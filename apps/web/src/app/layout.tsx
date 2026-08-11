import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Onix CRM', template: '%s · Onix CRM' },
  description: 'Εσωτερικό CRM για την εμπορική επιχείρηση Σ. Δ. Μελάς',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
