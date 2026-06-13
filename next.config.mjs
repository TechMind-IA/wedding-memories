/**
 * Nome: next.config.mjs
 * Função: Configura o comportamento do Next.js para build e runtime.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Hostname do bucket S3 já configurado
    remotePatterns: [
      {
        protocol: "https",
        hostname: "casamento-jhow-brenda.s3.us-east-2.amazonaws.com",
      },
    ],
    // Mantém só as larguras realmente usadas por cards, previews e lightbox.
    // Menos variantes = menos trabalho no otimizador e mais chance de cache hit.
    deviceSizes: [256, 384, 640, 750],
    imageSizes: [64, 96, 128, 256, 384],
    // Formato moderno: WebP é ~30% menor que JPEG na mesma qualidade
    formats: ["image/webp"],
    qualities: [35, 40, 75],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default nextConfig
