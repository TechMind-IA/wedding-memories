/**
 * Nome: components/welcome-screen.tsx
 * Função: Renderiza a tela ou componente Welcome Screen da experiência de convidados.
 */

"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface WelcomeScreenProps {
  onNavigate: (screen: string) => void
}

export function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  const [photosCount, setPhotosCount] = useState(0)
  const [isLoadingCount, setIsLoadingCount] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchPhotosCount() {
      try {
        const response = await fetch("/api/photos/count")
        if (!response.ok) return

        const data = await response.json()
        if (isMounted) setPhotosCount(Number(data.count ?? 0))
      } catch (error) {
        console.error("[WelcomeScreen] Erro ao contar fotos:", error)
      } finally {
        if (isMounted) setIsLoadingCount(false)
      }
    }

    fetchPhotosCount()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="wedding-floral-bg relative flex min-h-[100svh] flex-col items-center overflow-y-auto overflow-x-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] max-[360px]:px-3 max-[700px]:py-3 sm:py-6">
      {/* Header — logo */}
      <div className="relative z-10 flex w-full max-w-md items-center justify-start">
        <div className="flex items-center gap-2 opacity-65">
          <div className="h-8 w-12 overflow-hidden rounded-md max-[700px]:h-7 max-[700px]:w-10">
            <Image
              src="/logo_tecmind_cinza.png"
              alt="Logo TechMind"
              width={64}
              height={40}
              className="object-cover"
            />
          </div>
          <span className="font-sans text-sm font-bold tracking-tight text-foreground max-[700px]:text-xs">
            TechMind <span className="text-primary">AI</span>
          </span>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 py-4 text-center min-[390px]:gap-5 min-[390px]:py-6 max-[700px]:gap-3 max-[700px]:py-3 sm:gap-6">

        {/* Divisor decorativo superior */}
        <div className="flex w-36 items-center gap-3 min-[390px]:w-44 max-[700px]:w-32">
          <div className="flex-1 h-px bg-accent"/>
          <div className="w-2 h-2 rounded-full bg-primary"/>
          <div className="flex-1 h-px bg-accent"/>
        </div>

        {/* Título */}
        <div className="flex flex-col items-center gap-1 text-accent">
          <h1 className="font-montserrat text-[clamp(1.35rem,7vw,1.75rem)] font-semibold uppercase leading-[1.16] tracking-[0.2em] min-[390px]:tracking-[0.32em] max-[360px]:tracking-[0.16em] max-[700px]:text-[1.38rem] md:text-5xl">
            Brenda
            <span className="block text-sm font-semibold leading-[1.1] tracking-[0.2em] min-[390px]:text-base md:text-xl">
              &amp;
            </span>
            Jonathas
          </h1>
          <p className="font-montserrat text-[0.78rem] font-semibold leading-none tracking-[0.42em] min-[390px]:text-[0.82rem] min-[390px]:tracking-[0.5em] md:text-base">
            10.10.26
          </p>
        </div>

        {/* Divisor decorativo inferior */}
        <div className="flex w-36 items-center gap-3 min-[390px]:w-44 max-[700px]:w-32">
          <div className="flex-1 h-px bg-accent"/>
          <div className="w-2 h-2 rounded-full bg-primary"/>
          <div className="flex-1 h-px bg-accent"/>
        </div>

        {/* Texto convite */}
        <p className="max-w-[20rem] font-serif text-[0.9rem] font-medium leading-relaxed text-muted-foreground min-[390px]:text-base max-[700px]:max-w-[18rem] max-[700px]:text-[0.86rem]">
          Criamos este espaço para reunir todas as memórias do nosso casamento.
          Se você está aqui, faz parte da nossa história. 📸
        </p>

        {/* Contador de fotos */}
        <div className="flex max-w-full items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] min-[390px]:px-6 min-[390px]:py-2.5 max-[700px]:py-1.5">
          <span className="font-serif text-2xl font-bold text-foreground max-[700px]:text-xl">
            {isLoadingCount ? "..." : photosCount}
          </span>
          <span className="font-sans text-xs text-muted-foreground min-[390px]:text-sm">
            {photosCount === 1 ? "memória compartilhada" : "memórias compartilhadas"}
          </span>
        </div>

        {/* Botões */}
        <div className="flex w-full max-w-xs flex-col gap-3 max-[700px]:gap-2.5">
          <button
            onClick={() => onNavigate("upload")}
            className="w-full rounded-xl bg-primary px-6 py-3.5 font-sans text-base font-semibold text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.22)] transition-all hover:bg-primary/90 hover:shadow-[0_16px_32px_hsl(var(--primary)/0.28)] active:scale-[0.98] min-[390px]:py-4 max-[700px]:py-3 max-[700px]:text-sm"
          >
            Compartilhar memórias
          </button>
          <button
            onClick={() => onNavigate("gallery")}
            className="w-full rounded-xl border border-accent bg-card/40 px-6 py-3.5 font-sans text-base font-semibold text-foreground transition-all hover:bg-secondary active:scale-[0.98] min-[390px]:py-4 max-[700px]:py-3 max-[700px]:text-sm"
          >
            Ver galeria
          </button>
        </div>
      </div>

      {/* Rodapé */}
      <p className="relative z-10 min-h-2 text-center font-serif text-sm italic text-muted-foreground">
      </p>
    </section>
  )
}
