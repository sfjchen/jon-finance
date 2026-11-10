import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** Pins the workspace root here, since this repo lives inside jon-fun and Next would otherwise adopt its lockfile. */
const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root },
};

export default nextConfig;
