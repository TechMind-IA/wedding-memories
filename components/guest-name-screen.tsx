/**
 * Nome: components/guest-name-screen.tsx
 * Função: Renderiza a tela ou componente Guest Name Screen da experiência de convidados.
 */

"use client"

import { useState } from "react"
import { useWedding } from "@/components/wedding-provider"

interface GuestNameScreenProps {
  onConfirm: (name: string) => void
}

export function GuestNameScreen({ onConfirm }: GuestNameScreenProps) {
  const [name, setName] = useState("")
  const { accessCode, coupleNames, weddingDate } = useWedding()
  const [firstName, lastName] = coupleNames.split("&").map((n) => n.trim())

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem(`guestName_${accessCode}`, trimmed)
    onConfirm(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit()
  }

  return (
    <section className="wedding-floral-bg relative flex min-h-[100svh] flex-col items-center overflow-y-auto overflow-x-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] max-[360px]:px-3 max-[700px]:py-4 min-[390px]:py-8">
      {/* Conteúdo principal */}
      <div className="relative z-10 flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 py-6 text-center max-[700px]:gap-4 max-[700px]:py-4 min-[390px]:gap-6">
        <div className="flex w-full max-w-[19rem] flex-col items-center gap-4 max-[700px]:gap-3">
          <div className="flex w-36 items-center gap-3 min-[390px]:w-44 max-[700px]:w-32">
            <div className="flex-1 h-px bg-accent"/>
            <div className="w-2 h-2 rounded-full bg-primary"/>
            <div className="flex-1 h-px bg-accent"/>
          </div>

          <div className="flex flex-col items-center gap-1 text-accent">
            <h1 className="font-montserrat text-[clamp(1.35rem,7vw,1.75rem)] font-semibold uppercase leading-[1.16] tracking-[0.2em] min-[390px]:tracking-[0.32em] max-[360px]:tracking-[0.16em] max-[700px]:text-[1.38rem]">
              {firstName}
              <span className="block text-sm font-semibold leading-[1.1] tracking-[0.2em] min-[390px]:text-base">
                &amp;
              </span>
              {lastName}
            </h1>
            <p className="font-montserrat text-[0.78rem] font-semibold leading-none tracking-[0.42em] min-[390px]:text-[0.82rem] min-[390px]:tracking-[0.5em]">
              {weddingDate}
            </p>
          </div>

          <div className="flex w-36 items-center gap-3 min-[390px]:w-44 max-[700px]:w-32">
            <div className="flex-1 h-px bg-accent"/>
            <div className="w-2 h-2 rounded-full bg-primary"/>
            <div className="flex-1 h-px bg-accent"/>
          </div>
        </div>

        <div className="flex max-w-[19rem] flex-col items-center gap-2">
          <h2 className="font-serif text-[clamp(1.35rem,7vw,1.75rem)] font-bold leading-tight text-foreground">
            Bem-vindo ao nosso álbum
          </h2>
          <p className="max-w-[17rem] font-sans text-sm leading-relaxed text-muted-foreground max-[700px]:text-[0.82rem]">
            Antes de continuar, nos diga seu nome para identificarmos suas fotos com carinho.
          </p>
        </div>

        <div className="flex w-full max-w-[19rem] flex-col gap-3 max-[700px]:gap-2.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Seu nome completo"
            autoFocus
            className="w-full rounded-xl border border-border bg-card/80 px-4 py-4 text-center font-sans text-base text-foreground shadow-[0_10px_24px_hsl(var(--foreground)/0.05)] transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45 max-[700px]:py-3.5 max-[700px]:text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full rounded-xl bg-primary px-6 py-4 font-sans text-base font-semibold text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.22)] transition-all hover:bg-primary/90 hover:shadow-[0_16px_32px_hsl(var(--primary)/0.28)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 max-[700px]:py-3.5 max-[700px]:text-sm"
          >
            Entrar
          </button>
        </div>

        <p className="max-w-[17rem] font-sans text-xs leading-relaxed text-muted-foreground max-[700px]:text-[0.7rem]">
          Seu nome será lembrado neste dispositivo para facilitar futuros envios.
        </p>
      </div>
    </section>
  )
}
