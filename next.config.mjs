/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/mission-control",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
