import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['react-force-graph-2d', 'force-graph'],
  async redirects() {
    return [
      {
        source: "/docs",
        destination: "/docs.html",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
