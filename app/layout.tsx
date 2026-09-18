import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { SUPABASE_URL } from '@/lib/env';
import './globals.css';

// Body text: Inter (Google Fonts, SIL Open Font License) — downloaded at build time and self-hosted by Next.js
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// Headings: Clash Grotesk (Fontshare, ITF Free Font License). Served by the Fontshare API instead of
// self-hosted: the license forbids redistributing the font files, and this repository is public.
const CLASH_GROTESK_CSS = 'https://api.fontshare.com/v2/css?f[]=clash-grotesk@500,600,700&display=swap';

export const metadata: Metadata = {
  title: { default: 'Sunday Pool', template: '%s · Sunday Pool' },
  description: 'Card & Snooker league results',
};

export const viewport: Viewport = {
  themeColor: '#fbfaee',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        {/* Avatars are plain <img> from Supabase Storage — no crossOrigin, they aren't CORS-fetched. */}
        {SUPABASE_URL && <link rel="preconnect" href={SUPABASE_URL} />}
        <link rel="stylesheet" href={CLASH_GROTESK_CSS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
