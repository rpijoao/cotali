import type { NextConfig } from 'next';

const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'cotali';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  ...(isGithubPages ? { basePath: `/${repositoryName}` } : {}),
  transpilePackages: ['@cotali/contracts', '@cotali/domain'],
};

export default nextConfig;
