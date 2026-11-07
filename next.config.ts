import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next 15 defaults dynamic route caching to zero, so every sidebar click
    // refetched and re-rendered the whole page. A short client-side window keeps
    // back/forward and repeat visits instant without serving stale data for long.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
