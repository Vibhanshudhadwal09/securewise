const backendOrigin = (process.env.BACKEND_ORIGIN || 'http://3.29.90.98:8080').replace(/\/+$/, '');
import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Avoid Next.js "inferred workspace root" warnings in monorepos with multiple lockfiles.
  outputFileTracingRoot: path.join(process.cwd(), '..'),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
