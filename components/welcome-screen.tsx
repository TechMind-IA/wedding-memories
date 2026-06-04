/**
 * Nome: components/welcome-screen.tsx
 * Função: Renderiza a tela ou componente Welcome Screen da experiência de convidados.
 */

"use client"

import { usePhotos } from "@/hooks/use-photos"
import { WeddingOrnament } from "@/components/wedding-ornament"
import Image from "next/image"

interface WelcomeScreenProps {
  onNavigate: (screen: string) => void
}

export function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  const { photos, isLoading } = usePhotos()

  return (
    <section className="relative flex h-[100dvh] max-h-[100dvh] flex-col items-center justify-between overflow-hidden bg-background px-4 py-6">
      <WeddingOrnament position="top-right" opacity="opacity-20" />
      <WeddingOrnament position="bottom-left" opacity="opacity-20" />

      {/* Header — logo */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-start">
        <div className="flex items-center gap-2 opacity-65">
          <div className="w-12 h-8 rounded-md overflow-hidden">
            <Image
              src="/logo_tecmind_cinza.png"
              alt="Logo TechMind"
              width={64}
              height={40}
              className="object-cover"
            />
          </div>
          <span className="font-sans font-bold text-sm tracking-tight text-foreground">
            TechMind <span className="text-primary">AI</span>
          </span>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center gap-6">

        {/* Divisor decorativo superior */}
        <div className="flex items-center gap-3 w-48">
          <div className="flex-1 h-px bg-accent"/>
          <div className="w-2 h-2 rounded-full bg-primary"/>
          <div className="flex-1 h-px bg-accent"/>
        </div>

        {/* Título */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground leading-none">
            Brenda &amp; Jonathas
          </h1>
        </div>

        {/* Divisor decorativo inferior */}
        <div className="flex items-center gap-3 w-48">
          <div className="flex-1 h-px bg-accent"/>
          <div className="w-2 h-2 rounded-full bg-primary"/>
          <div className="flex-1 h-px bg-accent"/>
        </div>

        {/* Texto convite */}
        <p className="max-w-sm font-serif text-base text-muted-foreground leading-relaxed">
          Criamos este espaço para reunir todas as memórias do nosso casamento.
          Se você está aqui, faz parte da nossa história. 📸
        </p>

        {/* Contador de fotos */}
        <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-card/80 border border-border shadow-[0_8px_24px_hsl(var(--foreground)/0.06)]">
          <span className="font-serif text-2xl font-bold text-foreground">
            {isLoading ? "..." : photos.length}
          </span>
          <span className="font-sans text-sm text-muted-foreground">
            {photos.length === 1 ? "foto compartilhada" : "fotos compartilhadas"}
          </span>
        </div>

        {/* Botões */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => onNavigate("upload")}
            className="w-full rounded-xl bg-primary px-6 py-4 font-sans text-base font-semibold text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.22)] transition-all hover:bg-primary/90 hover:shadow-[0_16px_32px_hsl(var(--primary)/0.28)] active:scale-[0.98]"
          >
            Compartilhar memórias
          </button>
          <button
            onClick={() => onNavigate("gallery")}
            className="w-full rounded-xl border border-accent bg-card/40 px-6 py-4 font-sans text-base font-semibold text-foreground transition-all hover:bg-secondary active:scale-[0.98]"
          >
            Ver galeria
          </button>
        </div>
      </div>

      {/* Rodapé */}
      <p className="relative z-10 font-serif text-sm italic text-muted-foreground text-center">
        Com carinho, Brenda &amp; Jonathas 💍
      </p>
    </section>
  )
}
