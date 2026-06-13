/**
 * Nome: components/guest-name-screen.tsx
 * Função: Renderiza a tela ou componente Guest Name Screen da experiência de convidados.
 */

"use client"

import { useState } from "react"

interface GuestNameScreenProps {
  onConfirm: (name: string) => void
}

export function GuestNameScreen({ onConfirm }: GuestNameScreenProps) {
  const [name, setName] = useState("")

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem("guestName", trimmed)
    onConfirm(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit()
  }

  return (
    <section className="wedding-floral-bg relative flex min-h-[100svh] flex-col items-center justify-between overflow-y-auto overflow-x-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] max-[360px]:px-3 max-[700px]:py-4 min-[390px]:py-8">
      {/* Topo decorativo */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {/* Divisor com ponto marrom */}
        <div className="flex items-center gap-3 w-40">
          <div className="flex-1 h-px bg-accent"/>
          <div className="w-2 h-2 rounded-full bg-primary"/>
          <div className="flex-1 h-px bg-accent"/>
        </div>
        <p className="font-serif italic text-sm text-muted-foreground tracking-wide">
          Brenda &amp; Jonathas
        </p>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5 py-4 text-center max-[700px]:gap-4 max-[700px]:py-3 min-[390px]:gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-[clamp(1.85rem,9vw,2.25rem)] font-bold text-foreground leading-tight max-[700px]:text-[1.9rem]">
            Bem-vindo ao nosso álbum 💍
          </h1>
          <p className="font-sans text-sm leading-relaxed text-muted-foreground max-[700px]:text-[0.82rem]">
            Antes de continuar, nos diga seu nome para identificarmos suas fotos com carinho.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 max-[700px]:gap-2.5">
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

        <p className="font-sans text-xs text-muted-foreground max-[700px]:text-[0.7rem]">
          Seu nome será lembrado neste dispositivo para facilitar futuros envios.
        </p>
      </div>
    </section>
  )
}
