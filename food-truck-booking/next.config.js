/** @type {import(''next'').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // safer for server actions usage in some environments
    serverActions: { allowedOrigins: ["*"] }
  }
};
export default nextConfig;
