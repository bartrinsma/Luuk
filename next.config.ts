import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite laadt eigen WASM-bestanden; niet bundelen maar als gewone dependency meenemen.
  serverExternalPackages: ["@electric-sql/pglite"],
  async redirects() {
    return [{ source: "/web", destination: "/roast", permanent: false }];
  },
};

export default nextConfig;
