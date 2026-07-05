import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output builds a minimal server with only the files Next.js needs
  // to run in production. Required for a small Docker image.
  output: "standalone",
  // Next 16 uses Turbopack by default for dev + build; default is fine.
  // Allow builds behind a reverse proxy without breaking the auth callback.
  experimental: {},
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
