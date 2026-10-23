import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(__dirname);

const nextConfig: NextConfig = {
  // Zelfde URL's als de oude WordPress-site: /over-ons/, /tarieven/, …
  trailingSlash: true,
  // PGlite laadt eigen WASM-bestanden; niet bundelen.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Deze app staat in een submap van een andere repo; houd de root hier.
  turbopack: { root },
  outputFileTracingRoot: root,
  async redirects() {
    // Oude WordPress-URL van de omgevingspagina.
    return [{ source: "/een-homepage-sectie/", destination: "/omgeving/", permanent: true }];
  },
};

export default nextConfig;
