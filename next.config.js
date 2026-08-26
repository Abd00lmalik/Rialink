/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @rialo/ts-cdk bundles noble-crypto code that breaks under webpack
  // server bundling; require it natively at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ['@rialo/ts-cdk'],
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;
