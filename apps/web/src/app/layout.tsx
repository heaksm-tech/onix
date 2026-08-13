import type { Metadata } from 'next';

import './globals.css';

const COLOR_SCHEME_SCRIPT = `(function(){try{var s=localStorage.getItem('onix-color-scheme');if(s==='light'||s==='dark')document.documentElement.dataset.scheme=s}catch(e){}})()`;

export const metadata: Metadata = {
  title: { default: 'Onix CRM', template: '%s · Onix CRM' },
  description: 'Εσωτερικό CRM για την εμπορική επιχείρηση Σ. Δ. Μελάς',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
