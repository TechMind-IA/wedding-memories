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
    <section className="relative flex min-h-screen flex-col items-center justify-between bg-background px-4 py-12 overflow-hidden">

      {/* Ornamento folhas — canto superior direito */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -top-4 -right-6 w-36 opacity-25"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="120" cy="40"  rx="34" ry="13" fill="#4A7A52" transform="rotate(-50 120 40)"/>
        <ellipse cx="105" cy="25"  rx="26" ry="10" fill="#3D6644" transform="rotate(-30 105 25)"/>
        <ellipse cx="140" cy="60"  rx="22" ry="9"  fill="#5E8C63" transform="rotate(-65 140 60)"/>
        <ellipse cx="90"  cy="50"  rx="18" ry="7"  fill="#4A7A52" transform="rotate(-20 90 50)"/>
      </svg>

      {/* Ornamento folhas — canto inferior esquerdo */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -left-6 w-36 opacity-25"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="40"  cy="120" rx="34" ry="13" fill="#4A7A52" transform="rotate(50 40 120)"/>
        <ellipse cx="55"  cy="135" rx="26" ry="10" fill="#3D6644" transform="rotate(30 55 135)"/>
        <ellipse cx="20"  cy="100" rx="22" ry="9"  fill="#5E8C63" transform="rotate(65 20 100)"/>
        <ellipse cx="70"  cy="110" rx="18" ry="7"  fill="#4A7A52" transform="rotate(20 70 110)"/>
      </svg>

      {/* Topo decorativo */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {/* Divisor com ponto fucsia */}
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
          <h1 className="font-serif text-3xl font-bold text-foreground leading-tight">
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
            className="w-full px-4 py-4 rounded-xl border border-border bg-card text-foreground text-base font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-center transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full rounded-xl bg-primary px-6 py-4 text-base font-sans font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
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
