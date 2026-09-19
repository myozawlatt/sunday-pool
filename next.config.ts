import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Lets phones on the local network use `npm run dev -- -H 0.0.0.0` (dev only). Without it the dev server
  // blocks their hot-reload connection and the page never hydrates, so buttons do nothing.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '*.local'],
};

export default nextConfig;
