import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ronda/ui', '@ronda/shared'],
};

export default nextConfig;
