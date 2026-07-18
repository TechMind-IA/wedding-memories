/**
 * Nome: app/[accessCode]/[slug]/layout.tsx
 * Função: Layout do casamento — resolve wedding pelo accessCode+slug e prove context.
 */

import type { Metadata } from "next"
import { getWeddingByAccessCode } from "@/lib/wedding-context"
import { WeddingProvider } from "@/components/wedding-provider"
import { WeddingTheme } from "@/components/wedding-theme"
import { notFound } from "next/navigation"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ accessCode: string; slug: string }>
}): Promise<Metadata> {
  const { accessCode } = await params
  const wedding = await getWeddingByAccessCode(accessCode)
  if (!wedding) return { title: "Casamento não encontrado" }
  return {
    title: `${wedding.coupleNames} - Wedding Memories`,
    description: `Galeria colaborativa de fotos do casamento de ${wedding.coupleNames}. Compartilhe suas memórias!`,
  }
}

export default async function WeddingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ accessCode: string; slug: string }>
}) {
  const { accessCode, slug } = await params
  const wedding = await getWeddingByAccessCode(accessCode)

  if (!wedding || wedding.slug !== slug || !wedding.isActive) {
    notFound()
  }

  return (
    <WeddingTheme themeColor={wedding.themeColor} fontFamily={wedding.fontFamily}>
      <WeddingProvider
        wedding={{
          accessCode: wedding.accessCode,
          slug: wedding.slug,
          coupleNames: wedding.coupleNames,
          weddingDate: wedding.weddingDate || "",
        themeColor: wedding.themeColor,
        fontFamily: wedding.fontFamily,
        backgroundType: wedding.backgroundType,
        customTexts: wedding.customTexts,
        }}
      >
        {children}
      </WeddingProvider>
    </WeddingTheme>
  )
}
