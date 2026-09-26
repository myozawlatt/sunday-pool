import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, Noto_Sans_Myanmar } from 'next/font/google';
import { SUPABASE_URL } from '@/lib/env';
import './globals.css';

// Body text: Inter (Google Fonts, SIL Open Font License) — downloaded at build time and self-hosted by Next.js
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// Burmese (player quotes): sits after Inter in the font stacks and its @font-face carries a
// Myanmar unicode-range, so browsers only download it on pages that contain Burmese text.
const myanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  variable: '--font-myanmar',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
});

// Headings: Clash Grotesk (Fontshare, ITF Free Font License). Served by the Fontshare API instead of
// self-hosted: the license forbids redistributing the font files, and this repository is public.
const CLASH_GROTESK_CSS = 'https://api.fontshare.com/v2/css?f[]=clash-grotesk@500,600,700&display=swap';

export const metadata: Metadata = {
  title: { default: 'Sunday Pool', template: '%s · Sunday Pool' },
  description: 'Card & Snooker league results',
  // iOS home-screen name; otherwise it offers the page title (e.g. "History · Sunday Pool")
  appleWebApp: { title: 'Sunday Pool' },
};

export const viewport: Viewport = {
  themeColor: '#fbfaee',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${myanmar.variable}`}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        {/* Avatars are plain <img> from Supabase Storage — no crossOrigin, they aren't CORS-fetched. */}
        {SUPABASE_URL && <link rel="preconnect" href={SUPABASE_URL} />}
        {/* CORS so the results-image capture (DownloadResults) can read the @font-face rules and embed the font */}
        <link rel="stylesheet" href={CLASH_GROTESK_CSS} crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
