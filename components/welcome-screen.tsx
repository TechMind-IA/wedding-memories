"use client"

import { usePhotos } from "@/hooks/use-photos"

interface WelcomeScreenProps {
  onNavigate: (screen: string) => void
}

export function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  const { photos, isLoading } = usePhotos()

  return (
    <section className="flex min-h-screen flex-col items-center justify-between bg-background px-4 py-8">
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <div>
          <p className="text-xs font-sans text-muted-foreground">Nosso Album</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-2 text-balance">
          Brenda & Jonathas
        </h1>
        <p className="font-serif text-xl md:text-2xl text-primary mb-6">
          Celebrando o nosso amor ❤️✨
        </p>

        <p className="max-w-md text-base font-sans text-foreground mb-6 leading-relaxed text-pretty">
          Criamos esse espaço para reunir todas as memórias do nosso casamento. Se você está aqui, faz parte da nossa história. 📸
        </p>

        {/* Contador de fotos */}
        <div className="flex items-center gap-2 mb-8 px-5 py-2.5 rounded-full bg-secondary">
          <span className="text-2xl font-serif font-bold text-foreground">
            {isLoading ? "..." : photos.length}
          </span>
          <span className="text-sm font-sans text-muted-foreground">
            {photos.length === 1 ? "foto compartilhada" : "fotos compartilhadas"}
          </span>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => onNavigate("upload")}
            className="w-full rounded-xl bg-primary px-6 py-4 text-base font-sans font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80"
          >
            Compartilhar fotos
          </button>
          <button
            onClick={() => onNavigate("gallery")}
            className="w-full rounded-xl bg-secondary px-6 py-4 text-base font-sans font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 active:bg-secondary/70"
          >
            Ver galeria
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-sm font-sans text-muted-foreground text-center">
        Com carinho, Brenda & Jonathas 💍
      </p>
    </section>
  )
}
