/**
 * Nome: app/[accessCode]/[slug]/admin/customize/page.tsx
 * Função: Personalização visual do casamento — cor, fonte, background.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { Palette, Check } from "lucide-react"
import { useWedding } from "@/components/wedding-provider"
import { generateThemePalette, validateHex } from "@/lib/color-utils"

const FONTS = [
  { key: "montserrat", label: "DM Sans", desc: "Moderno, limpo" },
  { key: "playfair", label: "Playfair Display", desc: "Elegante, serif" },
  { key: "poppins", label: "Poppins", desc: "Clean, sans-serif" },
  { key: "lora", label: "Lora", desc: "Romântico, serif" },
] as const

const BACKGROUNDS = [
  { key: "floral", label: "Floral", desc: "PNG decorativo" },
  { key: "minimalist", label: "Minimalist", desc: "Gradiente sutil" },
  { key: "botanical", label: "Botanical", desc: "Padrão de folhas" },
  { key: "rustic", label: "Rustic", desc: "Textura envelhecida" },
] as const

export default function CustomizePage() {
  const { accessCode, slug } = useWedding()
  const apiBase = `/api/${accessCode}/${slug}`

  const [themeColor, setThemeColor] = useState("#C2754F")
  const [fontFamily, setFontFamily] = useState("montserrat")
  const [backgroundType, setBackgroundType] = useState("floral")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/admin/config`)
      const data = await res.json()
      if (data.config) {
        if (data.config.font_family) setFontFamily(data.config.font_family)
        if (data.config.background_type) setBackgroundType(data.config.background_type)
      }
    } catch { /* ignore */ }
    try {
      const res = await fetch(`${apiBase}/site-info`)
      const data = await res.json()
      if (data.themeColor) setThemeColor(data.themeColor)
    } catch { /* ignore */ }
    setIsLoading(false)
  }, [apiBase])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const validatedColor = validateHex(themeColor)

      const themeRes = await fetch(`${apiBase}/admin/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeColor: validatedColor }),
      })
      if (!themeRes.ok) throw new Error("Falha ao salvar cor")

      const configRes = await fetch(`${apiBase}/admin/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "font_family", value: fontFamily }),
      })
      if (!configRes.ok) throw new Error("Falha ao salvar fonte")

      const bgRes = await fetch(`${apiBase}/admin/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "background_type", value: backgroundType }),
      })
      if (!bgRes.ok) throw new Error("Falha ao salvar background")

      setMessage({ type: "success", text: "Personalização salva! Recarregue para ver as mudanças." })
      setTimeout(() => setMessage(null), 4000)
    } catch {
      setMessage({ type: "error", text: "Erro ao salvar personalização" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-sans">Carregando...</p>
      </div>
    )
  }

  const palette = generateThemePalette(themeColor)

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-foreground">Personalização</h1>
        <p className="mt-1 font-sans text-sm text-muted-foreground">Customize a aparência da galeria</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configurações */}
        <div className="space-y-6">
          {/* Cor do Tema */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-sans text-lg font-bold text-foreground">Cor do Tema</h2>
                <p className="font-sans text-xs text-muted-foreground">Cor principal da galeria</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="h-12 w-12 rounded-lg border border-border cursor-pointer"
              />
              <input
                type="text"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Fonte */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-sans text-lg font-bold text-foreground mb-4">Fonte</h2>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((font) => (
                <button
                  key={font.key}
                  onClick={() => setFontFamily(font.key)}
                  className={`relative flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                    fontFamily === font.key
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {fontFamily === font.key && (
                    <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                  )}
                  <span className="font-sans text-sm font-semibold text-foreground">{font.label}</span>
                  <span className="font-sans text-xs text-muted-foreground">{font.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-sans text-lg font-bold text-foreground mb-4">Background</h2>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.key}
                  onClick={() => setBackgroundType(bg.key)}
                  className={`relative flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                    backgroundType === bg.key
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {backgroundType === bg.key && (
                    <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                  )}
                  <span className="font-sans text-sm font-semibold text-foreground">{bg.label}</span>
                  <span className="font-sans text-xs text-muted-foreground">{bg.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {message && (
            <p className={`font-sans text-sm ${message.type === "success" ? "text-green-500" : "text-red-500"}`}>
              {message.text}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-lg bg-primary px-4 py-3 font-sans text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? "Salvando..." : "Salvar Personalização"}
          </button>
        </div>

        {/* Preview ao vivo */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-sans text-lg font-bold text-foreground mb-4">Preview</h2>
          <div
            className={`rounded-xl overflow-hidden shadow-lg wedding-bg wedding-bg-${backgroundType}`}
            style={{
              color: `hsl(${palette.foreground})`,
              fontFamily: fontFamily === "playfair" ? "var(--font-playfair)" :
                          fontFamily === "poppins" ? "var(--font-poppins)" :
                          fontFamily === "lora" ? "var(--font-lora)" :
                          "var(--font-dm-sans)",
            }}
          >
            {/* Mini header */}
            <div className="px-4 py-3 border-b" style={{ borderColor: `hsl(${palette.border})` }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${palette.primary})` }} />
                <span className="text-xs font-semibold" style={{ color: `hsl(${palette.primary})` }}>
                  Preview do Tema
                </span>
              </div>
            </div>

            {/* Mini content */}
            <div className="p-4 space-y-3">
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: `hsl(${palette.primary})` }}>
                  Ana & Pedro
                </p>
                <p className="text-xs" style={{ color: `hsl(${palette.mutedForeground})` }}>10.10.26</p>
              </div>

              <div className="flex gap-2">
                <div className="h-px flex-1 my-auto" style={{ backgroundColor: `hsl(${palette.accent})` }} />
                <div className="w-1.5 h-1.5 rounded-full my-auto" style={{ backgroundColor: `hsl(${palette.primary})` }} />
                <div className="h-px flex-1 my-auto" style={{ backgroundColor: `hsl(${palette.accent})` }} />
              </div>

              <p className="text-center text-xs" style={{ color: `hsl(${palette.mutedForeground})` }}>
                Criamos este espaço para reunir todas as memórias...
              </p>

              <div className="flex gap-2">
                <div className="flex-1 rounded-lg py-2 text-center text-xs font-semibold text-white" style={{ backgroundColor: `hsl(${palette.primary})` }}>
                  Compartilhar
                </div>
                <div className="flex-1 rounded-lg py-2 text-center text-xs font-semibold border" style={{ borderColor: `hsl(${palette.accent})`, color: `hsl(${palette.foreground})` }}>
                  Ver galeria
                </div>
              </div>

              <div className="flex gap-1.5">
                {[palette.chart1, palette.chart2, palette.chart3, palette.chart4, palette.chart5].map((c, i) => (
                  <div key={i} className="h-2 flex-1 rounded-full" style={{ backgroundColor: `hsl(${c})` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
