"use client"

import { useState } from "react"
import { Heart } from "lucide-react"

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
    <section className="flex min-h-screen flex-col items-center justify-between bg-background px-4 py-12">
      {/* Topo decorativo */}
      <div className="flex flex-col items-center gap-2">
        <Heart className="h-6 w-6 text-primary" fill="currentColor" />
        <p className="text-xs font-sans text-muted-foreground tracking-widest uppercase">
          Brenda & Jonathas
        </p>
      </div>

      {/* Conteúdo principal */}
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
            Bem-vindo ao nosso álbum 💍
          </h1>
          <p className="text-sm font-sans text-muted-foreground leading-relaxed">
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
            className="w-full px-4 py-4 rounded-xl border border-border bg-card text-foreground text-base font-sans placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center"
          />
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full rounded-xl bg-primary px-6 py-4 text-base font-sans font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Entrar
          </button>
        </div>

        <p className="text-xs font-sans text-muted-foreground">
          Seu nome será lembrado neste dispositivo para facilitar futuros envios.
        </p>
      </div>

      {/* Rodapé */}
      <p className="text-sm font-sans text-muted-foreground text-center">
        Com carinho, Brenda & Jonathas 💍
      </p>
    </section>
  )
}
