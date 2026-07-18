/**
 * Nome: app/[accessCode]/[slug]/admin/texts/page.tsx
 * Função: Edição dos textos visuais da galeria (welcome + guest-name) com preview.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, RotateCcw, Eye } from "lucide-react"
import { useWedding } from "@/components/wedding-provider"

const TEXT_FIELDS = [
  {
    section: "Tela de Boas-vindas",
    fields: [
      { key: "welcome_message", label: "Mensagem principal", type: "textarea" as const, placeholder: "Criamos este espaço para reunir todas as memórias..." },
      { key: "welcome_cta_primary", label: "Botão principal", type: "input" as const, placeholder: "Compartilhar memórias" },
      { key: "welcome_cta_secondary", label: "Botão secundário", type: "input" as const, placeholder: "Ver galeria" },
    ],
  },
  {
    section: "Tela de Nome do Convidado",
    fields: [
      { key: "guest_title", label: "Título", type: "input" as const, placeholder: "Bem-vindo ao nosso álbum" },
      { key: "guest_description", label: "Descrição", type: "textarea" as const, placeholder: "Antes de continuar, nos diga seu nome..." },
      { key: "guest_button", label: "Botão", type: "input" as const, placeholder: "Entrar" },
      { key: "guest_note", label: "Nota inferior", type: "textarea" as const, placeholder: "Seu nome será lembrado neste dispositivo..." },
    ],
  },
]

const DEFAULTS: Record<string, string> = {
  welcome_message: "Criamos este espaço para reunir todas as memórias do nosso casamento. Se você está aqui, faz parte da nossa história. 📸",
  welcome_cta_primary: "Compartilhar memórias",
  welcome_cta_secondary: "Ver galeria",
  guest_title: "Bem-vindo ao nosso álbum",
  guest_description: "Antes de continuar, nos diga seu nome para identificarmos suas fotos com carinho.",
  guest_button: "Entrar",
  guest_note: "Seu nome será lembrado neste dispositivo para facilitar futuros envios.",
}

function WelcomePreview({ values, coupleNames }: { values: Record<string, string>; coupleNames: string }) {
  const [firstName, lastName] = coupleNames.split("&").map((n) => n.trim())
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="bg-primary/5 px-4 py-2 border-b border-border">
        <p className="font-sans text-xs font-semibold text-primary flex items-center gap-1.5">
          <Eye className="h-3 w-3" /> Welcome Screen
        </p>
      </div>
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <div className="flex w-24 items-center gap-2">
          <div className="flex-1 h-px bg-accent" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <div className="flex-1 h-px bg-accent" />
        </div>
        <div>
          <p className="font-sans text-sm font-bold text-foreground uppercase tracking-wider">{firstName}</p>
          <p className="font-sans text-xs text-muted-foreground">&amp;</p>
          <p className="font-sans text-sm font-bold text-foreground uppercase tracking-wider">{lastName}</p>
        </div>
        <div className="flex w-24 items-center gap-2">
          <div className="flex-1 h-px bg-accent" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <div className="flex-1 h-px bg-accent" />
        </div>
        <p className="max-w-[18rem] font-serif text-xs leading-relaxed text-muted-foreground">
          {values.welcome_message || DEFAULTS.welcome_message}
        </p>
        <div className="flex w-full max-w-[18rem] flex-col gap-1.5">
          <div className="w-full rounded-lg bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground">
            {values.welcome_cta_primary || DEFAULTS.welcome_cta_primary}
          </div>
          <div className="w-full rounded-lg border border-accent bg-card/40 px-3 py-2 text-center text-xs font-semibold text-foreground">
            {values.welcome_cta_secondary || DEFAULTS.welcome_cta_secondary}
          </div>
        </div>
      </div>
    </div>
  )
}

function GuestNamePreview({ values, coupleNames }: { values: Record<string, string>; coupleNames: string }) {
  const [firstName, lastName] = coupleNames.split("&").map((n) => n.trim())
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="bg-primary/5 px-4 py-2 border-b border-border">
        <p className="font-sans text-xs font-semibold text-primary flex items-center gap-1.5">
          <Eye className="h-3 w-3" /> Guest Name Screen
        </p>
      </div>
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <div className="flex w-24 items-center gap-2">
          <div className="flex-1 h-px bg-accent" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <div className="flex-1 h-px bg-accent" />
        </div>
        <div>
          <p className="font-sans text-sm font-bold text-foreground uppercase tracking-wider">{firstName}</p>
          <p className="font-sans text-xs text-muted-foreground">&amp;</p>
          <p className="font-sans text-sm font-bold text-foreground uppercase tracking-wider">{lastName}</p>
        </div>
        <div className="flex w-24 items-center gap-2">
          <div className="flex-1 h-px bg-accent" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <div className="flex-1 h-px bg-accent" />
        </div>
        <p className="font-serif text-sm font-bold text-foreground">
          {values.guest_title || DEFAULTS.guest_title}
        </p>
        <p className="max-w-[16rem] font-sans text-xs leading-relaxed text-muted-foreground">
          {values.guest_description || DEFAULTS.guest_description}
        </p>
        <div className="w-full max-w-[16rem]">
          <div className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-xs text-muted-foreground">
            Seu nome completo
          </div>
          <div className="mt-1.5 w-full rounded-lg bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground">
            {values.guest_button || DEFAULTS.guest_button}
          </div>
        </div>
        <p className="max-w-[16rem] font-sans text-[0.65rem] leading-relaxed text-muted-foreground">
          {values.guest_note || DEFAULTS.guest_note}
        </p>
      </div>
    </div>
  )
}

export default function TextsPage() {
  const { accessCode, slug, coupleNames } = useWedding()
  const apiBase = `/api/${accessCode}/${slug}`

  const [values, setValues] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [activePreview, setActivePreview] = useState<"welcome" | "guest">("welcome")

  const loadTexts = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/admin/texts`)
      const data = await res.json()
      setValues(data.texts ?? {})
    } catch { /* ignore */ }
    setIsLoading(false)
  }, [apiBase])

  useEffect(() => { loadTexts() }, [loadTexts])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`${apiBase}/admin/texts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: values }),
      })
      if (!res.ok) throw new Error("Falha ao salvar")
      setMessage({ type: "success", text: "Textos salvos!" })
      setTimeout(() => setMessage(null), 3000)
    } catch {
      setMessage({ type: "error", text: "Erro ao salvar textos" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setValues({})
  }

  const updateField = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const getDisplayValue = (key: string) => values[key] || ""

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-sans">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl font-bold text-foreground">Textos</h1>
          <p className="mt-1 font-sans text-sm text-muted-foreground">Edite os textos que os convidados veem</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-sans text-sm text-muted-foreground hover:bg-muted transition-colors"
          title="Restaurar padrão"
        >
          <RotateCcw className="h-4 w-4" /> Padrão
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Editores */}
        <div className="space-y-6">
          {TEXT_FIELDS.map((section) => (
            <div key={section.section} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-sans text-lg font-bold text-foreground">{section.section}</h2>
              </div>

              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="font-sans text-sm font-medium text-foreground">
                      {field.label}
                    </label>
                    <p className="font-sans text-xs text-muted-foreground">
                      Padrão: &ldquo;{DEFAULTS[field.key]}&rdquo;
                    </p>
                    {field.type === "textarea" ? (
                      <textarea
                        value={getDisplayValue(field.key)}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={getDisplayValue(field.key)}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="flex rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setActivePreview("welcome")}
              className={`flex-1 px-3 py-2 font-sans text-xs font-semibold transition-colors ${
                activePreview === "welcome" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Welcome
            </button>
            <button
              onClick={() => setActivePreview("guest")}
              className={`flex-1 px-3 py-2 font-sans text-xs font-semibold transition-colors ${
                activePreview === "guest" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Guest Name
            </button>
          </div>

          {activePreview === "welcome" ? (
            <WelcomePreview values={values} coupleNames={coupleNames} />
          ) : (
            <GuestNamePreview values={values} coupleNames={coupleNames} />
          )}
        </div>
      </div>

      {message && (
        <p className={`mt-4 font-sans text-sm ${message.type === "success" ? "text-green-500" : "text-red-500"}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-sans text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isSaving ? "Salvando..." : "Salvar Textos"}
      </button>
    </div>
  )
}
