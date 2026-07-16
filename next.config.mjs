/**
 * Nome: next.config.mjs
 * Função: Configura o comportamento do Next.js para build e runtime.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
    ],
    deviceSizes: [256, 384, 640, 750],
    imageSizes: [64, 96, 128, 256, 384],
    formats: ["image/webp"],
    qualities: [35, 40, 75],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default nextConfig
