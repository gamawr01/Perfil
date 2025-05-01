/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Disable TypeScript checks during build as they are checked separately
    ignoreBuildErrors: process.env.TSC_IGNORE_BUILD_ERRORS === 'true',
  },
  eslint: {
    // Disable ESLint checks during build as they are checked separately
    ignoreDuringBuilds: process.env.TSC_IGNORE_BUILD_ERRORS === 'true',
  },
  experimental: {
    // Add 'async_hooks' to serverComponentsExternalPackages
    // This helps Next.js correctly handle this Node.js module used by dependencies like OpenTelemetry
    serverComponentsExternalPackages: ['async_hooks'],
  },
};

module.exports = nextConfig;