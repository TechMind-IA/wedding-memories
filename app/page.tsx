/**
 * Nome: app/page.tsx
 * Função: Landing page institucional do Wedding Memories.
 */

"use client"

import Link from "next/link"
import { Heart, Camera, Share2, QrCode, Shield, Globe } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground md:text-6xl">
          Wedding Memories
        </h1>
        <p className="mt-4 max-w-lg font-sans text-lg text-muted-foreground">
          O álbum colaborativo do seu casamento. Convidados compartilham fotos e vídeos, tudo organizado em uma galeria linda e privada.
        </p>
        <div className="mt-8 flex gap-3">
          <a href="/super-admin" className="rounded-xl bg-primary px-6 py-3 font-sans text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/0.2)] transition-colors hover:bg-primary/90">
            Área do Desenvolvedor
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-12 text-center font-serif text-3xl font-bold text-foreground">Como funciona</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10"><Camera className="h-7 w-7 text-primary" /></div>
            <h3 className="mb-2 font-sans text-lg font-bold text-foreground">Crie seu casamento</h3>
            <p className="font-sans text-sm text-muted-foreground">O desenvolvedor cadastra seu casamento e gera um QR Code com link exclusivo.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10"><Share2 className="h-7 w-7 text-primary" /></div>
            <h3 className="mb-2 font-sans text-lg font-bold text-foreground">Compartilhe</h3>
            <p className="font-sans text-sm text-muted-foreground">Envie o QR Code ou link para seus convidados. Eles acessam e enviam suas fotos e vídeos.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10"><QrCode className="h-7 w-7 text-primary" /></div>
            <h3 className="mb-2 font-sans text-lg font-bold text-foreground">Acesse pelo QR Code</h3>
            <p className="font-sans text-sm text-muted-foreground">Os convidados escaneiam o QR Code e são direcionados direto para a galeria do casamento.</p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-muted/50 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center font-serif text-3xl font-bold text-foreground">Por que usar?</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6">
              <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="mb-1 font-sans text-sm font-bold text-foreground">Totalmente Privado</h3>
                <p className="font-sans text-sm text-muted-foreground">Cada casamento tem um link único. Só quem tem o QR Code acessa.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6">
              <Globe className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="mb-1 font-sans text-sm font-bold text-foreground">Acesso Fácil</h3>
                <p className="font-sans text-sm text-muted-foreground">Basta escanear o QR Code. Sem cadastro, sem complicação.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6">
              <Camera className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="mb-1 font-sans text-sm font-bold text-foreground">Fotos e Vídeos</h3>
                <p className="font-sans text-sm text-muted-foreground">Convidados enviam fotos e vídeos direto do celular, com dados EXIF preservados.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6">
              <Heart className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="mb-1 font-sans text-sm font-bold text-foreground">Timeline Automática</h3>
                <p className="font-sans text-sm text-muted-foreground">Fotos organizadas cronologicamente nos eventos do casamento.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center">
        <p className="font-sans text-sm text-muted-foreground">
          Wedding Memories — Feito com ❤️ para casamentos inesquecíveis
        </p>
      </footer>
    </div>
  )
}
