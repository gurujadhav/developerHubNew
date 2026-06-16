/** @type {import('next').NextConfig} */
const nextConfig = {
  // In Next.js 15, serverComponentsExternalPackages moved to top-level serverExternalPackages
  serverExternalPackages: ["mongoose", "bcryptjs"],
};

module.exports = nextConfig;
