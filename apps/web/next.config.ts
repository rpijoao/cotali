import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cotali/contracts', '@cotali/domain'],
};

export default nextConfig;
