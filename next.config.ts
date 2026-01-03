import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  // Ensure static assets are properly handled
  images: {
    // Allow unoptimized images for large preview files
    unoptimized: false,
    // Add image domains if needed
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },

  // Ensure public folder is included in build
  // Note: Next.js includes public folder by default, but we're being explicit
  output: undefined, // Keep as server-side rendering (default)
};

export default nextConfig;

