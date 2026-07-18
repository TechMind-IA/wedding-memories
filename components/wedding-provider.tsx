/**
 * Nome: components/wedding-provider.tsx
 * Função: React Context que fornece dados do casamento para todos os components.
 */

"use client"

import { createContext, useContext } from "react"

export interface WeddingData {
  accessCode: string
  slug: string
  coupleNames: string
  weddingDate: string
  themeColor: string
  fontFamily: string
  backgroundType: string
  customTexts: Record<string, string>
}

const WeddingContext = createContext<WeddingData | null>(null)

export function WeddingProvider({
  children,
  wedding,
}: {
  children: React.ReactNode
  wedding: WeddingData
}) {
  return (
    <WeddingContext.Provider value={wedding}>
      {children}
    </WeddingContext.Provider>
  )
}

export function useWedding(): WeddingData {
  const ctx = useContext(WeddingContext)
  if (!ctx) {
    throw new Error("useWedding deve ser usado dentro de um WeddingProvider")
  }
  return ctx
}

/**
 * Hook auxiliar para construir URLs da API do casamento.
 */
export function useWeddingApi() {
  const { accessCode, slug } = useWedding()

  function apiUrl(path: string): string {
    return `/api/${accessCode}/${slug}${path}`
  }

  return { apiUrl, accessCode, slug }
}
