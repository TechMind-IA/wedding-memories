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
    // Tamanhos gerados para cards da grade (50vw mobile, 25vw desktop)
    // Next.js escolhe o menor tamanho suficiente para o `sizes` informado
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [96, 128, 256, 384],
    // Formato moderno: WebP é ~30% menor que JPEG na mesma qualidade
    formats: ["image/webp"],
  },
}

export default nextConfig
