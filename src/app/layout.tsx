import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'IT Helpdesk · PT UMIRA', template: '%s · IT Helpdesk UMIRA' },
  description: 'Portal IT Support & Helpdesk PT UMIRA (SOP UMR-IT-04)',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0E3B43',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
