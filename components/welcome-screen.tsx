/**
 * Nome: components/welcome-screen.tsx
 * Função: Renderiza a tela ou componente Welcome Screen da experiência de convidados.
 */

"use client"

import { usePhotos } from "@/hooks/use-photos"
import Image from "next/image"

interface WelcomeScreenProps {
  onNavigate: (screen: string) => void
}

export function WelcomeScreen({ onNavigate }: WelcomeScreenProps) {
  const { photos, isLoading } = usePhotos()

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-between bg-background px-4 py-8 overflow-hidden">

      {/* Ornamento folhas — canto superior direito */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -top-4 -right-6 w-40 opacity-30"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="120" cy="40"  rx="34" ry="13" fill="#4A7A52" transform="rotate(-50 120 40)"/>
        <ellipse cx="105" cy="25"  rx="26" ry="10" fill="#3D6644" transform="rotate(-30 105 25)"/>
        <ellipse cx="140" cy="60"  rx="22" ry="9"  fill="#5E8C63" transform="rotate(-65 140 60)"/>
        <ellipse cx="90"  cy="50"  rx="18" ry="7"  fill="#4A7A52" transform="rotate(-20 90 50)"/>
        <ellipse cx="130" cy="80"  rx="20" ry="8"  fill="#3D6644" transform="rotate(-75 130 80)"/>
      </svg>

      {/* Ornamento folhas — canto inferior esquerdo */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -left-6 w-40 opacity-30"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="40"  cy="120" rx="34" ry="13" fill="#4A7A52" transform="rotate(50 40 120)"/>
        <ellipse cx="55"  cy="135" rx="26" ry="10" fill="#3D6644" transform="rotate(30 55 135)"/>
        <ellipse cx="20"  cy="100" rx="22" ry="9"  fill="#5E8C63" transform="rotate(65 20 100)"/>
        <ellipse cx="70"  cy="110" rx="18" ry="7"  fill="#4A7A52" transform="rotate(20 70 110)"/>
        <ellipse cx="30"  cy="80"  rx="20" ry="8"  fill="#3D6644" transform="rotate(75 30 80)"/>
      </svg>

      {/* Header — logo */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-16 h-10 rounded-md overflow-hidden">
            <Image
              src="/logo_tecmind_cinza.png"
              alt="Logo TechMind"
              width={80}
              height={50}
              className="object-cover"
            />
          </div>
          <span className="font-sans font-bold text-sm tracking-tight text-foreground">
            TechMind <span className="text-primary">AI</span>
          </span>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center gap-5">

        {/* Divisor decorativo superior */}
        <div className="flex items-center gap-3 w-48">
          <div className="flex-1 h-px bg-accent"/>
          <div className="w-2 h-2 rounded-full bg-primary"/>
          <div className="flex-1 h-px bg-accent"/>
        </div>

        {/* Título */}
        <div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Brenda &amp; Jonathas
          </h1>
          <p className="font-serif text-lg text-primary italic mt-1">
            Celebrando o nosso amor ❤️
          </p>
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
        <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-secondary border border-border">
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
            className="w-full rounded-xl bg-primary px-6 py-4 font-sans text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            Compartilhar fotos
          </button>
          <button
            onClick={() => onNavigate("gallery")}
            className="w-full rounded-xl border border-accent bg-transparent px-6 py-4 font-sans text-base font-semibold text-foreground transition-all hover:bg-secondary active:scale-[0.98]"
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
