import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Allow the LAN URL used for browser-level QA against the local dev server.
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.6'],
};
export default nextConfig;
