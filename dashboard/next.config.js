const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/app";

const nextConfig = {
  reactStrictMode: true,
  basePath,
  distDir: "../.next-dashboard"
};

module.exports = nextConfig;
