/**
 * Nome: components/guest-name-screen.tsx
 * Função: Renderiza a tela ou componente Guest Name Screen da experiência de convidados.
 */

"use client"

import { useState } from "react"
import { WeddingOrnament } from "@/components/wedding-ornament"

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
    <section className="relative flex min-h-screen flex-col items-center justify-between bg-background px-4 py-12 overflow-hidden">
      <WeddingOrnament position="top-right" size="sm" opacity="opacity-20" />
      <WeddingOrnament position="bottom-left" size="sm" opacity="opacity-20" />

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
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-4xl font-bold text-foreground leading-tight">
            Bem-vindo ao nosso álbum 💍
          </h1>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
            Antes de continuar, nos diga seu nome para identificarmos suas fotos com carinho.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Seu nome completo"
            autoFocus
            className="w-full px-4 py-4 rounded-xl border border-border bg-card/80 text-foreground text-base font-sans placeholder:text-muted-foreground shadow-[0_10px_24px_hsl(var(--foreground)/0.05)] focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary text-center transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full rounded-xl bg-primary px-6 py-4 text-base font-sans font-semibold text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.22)] transition-all hover:bg-primary/90 hover:shadow-[0_16px_32px_hsl(var(--primary)/0.28)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Entrar
          </button>
        </div>

        <p className="text-xs font-sans text-muted-foreground">
          Seu nome será lembrado neste dispositivo para facilitar futuros envios.
        </p>
      </div>

      {/* Rodapé */}
      <p className="relative z-10 font-serif text-sm italic text-muted-foreground text-center">
        Com carinho, Brenda &amp; Jonathas 💍
      </p>
    </section>
  )
}
