"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart, Camera, Share2, QrCode, Shield, Globe, Send, MessageCircle } from "lucide-react"

const features = [
  {
    icon: Camera,
    title: "Crie seu casamento",
    description: "O time cadastra seu casamento e gera um QR Code com link exclusivo para os convidados.",
    step: "1",
  },
  {
    icon: Share2,
    title: "Compartilhe",
    description: "Envie o QR Code ou link para seus convidados por WhatsApp, e-mail ou qualquer canal. Eles acessam instantaneamente.",
    step: "2",
  },
  {
    icon: QrCode,
    title: "Acesse pelo QR Code",
    description: "Os convidados escaneiam o QR Code e são direcionados direto para a galeria do casamento. Sem cadastro, sem complicação.",
    step: "3",
  },
]

const benefits = [
  {
    icon: Shield,
    title: "Totalmente Privado",
    description: "Cada casamento tem um link único. Só quem tem o QR Code pode acessar e enviar fotos.",
  },
  {
    icon: Globe,
    title: "Acesso Fácil",
    description: "Basta escanear o QR Code. Sem cadastro, sem app para baixar, sem complicação.",
  },
  {
    icon: Camera,
    title: "Fotos e Vídeos",
    description: "Convidados enviam fotos e vídeos direto do celular.",
  },
  {
    icon: Heart,
    title: "Timeline Automática",
    description: "As fotos são organizadas cronologicamente nos eventos do casamento, criando uma narrativa visual.",
  },
]

const WHATSAPP_NUMBER = "5531988280047"
const WHATSAPP_MESSAGE = encodeURIComponent("Olá! Gostaria de saber mais sobre o Wedding Memories.")

export default function LandingPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" })
  const [formSent, setFormSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Contato - Wedding Memories | ${formData.name}`)
    const body = encodeURIComponent(
      `Olá!\n\nMeu nome é ${formData.name}.\n\n${formData.message}\n\n---\nEnviado pelo formulário de contato do site.\nE-mail: ${formData.email}`
    )
    window.open(`mailto:contato@weddingmemories.com.br?subject=${subject}&body=${body}`, "_blank")
    setFormSent(true)
    setTimeout(() => setFormSent(false), 4000)
    setFormData({ name: "", email: "", message: "" })
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Hero */}
      <section className="landing-hero-bg relative flex flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-10 text-center md:pb-28 md:pt-0">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

        <div className="animate-fade-in-up mb-8 md:mb-8">
          <Image
            src="/logo-wedding.png"
            alt="Wedding Memories"
            width={600}
            height={600}
            className="w-100 md:w-116"
            priority
          />
        </div>

        <div className="animate-fade-in-up delay-200 mb-2 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-accent md:w-20" />
          <Heart className="h-4 w-4 text-accent animate-pulse-soft" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-accent md:w-20" />
        </div>

        <h1 className="animate-fade-in-up delay-300 font-serif text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Suas memórias,{" "}
          <span className="gold-shimmer">para sempre!</span>
        </h1>

        <p className="animate-fade-in-up delay-400 mt-6 max-w-xl font-sans text-lg leading-relaxed text-muted-foreground md:text-xl">
          O álbum colaborativo do seu casamento. Convidados compartilham fotos e
          vídeos, tudo organizado em uma galeria privada.
        </p>
      </section>

      {/* Divider */}
      <div className="flex items-center justify-center py-2">
        <div className="h-px w-24 bg-gradient-to-r from-transparent to-accent/40" />
        <Heart className="mx-3 h-3 w-3 text-accent/40" />
        <div className="h-px w-24 bg-gradient-to-l from-transparent to-accent/40" />
      </div>

      {/* Como Funciona */}
      <section id="como-funciona" className="relative px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 font-sans text-xs font-semibold uppercase tracking-widest text-primary">
              Simples e rápido
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold text-foreground md:text-5xl">
              Como funciona?
            </h2>
            <p className="mx-auto mt-4 max-w-lg font-sans text-muted-foreground">
              Em apenas 3 passos, seus convidados compartilham as melhores fotos e vídeos do seu dia especial.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.step}
                className="group relative rounded-2xl border border-border bg-card p-8 text-center transition-all duration-300 hover:border-accent/40 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.08)]"
              >
                <div className="absolute -top-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 font-serif text-xs font-bold text-primary-foreground shadow-md">
                  {feature.step}
                </div>

                <div className="mx-auto mb-5 mt-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>

                <h3 className="mb-3 font-serif text-xl font-bold text-foreground">
                  {feature.title}
                </h3>

                <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="flex items-center justify-center py-2">
        <div className="h-px w-24 bg-gradient-to-r from-transparent to-accent/40" />
        <Heart className="mx-3 h-3 w-3 text-accent/40" />
        <div className="h-px w-24 bg-gradient-to-l from-transparent to-accent/40" />
      </div>

      {/* Benefícios */}
      <section id="beneficios" className="bg-muted/30 px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 font-sans text-xs font-semibold uppercase tracking-widest text-primary">
              Por que escolher
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold text-foreground md:text-5xl">
              Por que usar?
            </h2>
            <p className="mx-auto mt-4 max-w-md font-sans text-muted-foreground">
              Tudo que você precisa para preservar as memórias do seu casamento em um só lugar.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:border-accent/40 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.08)] hover:-translate-y-0.5"
              >
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-primary/10 p-3 transition-transform duration-300 group-hover:scale-110">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-sans text-base font-bold text-foreground">
                  {benefit.title}
                </h3>
                <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="flex items-center justify-center py-2">
        <div className="h-px w-24 bg-gradient-to-r from-transparent to-accent/40" />
        <Heart className="mx-3 h-3 w-3 text-accent/40" />
        <div className="h-px w-24 bg-gradient-to-l from-transparent to-accent/40" />
      </div>

      {/* Contato */}
      <section id="contato" className="px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 font-sans text-xs font-semibold uppercase tracking-widest text-primary">
              Fale conosco
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold text-foreground md:text-5xl">
              Entre em contato
            </h2>
            <p className="mx-auto mt-4 max-w-md font-sans text-muted-foreground">
              Tire suas dúvidas, peça um orçamento ou saiba mais sobre o Wedding Memories.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-8 md:p-10">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block font-sans text-sm font-medium text-foreground">
                  Seu nome
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="Maria & João"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block font-sans text-sm font-medium text-foreground">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-1.5 block font-sans text-sm font-medium text-foreground">
                  Mensagem
                </label>
                <textarea
                  id="message"
                  required
                  rows={4}
                  placeholder="Como podemos ajudar?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {formSent && (
                <p className="rounded-xl bg-green-50 p-3 text-center font-sans text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  Mensagem preparada! O aplicativo de e-mail foi aberto.
                </p>
              )}

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 px-6 py-3.5 font-sans text-sm font-semibold text-primary-foreground shadow-[0_6px_20px_hsl(var(--primary)/0.2)] transition-all duration-300 hover:shadow-[0_10px_30px_hsl(var(--primary)/0.3)] hover:scale-[1.01]"
              >
                <Send className="h-4 w-4" />
                Enviar e-mail
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-sans text-xs text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 px-6 py-3.5 font-sans text-sm font-semibold text-[#25D366] transition-all duration-300 hover:bg-[#25D366]/10 hover:border-[#25D366]/50"
            >
              <MessageCircle className="h-5 w-5" />
              Chamar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-center font-sans text-xs text-muted-foreground">
            &copy; 2026 Wedding Memories. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
