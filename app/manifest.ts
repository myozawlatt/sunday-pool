import type { MetadataRoute } from 'next';

// Makes the site installable ("Add to Home screen"); icons come from `npm run icons`
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Sunday Pool',
    short_name: 'Sunday Pool',
    description: 'Card & Snooker league results',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbfaee',
    theme_color: '#fbfaee',
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
