import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Lets a phone on the same Wi-Fi use the dev server, at this machine's IP or its .local name.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .flatMap((net) => (net && net.family === "IPv4" && !net.internal ? [net.address] : []));

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: [...lanAddresses, "*.local"],
};

export default nextConfig;
