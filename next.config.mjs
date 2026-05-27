/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  basePath: process.env.PAGES_BASE_PATH || "",
  assetPrefix: process.env.PAGES_BASE_PATH || "",
};

export default nextConfig;
