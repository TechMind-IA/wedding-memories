/**
 * Nome: components/welcome-screen.tsx
 * Função: Tela de boas-vindas do casamento.
 */

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Settings } from "lucide-react"
import { useWedding } from "@/components/wedding-provider"

interface WelcomeScreenProps {
  onNavigate: (screen: string) => void
}

export function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  const { accessCode, slug, coupleNames, weddingDate, backgroundType, customTexts } = useWedding()
  const [photosCount, setPhotosCount] = useState(0)
  const [isLoadingCount, setIsLoadingCount] = useState(true)
  const apiBase = `/api/${accessCode}/${slug}`

  useEffect(() => {
    let isMounted = true
    fetch(`${apiBase}/photos/count`)
      .then((r) => r.json())
      .then((data) => { if (isMounted) setPhotosCount(Number(data.count ?? 0)) })
      .catch(() => {})
      .finally(() => { if (isMounted) setIsLoadingCount(false) })
    return () => { isMounted = false }
  }, [apiBase])

  const [firstName, lastName] = coupleNames.split("&").map((n) => n.trim())

  return (
    <section className={`wedding-bg wedding-bg-${backgroundType} relative flex min-h-[100svh] flex-col items-center overflow-y-auto overflow-x-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)]`}>
      <div className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 py-4 text-center min-[390px]:gap-5 min-[390px]:py-6">
        <div className="flex w-36 items-center gap-3 min-[390px]:w-44">
          <div className="flex-1 h-px bg-accent"/>
          <div className="w-2 h-2 rounded-full bg-primary"/>
          <div className="flex-1 h-px bg-accent"/>
        </div>

        <div className="flex flex-col items-center gap-1 text-accent">
          <h1 className="font-montserrat text-[clamp(1.35rem,7vw,1.75rem)] font-semibold uppercase leading-[1.16] tracking-[0.2em]">
            {firstName}
            <span className="block text-sm font-semibold leading-[1.1] tracking-[0.2em]">&amp;</span>
            {lastName}
          </h1>
          <p className="font-montserrat text-[0.78rem] font-semibold leading-none tracking-[0.42em]">{weddingDate}</p>
        </div>

        <div className="flex w-36 items-center gap-3 min-[390px]:w-44">
          <div className="flex-1 h-px bg-accent"/>
          <div className="w-2 h-2 rounded-full bg-primary"/>
          <div className="flex-1 h-px bg-accent"/>
        </div>

        <p className="max-w-[20rem] font-serif text-[0.9rem] font-medium leading-relaxed text-muted-foreground">
          {customTexts.welcome_message || "Criamos este espaço para reunir todas as memórias do nosso casamento. Se você está aqui, faz parte da nossa história. 📸"}
        </p>

        <div className="flex max-w-full items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 shadow-[0_8px_24px_hsl(var(--foreground)/0.06)]">
          <span className="font-serif text-2xl font-bold text-foreground">{isLoadingCount ? "..." : photosCount}</span>
          <span className="font-sans text-xs text-muted-foreground">{photosCount === 1 ? "memória compartilhada" : "memórias compartilhadas"}</span>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <button onClick={() => onNavigate("upload")} className="w-full rounded-xl bg-primary px-6 py-3.5 font-sans text-base font-semibold text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.22)] transition-all hover:bg-primary/90 active:scale-[0.98]">
            {customTexts.welcome_cta_primary || "Compartilhar memórias"}
          </button>
          <button onClick={() => onNavigate("gallery")} className="w-full rounded-xl border border-accent bg-card/40 px-6 py-3.5 font-sans text-base font-semibold text-foreground transition-all hover:bg-secondary active:scale-[0.98]">
            {customTexts.welcome_cta_secondary || "Ver galeria"}
          </button>
        </div>
      </div>

      <Link href={`/${accessCode}/${slug}/admin`}
        className="fixed bottom-5 left-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:bg-card hover:text-foreground hover:shadow-md"
        title="Painel Administrativo">
        <Settings className="h-4 w-4" />
      </Link>
    </section>
  )
}
