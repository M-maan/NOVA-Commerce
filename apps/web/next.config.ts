import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Vercel provides its own serverless output tracing. Standalone output is
  // reserved for the API container and can omit next-server.nft.json in a
  // pnpm workspace build.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Allow the LAN URL used for browser-level QA against the local dev server.
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.6'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default nextConfig;
