/**
 * Nome: app/admin/gallery/page.tsx
 * Função: Gerenciamento da galeria — link automático, QR Code, expiração (1 ano), botões de ação.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { QRCodeCanvas } from "qrcode.react"
import { Copy, Check, ExternalLink, Download, MessageCircle, Calendar, Loader2 } from "lucide-react"

export default function GalleryPage() {
  const [siteUrl, setSiteUrl] = useState("")
  const [createdAt, setCreatedAt] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/site-url").then((r) => r.json()),
      fetch("/api/admin/config").then((r) => r.json()),
    ])
      .then(([siteData, configData]) => {
        setSiteUrl(siteData.url ?? "")
        setCreatedAt(configData.config?.gallery_created_at ?? "")
        setWhatsappNumber(configData.config?.whatsapp_number ?? "")
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const handleCopy = async () => {
    if (!siteUrl) return
    await navigator.clipboard.writeText(siteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQR = () => {
    if (!qrRef.current) return
    const canvas = qrRef.current.querySelector("canvas")
    if (!canvas) return

    const link = document.createElement("a")
    link.download = "qrcode-galeria.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const handleDownloadAll = async () => {
    setDownloading(true)
    try {
      const response = await fetch("/api/download-all")
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        alert(err.error || "Erro ao baixar mídias")
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "midias-galeria.zip"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Erro de rede ao baixar mídias")
    } finally {
      setDownloading(false)
    }
  }

  const expirationInfo = (() => {
    if (!createdAt) return null
    const created = new Date(createdAt)
    if (isNaN(created.getTime())) return null

    const expiration = new Date(created)
    expiration.setFullYear(expiration.getFullYear() + 1)

    const now = new Date()
    const daysRemaining = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const formattedCreated = created.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    const formattedExpiration = expiration.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })

    return { formattedCreated, formattedExpiration, daysRemaining }
  })()

  const whatsappLinks = whatsappNumber ? [
    { label: "Solicitar mais armazenamento", message: "Olá! Gostaria de contratar mais armazenamento para a galeria de fotos do casamento." },
    { label: "Renovar por 6 meses", message: "Olá! Gostaria de renovar a galeria de fotos do casamento por mais 6 meses." },
    { label: "Renovar por 1 ano", message: "Olá! Gostaria de renovar a galeria de fotos do casamento por mais 1 ano." },
  ] : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-sans">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-foreground">Galeria</h1>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Link, QR Code e expiração da galeria
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna Esquerda */}
        <div className="space-y-6">
          {/* Link da Galeria — automático */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-foreground mb-4">
              Link da Galeria
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <span className="flex-1 truncate font-sans text-sm text-foreground">
                  {siteUrl || "Carregando..."}
                </span>
                <button
                  onClick={handleCopy}
                  disabled={!siteUrl}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-background transition-colors disabled:opacity-50"
                  title="Copiar link"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
              <div className="flex gap-2">
                {siteUrl && (
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir galeria
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Expiração — automática (1 ano a partir da criação) */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-foreground mb-4">
              Expiração da Galeria
            </h2>
            {expirationInfo ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-sans text-sm text-foreground">
                      {expirationInfo.formattedExpiration}
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      Criada em {expirationInfo.formattedCreated} (1 ano de validade)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${expirationInfo.daysRemaining > 30 ? "bg-green-500" : expirationInfo.daysRemaining > 0 ? "bg-amber-500" : "bg-red-500"}`} />
                  <span className="font-sans text-sm text-muted-foreground">
                    {expirationInfo.daysRemaining > 0
                      ? `${expirationInfo.daysRemaining} dias restantes`
                      : "Galeria expirada"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="font-sans text-sm text-muted-foreground italic">
                Data de criação não encontrada.
              </p>
            )}
            </div>

          {/* Baixar todas as mídias */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-foreground mb-4">
              Download
            </h2>
            <p className="font-sans text-sm text-muted-foreground mb-4">
              Baixe todas as fotos e vídeos enviados para a galeria em um arquivo ZIP.
            </p>
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 font-sans text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading ? "Preparando download..." : "Baixar todas as mídias"}
            </button>
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
          {/* QR Code */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-foreground mb-4">
              QR Code
            </h2>
            <div className="flex flex-col items-center gap-4">
              <div ref={qrRef} className="rounded-xl bg-white p-4">
                <QRCodeCanvas
                  value={siteUrl || "https://example.com"}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <button
                onClick={handleDownloadQR}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Download className="h-4 w-4" />
                Baixar QR Code
              </button>
            </div>
          </div>

          {/* Botões de Ação WhatsApp */}
          {whatsappLinks.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-lg font-bold text-foreground mb-4">
                Ações
              </h2>
              <div className="flex flex-col gap-3">
                {whatsappLinks.map((link) => (
                  <a
                    key={link.label}
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(link.message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 font-sans text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
