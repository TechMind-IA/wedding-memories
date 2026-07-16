/**
 * Nome: app/[accessCode]/[slug]/admin/gallery/page.tsx
 * Função: Gerenciamento da galeria — link, QR Code, download.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { QRCodeCanvas } from "qrcode.react"
import { Copy, Check, ExternalLink, Download, Loader2 } from "lucide-react"
import { useWedding } from "@/components/wedding-provider"

export default function GalleryPage() {
  const { accessCode, slug, coupleNames } = useWedding()
  const [siteUrl, setSiteUrl] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/site-url").then((r) => r.json()).then((d) => setSiteUrl(d.url ?? "")).catch(() => {})
  }, [])

  const fullUrl = `${siteUrl}/${accessCode}/${slug}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas")
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `qrcode-${slug}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const handleDownloadAll = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/${accessCode}/${slug}/download-all`)
      if (!response.ok) { alert("Erro ao baixar"); return }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = "midias-galeria.zip"; a.click()
      URL.revokeObjectURL(url)
    } catch { alert("Erro de rede") } finally { setDownloading(false) }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-foreground">Galeria</h1>
        <p className="mt-1 font-sans text-sm text-muted-foreground">Link, QR Code e download da galeria</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Link da Galeria */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-foreground mb-4">Link da Galeria</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <span className="flex-1 truncate font-sans text-sm text-foreground">{fullUrl || "Carregando..."}</span>
                <button onClick={handleCopy} disabled={!fullUrl} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-background transition-colors disabled:opacity-50">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
              <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <ExternalLink className="h-4 w-4" /> Abrir galeria
              </a>
            </div>
          </div>

          {/* Download */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-foreground mb-4">Download</h2>
            <p className="font-sans text-sm text-muted-foreground mb-4">Baixe todas as fotos e vídeos em um ZIP.</p>
            <button onClick={handleDownloadAll} disabled={downloading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 font-sans text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? "Preparando..." : "Baixar todas as mídias"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-foreground mb-4">QR Code</h2>
            <div className="flex flex-col items-center gap-4">
              <div ref={qrRef} className="rounded-xl bg-white p-4">
                <QRCodeCanvas value={fullUrl || "https://example.com"} size={180} bgColor="#ffffff" fgColor="#1a1a1a" level="M" />
              </div>
              <button onClick={handleDownloadQR} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <Download className="h-4 w-4" /> Baixar QR Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
