import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ronda/ui', '@ronda/shared'],
  experimental: {
    // Habilitado para Server Actions
  },
};

export default nextConfig;
